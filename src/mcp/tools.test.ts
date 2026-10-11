import assert from "node:assert/strict";
import test from "node:test";
import {
  createRecipeMcpTools,
  createTagMcpTools,
  mcpGetRecipeOutputSchema,
  mcpSearchRecipesOutputSchema,
  mcpToolSchemas,
} from "./tools";
import type { RateLimiter } from "../lib/api/rate-limit";

const id = "00000000-0000-4000-8000-000000000001";
const document = {
  id,
  title: "Garlic rice",
  description: "Cold rice fried with garlic.",
  time: { prepMinutes: 10, cookMinutes: 12, totalMinutes: 20 },
  ingredients: [
    { name: "cooked rice", amount: "6 cups", note: "cooled" },
    { name: "garlic", amount: "3 cloves", note: "minced" },
  ],
  equipment: [{ name: "wok" }],
  instructions: ["Heat the wok.", "Fry the garlic, then add rice."],
  notes: ["Work in batches."],
  tags: ["dinner", "rice"],
};
const snapshot = { recipe: document, revision: 3 };
function body(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}
function setup(limiter?: RateLimiter) {
  const calls: unknown[] = [];
  const service = {
    async listDocumentPage(args: unknown) {
      calls.push(args);
      return { items: [{ ...document, revision: 3 }], total: 1 };
    },
    async getDocument(recipeId: string) {
      calls.push({ recipeId });
      return recipeId === id ? snapshot : null;
    },
    async createDocument(content: unknown, audit: unknown) {
      calls.push({ content, audit });
      return {
        status: "saved",
        recipe: { ...document, id: "00000000-0000-4000-8000-000000000002" },
        revision: 1,
      };
    },
    async replaceDocument(recipe: { id: string }, revision: number, audit: unknown) {
      calls.push({ recipe, revision, audit });
      return recipe.id === id ? { status: "conflict", revision: 4 } : { status: "not_found" };
    },
  };
  return {
    tools: createRecipeMcpTools({
      userId: "owner-a",
      service: service as never,
      requestId: "req-1",
      limiter,
    }),
    calls,
  };
}

test("document recipe search and get preserve optional yield and complete content", async () => {
  const { tools, calls } = setup();
  const searched = await tools.search_recipes({ query: "rice" });
  const expectedSummary = {
    recipes: [
      {
        id,
        title: document.title,
        description: document.description,
        time: document.time,
        tags: document.tags,
        revision: 3,
      },
    ],
  };
  assert.deepEqual(body(searched), expectedSummary);
  assert.deepEqual(
    mcpSearchRecipesOutputSchema.parse(
      (searched as never as { structuredContent: unknown }).structuredContent,
    ),
    expectedSummary,
  );
  await tools.search_recipes({ tags: ["Foo  Bar", "VEGAN-"] });
  assert.deepEqual(calls[1], {
    search: undefined,
    tags: ["foo bar", "vegan-"],
    page: 1,
    pageSize: 20,
  });
  const got = await tools.get_recipe({ recipeId: id });
  assert.deepEqual(body(got), { recipe: document, revision: 3 });
  assert.deepEqual(
    mcpGetRecipeOutputSchema.parse(
      (got as never as { structuredContent: unknown }).structuredContent,
    ),
    { recipe: document, revision: 3 },
  );
  assert.equal("yield" in document, false);
  assert.deepEqual(
    body(await tools.get_recipe({ recipeId: "00000000-0000-4000-8000-000000000099" })),
    { error: "Recipe not found." },
  );
});

test("save accepts a complete document without yield and derives ownership", async () => {
  const { tools, calls } = setup();
  const result = await tools.save_recipe({ ...document, id: undefined, ownerId: "attacker" });
  assert.equal(result.isError, true);
  const content = { ...document } as Record<string, unknown>;
  delete content.id;
  const saved = await tools.save_recipe({ ...content, tags: ["  VEGAN  ", "foo  bar"] });
  assert.deepEqual(body(saved), {
    recipeId: "00000000-0000-4000-8000-000000000002",
    revision: 1,
    message: "Recipe saved.",
  });
  assert.equal((calls[0] as { content: Record<string, unknown> }).content.id, undefined);
  assert.equal("ownerId" in (calls[0] as { content: object }).content, false);
  assert.deepEqual((calls[0] as { content: Record<string, unknown> }).content.tags, [
    "vegan",
    "foo bar",
  ]);
});

test("replace reports a stale revision without losing the current revision", async () => {
  const { tools } = setup();
  const result = await tools.replace_recipe({ recipe: document, expectedRevision: 2 });
  assert.equal(result.isError, true);
  assert.deepEqual(body(result), { error: "Recipe changed since it was read.", revision: 4 });
  const otherOwner = await tools.replace_recipe({
    recipe: { ...document, id: "00000000-0000-4000-8000-000000000099" },
    expectedRevision: 2,
  });
  assert.equal(otherOwner.isError, true);
  assert.deepEqual(body(otherOwner), { error: "Recipe not found or invalid." });
});

