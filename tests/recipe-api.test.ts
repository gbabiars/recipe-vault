import assert from "node:assert/strict";
import test from "node:test";
import { createRecipeApi } from "../src/lib/api/recipe-handlers";
import { RecipeService } from "../src/lib/recipes/recipe-service";
import type { RateLimiter } from "../src/lib/api/rate-limit";

const input = {
  title: "Pasta",
  tags: ["Dinner"],
  dietaryFlags: [] as string[],
  ingredients: [{ displayOrder: 1, quantity: 1, unit: "box", ingredientName: "pasta" }],
  steps: [{ stepOrder: 1, instruction: "Cook." }],
};
type Stored = typeof input & { id: string; ownerId: string; createdAt: string; updatedAt: string };

function setup(user: string | null = "owner-a", limiter?: RateLimiter) {
  const recipes = new Map<string, Stored>();
  const audits: unknown[] = [];
  const repository = {
    async listPage(
      ownerId: string,
      search: string | undefined,
      tags: string[],
      flags: string[],
      offset: number,
      limit: number,
    ) {
      const rows = [...recipes.values()].filter(
        (r) =>
          r.ownerId === ownerId &&
          (!search || r.title.toLowerCase().includes(search.toLowerCase())) &&
          tags.every((tag) => r.tags.includes(tag)) &&
          flags.every((flag) => r.dietaryFlags.includes(flag)),
      );
      return {
        items: rows
          .slice(offset, offset + limit)
          .map((recipe) => ({
            id: recipe.id,
            ownerId: recipe.ownerId,
            title: recipe.title,
            tags: recipe.tags,
            dietaryFlags: recipe.dietaryFlags,
            createdAt: recipe.createdAt,
            updatedAt: recipe.updatedAt,
          })),
        total: rows.length,
      };
    },
    async get(ownerId: string, id: string) {
      const recipe = recipes.get(id);
      return recipe?.ownerId === ownerId ? recipe : null;
    },
    async create(ownerId: string, value: typeof input) {
      const recipe: Stored = {
        ...value,
        tags: value.tags.map((tag) => tag.toLowerCase()),
        id: `recipe-${recipes.size + 1}`,
        ownerId,
        createdAt: "now",
        updatedAt: "now",
      };
      recipes.set(recipe.id, recipe);
      return recipe;
    },
    async update(ownerId: string, id: string, value: typeof input) {
      const current = recipes.get(id);
      if (!current || current.ownerId !== ownerId) return null;
      const recipe = { ...current, ...value, updatedAt: "later" };
      recipes.set(id, recipe);
      return recipe;
    },
    async remove(ownerId: string, id: string) {
      const recipe = recipes.get(id);
      if (recipe?.ownerId === ownerId) recipes.delete(id);
    },
    async recordAudit(ownerId: string, recipeId: string, eventType: string, metadata: unknown) {
      audits.push({ ownerId, recipeId, eventType, metadata });
    },
  };
  const api = createRecipeApi({
    getUser: async () => (user ? { id: user } : null),
    getService: async () => new RecipeService(repository as never),
    limiter,
  });
  return { api, recipes, audits };
}
const req = (url: string, init?: RequestInit) => new Request(url, init);

test("API returns 401 without a server-authenticated user", async () => {
  const { api } = setup(null);
  assert.equal((await api.list(req("http://test/api/v1/recipes")))!.status, 401);
});
test("API lists only the authenticated owner's recipes and supports filters", async () => {
  const { api, recipes } = setup();
  recipes.set("mine", {
    ...input,
    tags: ["dinner"],
    id: "mine",
    ownerId: "owner-a",
    createdAt: "now",
    updatedAt: "now",
  });
  recipes.set("other", {
    ...input,
    title: "Other",
    tags: ["dinner"],
    id: "other",
    ownerId: "owner-b",
    createdAt: "now",
    updatedAt: "now",
  });
  const response = (await api.list(
    req("http://test/api/v1/recipes?tag=dinner&page=1&pageSize=10"),
  ))!;
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(
    body.data.map((item: { id: string }) => item.id),
    ["mine"],
  );
});
test("API does not enumerate another owner's get, update, or delete", async () => {
  const { api, recipes } = setup();
  recipes.set("other", {
    ...input,
    id: "other",
    ownerId: "owner-b",
    createdAt: "now",
    updatedAt: "now",
  });
  assert.equal((await api.get(req("http://test/api/v1/recipes/other"), "other"))!.status, 404);
  assert.equal(
    (await api.update(
      req("http://test/api/v1/recipes/other", {
        method: "PATCH",
        body: JSON.stringify({ title: "No" }),
      }),
      "other",
    ))!.status,
    404,
  );
  assert.equal(
    (await api.remove(req("http://test/api/v1/recipes/other", { method: "DELETE" }), "other"))!
      .status,
    404,
  );
});
test("API rejects invalid and ownership-bearing recipe bodies", async () => {
  const { api } = setup();
  assert.equal(
    (await api.create(
      req("http://test/api/v1/recipes", {
        method: "POST",
        body: JSON.stringify({ ...input, ownerId: "attacker" }),
      }),
    ))!.status,
    422,
  );
  assert.equal(
    (await api.update(
      req("http://test/api/v1/recipes/none", { method: "PATCH", body: JSON.stringify({}) }),
      "none",
    ))!.status,
    422,
  );
});
test("API creates, partially updates, deletes, and audits successful writes", async () => {
  const { api, recipes, audits } = setup();
  const created = (await api.create(
    req("http://test/api/v1/recipes", { method: "POST", body: JSON.stringify(input) }),
  ))!;
  const recipe = (await created.json()).data as { id: string };
  assert.equal(created.status, 201);
  assert.equal(
    (await api.update(
      req(`http://test/api/v1/recipes/${recipe.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Updated" }),
      }),
      recipe.id,
    ))!.status,
    200,
  );
  assert.equal(recipes.get(recipe.id)?.title, "Updated");
  assert.equal(
    (await api.remove(
      req(`http://test/api/v1/recipes/${recipe.id}`, { method: "DELETE" }),
      recipe.id,
    ))!.status,
    204,
  );
  assert.equal(recipes.has(recipe.id), false);
  assert.deepEqual(
    (audits as Array<{ eventType: string }>).map((event) => event.eventType),
    ["recipe.created", "recipe.updated", "recipe.deleted"],
  );
});
test("API returns 429 when its rate-limit abstraction rejects a request", async () => {
  const limiter: RateLimiter = { check: () => ({ allowed: false, retryAfterSeconds: 12 }) };
  const { api } = setup("owner-a", limiter);
  const response = (await api.list(req("http://test/api/v1/recipes")))!;
  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "12");
});
