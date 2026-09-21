import assert from "node:assert/strict";
import test from "node:test";
import { createRecipeMcpTools } from "../src/mcp/tools";
import type { RateLimiter } from "../src/lib/api/rate-limit";

const recipe = {
  title: "Owner Pasta",
  tags: ["dinner"],
  dietaryFlags: [] as string[],
  ingredients: [{ displayOrder: 1, quantity: 1, unit: "box", ingredientName: "pasta" }],
  steps: [{ stepOrder: 1, instruction: "Cook." }],
};

function resultText(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

function setup(ownerId = "owner-a", limiter?: RateLimiter) {
  const rows = new Map<
    string,
    typeof recipe & {
      id: string;
      ownerId: string;
      notes?: string;
      summary?: string;
      prepTimeMinutes?: number;
      cookTimeMinutes?: number;
      totalTimeMinutes?: number;
      servings?: number;
      sourceUrl?: string;
      createdAt?: string;
      updatedAt?: string;
    }
  >();
  const audit: unknown[] = [];
  const service = {
    async listPage() {
      return {
        items: [...rows.values()].filter((row) => row.ownerId === ownerId),
        total: rows.size,
      };
    },
    async get(recipeId: string) {
      const found = rows.get(recipeId);
      return found?.ownerId === ownerId ? found : null;
    },
    async create(input: typeof recipe, metadata: unknown) {
      const created = { ...input, id: `recipe-${rows.size + 1}`, ownerId };
      rows.set(created.id, created);
      audit.push({ id: ownerId, metadata });
      return created;
    },
  };
  return {
    tools: createRecipeMcpTools({
      userId: ownerId,
      service: service as never,
      requestId: "request-1",
      limiter,
    }),
    rows,
    audit,
  };
}

test("MCP search returns concise cards for the authenticated owner only", async () => {
  const { tools, rows } = setup();
  rows.set("mine", { ...recipe, id: "mine", ownerId: "owner-a", notes: "private" });
  rows.set("other", { ...recipe, id: "other", ownerId: "owner-b", notes: "not visible" });
  const body = resultText(await tools.search_recipes({}));
  assert.deepEqual(body.recipes, [{ id: "mine", title: "Owner Pasta", tags: ["dinner"] }]);
});

test("MCP get does not enumerate another owner's recipe", async () => {
  const { tools, rows } = setup();
  rows.set("00000000-0000-4000-8000-000000000002", {
    ...recipe,
    id: "00000000-0000-4000-8000-000000000002",
    ownerId: "owner-b",
  });
  const body = resultText(
    await tools.get_recipe({ recipeId: "00000000-0000-4000-8000-000000000002" }),
  );
  assert.deepEqual(body, { error: "Recipe not found." });
  assert.equal("structuredContent" in body, false);
});

test("MCP get keeps its JSON fallback and returns a display-only recipe projection", async () => {
  const { tools, rows } = setup();
  const recipeId = "00000000-0000-4000-8000-000000000003";
  rows.set(recipeId, {
    ...recipe,
    id: recipeId,
    ownerId: "owner-a",
    summary: "Fast and savory.",
    prepTimeMinutes: 5,
    cookTimeMinutes: 10,
    totalTimeMinutes: 15,
    servings: 2,
    dietaryFlags: ["high-protein"],
    notes: "Use a hot pan.\nRest before serving.",
    sourceUrl: "https://example.test/burger",
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-02T12:00:00.000Z",
  });

  const result = await tools.get_recipe({ recipeId });
  const fallback = resultText(result);
  const structuredContent = (result as { structuredContent?: Record<string, unknown> })
    .structuredContent;

  assert.deepEqual(fallback, { recipe: rows.get(recipeId) });
  assert.deepEqual(structuredContent, {
    recipe: {
      title: "Owner Pasta",
      summary: "Fast and savory.",
      prepTimeMinutes: 5,
      cookTimeMinutes: 10,
      totalTimeMinutes: 15,
      servings: 2,
      tags: ["dinner"],
      dietaryFlags: ["high-protein"],
      ingredients: [{ quantity: 1, unit: "box", ingredientName: "pasta" }],
      steps: [{ instruction: "Cook." }],
      notes: "Use a hot pan.\nRest before serving.",
      sourceUrl: "https://example.test/burger",
    },
  });
  assert.equal(JSON.stringify(structuredContent).includes("ownerId"), false);
  assert.equal(JSON.stringify(structuredContent).includes("createdAt"), false);
  assert.equal(JSON.stringify(structuredContent).includes("updatedAt"), false);
});

test("MCP rejects malformed recipe IDs without querying or exposing recipe existence", async () => {
  const { tools, rows } = setup();
  rows.set("00000000-0000-4000-8000-000000000002", {
    ...recipe,
    id: "00000000-0000-4000-8000-000000000002",
    ownerId: "owner-a",
  });
  const result = await tools.get_recipe({ recipeId: "not-a-uuid" });
  assert.equal(result.isError, true);
  assert.deepEqual(resultText(result), { error: "Recipe not found." });
  assert.equal("structuredContent" in result, false);
  assert.equal(rows.size, 1);
});

test("MCP save validates first, derives owner, and records a safe audit event", async () => {
  const { tools, rows, audit } = setup();
  const invalid = await tools.save_recipe({ ...recipe, ownerId: "attacker" });
  assert.equal(invalid.isError, true);
  assert.equal(rows.size, 0);
  const saved = resultText(await tools.save_recipe(recipe));
  assert.deepEqual(saved, { recipeId: "recipe-1", message: "Recipe saved." });
  assert.equal(rows.get("recipe-1")?.ownerId, "owner-a");
  assert.deepEqual(audit, [
    { id: "owner-a", metadata: { requestId: "request-1", method: "MCP save_recipe" } },
  ]);
});

test("MCP tool rate limits are deterministic", async () => {
  const limiter: RateLimiter = { check: () => ({ allowed: false, retryAfterSeconds: 1 }) };
  const { tools } = setup("owner-a", limiter);
  assert.equal((await tools.search_recipes({})).isError, true);
  const get = await tools.get_recipe({ recipeId: "00000000-0000-4000-8000-000000000003" });
  assert.equal(get.isError, true);
  assert.equal("structuredContent" in get, false);
  assert.equal((await tools.save_recipe(recipe)).isError, true);
});