test("recipe document methods use read and write rate limits", async () => {
  const limiter: RateLimiter = { check: () => ({ allowed: false, retryAfterSeconds: 1 }) };
  const { tools } = setup(limiter);
  assert.equal((await tools.search_recipes({})).isError, true);
  assert.equal((await tools.get_recipe({ recipeId: id })).isError, true);
  assert.equal((await tools.save_recipe({ ...document, id: undefined })).isError, true);
  assert.equal(
    (await tools.replace_recipe({ recipe: document, expectedRevision: 3 })).isError,
    true,
  );
});

test("tag list is name/count only and uses owner-bound name cursors", async () => {
  const calls: unknown[] = [];
  const service = {
    async listFromRecipes(args: unknown) {
      calls.push(args);
      return { tags: [{ name: "dinner", usageCount: 2 }], hasMore: true };
    },
  };
  const tools = createTagMcpTools({ userId: "owner-a", service: service as never });
  const first = body(await tools.list_tags({ sort: "name_asc", limit: 1 }));
  assert.deepEqual(first.tags, [{ name: "dinner", usageCount: 2 }]);
  assert.equal("id" in first.tags[0], false);
  assert.ok(first.nextCursor);
  await tools.list_tags({ sort: "name_asc", limit: 1, cursor: first.nextCursor });
  assert.deepEqual(calls[1], {
    search: undefined,
    sort: "name_asc",
    limit: 1,
    after: { name: "dinner" },
  });
  assert.equal((await tools.list_tags({ usage: "unused" })).isError, true);
});

test("tag replacement is by names, collapses into target, and refuses missing or identical sources", async () => {
  const calls: unknown[] = [];
  const service = {
    async replaceNameInRecipes(args: { sourceName: string; targetName: string }) {
      calls.push(args);
      if (args.sourceName === args.targetName) throw new Error("Names match");
      return { status: "replaced", changedRecipes: 2 };
    },
  };
  const tools = createTagMcpTools({ userId: "owner-a", service: service as never });
  const result = body(
    await tools.replace_tag_name({ sourceName: "weeknight", targetName: "dinner" }),
  );
  assert.deepEqual(result, {
    replaced: true,
    sourceName: "weeknight",
    targetName: "dinner",
    changedRecipes: 2,
  });
  assert.deepEqual(calls[0], { sourceName: "weeknight", targetName: "dinner" });
  const normalized = body(
    await tools.replace_tag_name({ sourceName: "  WEEK  NIGHT  ", targetName: "VEGAN-" }),
  );
  assert.deepEqual(normalized, {
    replaced: true,
    sourceName: "week night",
    targetName: "vegan-",
    changedRecipes: 2,
  });
  assert.deepEqual(calls[1], { sourceName: "week night", targetName: "vegan-" });
  assert.equal(
    (await tools.replace_tag_name({ sourceName: "Dinner", targetName: "dinner" })).isError,
    true,
  );
});

test("MCP tag schemas accept canonical edge names supported by the shared tag contract", () => {
  const content = {
    title: "Soup",
    description: "",
    time: {},
    ingredients: [{ name: "water" }],
    equipment: [],
    instructions: ["Boil."],
    notes: [],
    tags: ["vegan-", "foo--bar"],
  };
  assert.equal(mcpToolSchemas.recipe.safeParse(content).success, true);
  const recipe = { id, ...content };
  assert.equal(mcpGetRecipeOutputSchema.safeParse({ recipe, revision: 1 }).success, true);
  assert.equal(
    mcpToolSchemas.replaceTagName.safeParse({ sourceName: "vegan-", targetName: "foo--bar" })
      .success,
    true,
  );
  assert.equal(
    mcpToolSchemas.replaceTagName.safeParse({ sourceName: "  Vegan  ", targetName: "Foo  Bar" })
      .success,
    true,
  );
  assert.equal(
    mcpToolSchemas.replaceTagName.safeParse({ sourceName: "\tVegan\n", targetName: "Foo Bar" })
      .success,
    true,
  );
  assert.equal(
    mcpToolSchemas.replaceTagName.safeParse({ sourceName: "Foo\tBar", targetName: "vegan" })
      .success,
    false,
  );
  assert.equal(mcpToolSchemas.recipe.safeParse({ ...content, tags: ["-invalid"] }).success, false);
  assert.equal(mcpToolSchemas.recipe.safeParse({ ...content, tags: ["!invalid"] }).success, false);
});
