import assert from "node:assert/strict";
import test from "node:test";
import { createRecipeMcpTools, createTagMcpTools, mcpSearchRecipesOutputSchema } from "./tools";
import type { RateLimiter } from "../lib/api/rate-limit";

const recipe = {
  title: "Owner Pasta",
  tags: ["dinner"],
  ingredients: [{ displayOrder: 1, amount: "1 box", ingredientName: "pasta" }],
  steps: [{ stepOrder: 1, instruction: "Cook." }],
};

function resultText(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

function resultStructuredContent(result: unknown) {
  return (result as { structuredContent?: unknown }).structuredContent;
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
  const mineId = "00000000-0000-4000-8000-000000000301";
  rows.set(mineId, { ...recipe, id: mineId, ownerId: "owner-a", notes: "private" });
  rows.set("other", { ...recipe, id: "other", ownerId: "owner-b", notes: "not visible" });
  const result = await tools.search_recipes({});
  const expected = { recipes: [{ id: mineId, title: "Owner Pasta", tags: ["dinner"] }] };
  assert.deepEqual(resultText(result), expected);
  assert.deepEqual(resultStructuredContent(result), expected);
  assert.deepEqual(mcpSearchRecipesOutputSchema.parse(resultStructuredContent(result)), expected);
  assert.equal(JSON.stringify(resultStructuredContent(result)).includes("ownerId"), false);
  assert.equal(JSON.stringify(resultStructuredContent(result)).includes("notes"), false);
  assert.equal(JSON.stringify(resultStructuredContent(result)).includes("not visible"), false);
});

test("MCP search includes safe optional fields in text and structured content", async () => {
  const { tools, rows } = setup();
  const id = "00000000-0000-4000-8000-000000000302";
  rows.set(id, {
    ...recipe,
    id,
    ownerId: "owner-a",
    summary: "Fresh tomato and basil.",
    prepTimeMinutes: 10,
    cookTimeMinutes: 20,
    totalTimeMinutes: 30,
    servings: 4,
    notes: "Private kitchen note.",
    sourceUrl: "https://example.test/recipe",
    createdAt: "2026-10-01T12:00:00.000Z",
    updatedAt: "2026-10-02T12:00:00.000Z",
  });

  const result = await tools.search_recipes({ query: "tomato", limit: 10 });
  const expected = {
    recipes: [
      {
        id,
        title: "Owner Pasta",
        summary: "Fresh tomato and basil.",
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        totalTimeMinutes: 30,
        servings: 4,
        tags: ["dinner"],
      },
    ],
  };

  assert.deepEqual(resultText(result), expected);
  assert.deepEqual(resultStructuredContent(result), expected);
  assert.equal(JSON.stringify(resultStructuredContent(result)).includes("ownerId"), false);
  assert.equal(JSON.stringify(resultStructuredContent(result)).includes("createdAt"), false);
  assert.equal(JSON.stringify(resultStructuredContent(result)).includes("updatedAt"), false);
  assert.equal(
    JSON.stringify(resultStructuredContent(result)).includes("Private kitchen note"),
    false,
  );
  assert.equal(JSON.stringify(resultStructuredContent(result)).includes("example.test"), false);
});

test("MCP search returns empty structured content for the no-results view", async () => {
  const { tools } = setup();
  const result = await tools.search_recipes({ query: "no match" });

  assert.deepEqual(resultText(result), { recipes: [] });
  assert.deepEqual(resultStructuredContent(result), { recipes: [] });
});

test("MCP rejects retired dietary search and save inputs", async () => {
  const { tools } = setup();
  assert.equal((await tools.search_recipes({ dietaryFlags: ["vegan"] })).isError, true);
  assert.equal((await tools.save_recipe({ ...recipe, dietaryFlags: ["vegan"] })).isError, true);
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
      ingredients: [{ amount: "1 box", ingredientName: "pasta" }],
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
  const legacyIngredients = await tools.save_recipe({
    ...recipe,
    ingredients: [{ displayOrder: 1, quantity: 1, unit: "box", ingredientName: "pasta" }],
  });
  assert.equal(legacyIngredients.isError, true);
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

const firstTag = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "dinner",
  usageCount: 4,
};
const secondTag = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "lunch",
  usageCount: 0,
};

test("MCP list_tags defaults to the full alphabetic inventory and returns only tag fields", async () => {
  const calls: unknown[] = [];
  const describedTag = { ...firstTag, description: "Tags for relaxed weeknight meals." };
  const tools = createTagMcpTools({
    userId: "owner-a",
    service: {
      async list(options: unknown) {
        calls.push(options);
        return { tags: [describedTag], hasMore: false };
      },
    } as never,
  });

  assert.deepEqual(resultText(await tools.list_tags({})), { tags: [firstTag] });
  assert.deepEqual(calls, [
    {
      search: undefined,
      usage: "all",
      sort: "name_asc",
      limit: 50,
      after: undefined,
    },
  ]);
});

test("MCP list_tags supports literal-search options and live keyset pagination", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const describedFirstTag = { ...firstTag, description: "Tags for relaxed weeknight meals." };
  const tools = createTagMcpTools({
    userId: "owner-a",
    service: {
      async list(options: Record<string, unknown>) {
        calls.push(options);
        return options.after
          ? { tags: [secondTag], hasMore: false }
          : { tags: [describedFirstTag], hasMore: true };
      },
    } as never,
  });

  const firstPage = resultText(
    await tools.list_tags({
      search: "  %Dinner_ ",
      usage: "used",
      sort: "usage_desc",
      limit: 1,
    }),
  );
  assert.deepEqual(firstPage.tags, [firstTag]);
  assert.equal(typeof firstPage.nextCursor, "string");
  const cursor = firstPage.nextCursor as string;
  const payload = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  assert.equal(payload.version, 1);
  assert.match(payload.fingerprint, /^[a-f0-9]{64}$/u);
  assert.equal(JSON.stringify(payload).includes("owner-a"), false);
  assert.equal(payload.description, undefined);

  const secondPage = resultText(
    await tools.list_tags({
      search: "%Dinner_",
      usage: "used",
      sort: "usage_desc",
      limit: 1,
      cursor,
    }),
  );
  assert.deepEqual(secondPage, { tags: [secondTag] });
  assert.deepEqual(calls[0], {
    search: "%Dinner_",
    usage: "used",
    sort: "usage_desc",
    limit: 1,
    after: undefined,
  });
  assert.deepEqual(calls[1].after, firstTag);
});

test("MCP list_tags rejects malformed and cross-query cursors before querying", async () => {
  let callCount = 0;
  const tools = createTagMcpTools({
    userId: "owner-a",
    service: {
      async list() {
        callCount += 1;
        return { tags: [firstTag], hasMore: true };
      },
    } as never,
  });
  const firstPage = resultText(await tools.list_tags({ limit: 1 }));
  const cursor = firstPage.nextCursor as string;

  assert.deepEqual(resultText(await tools.list_tags({ limit: 1, search: "different", cursor })), {
    error: "Invalid tag cursor. Start a new tag listing.",
  });
  assert.deepEqual(resultText(await tools.list_tags({ limit: 101 })), {
    error: "Invalid tag list input.",
  });
  assert.deepEqual(resultText(await tools.list_tags({ ownerId: "owner-b" })), {
    error: "Invalid tag list input.",
  });
  assert.equal((await tools.list_tags({ cursor: "!" })).isError, true);
  assert.equal(callCount, 1);
});

test("MCP list_tags shares read rate limits and hides repository errors", async () => {
  const limiter: RateLimiter = {
    check: () => ({ allowed: false, retryAfterSeconds: 1 }),
  };
  const denied = createTagMcpTools({
    userId: "owner-a",
    limiter,
    service: {
      async list() {
        throw new Error("should not run");
      },
    } as never,
  });
  assert.equal((await denied.list_tags({})).isError, true);
  assert.deepEqual(resultText(await denied.list_tags({})), { error: "Rate limit exceeded." });

  const failed = createTagMcpTools({
    userId: "owner-a",
    service: {
      async list() {
        throw new Error("private database detail");
      },
    } as never,
  });
  const result = await failed.list_tags({});
  assert.equal(result.isError, true);
  assert.deepEqual(resultText(result), { error: "Unable to load tags." });
});

test("MCP delete_unused_tag deletes one ID and conceals used, missing, and unowned tags", async () => {
  const calls: string[] = [];
  const missingTagId = "00000000-0000-4000-8000-000000000003";
  const otherOwnerTagId = "00000000-0000-4000-8000-000000000004";
  const tools = createTagMcpTools({
    userId: "owner-a",
    service: {
      async deleteUnused(tagId: string) {
        calls.push(tagId);
        return tagId === secondTag.id;
      },
    } as never,
  });

  assert.deepEqual(resultText(await tools.delete_unused_tag({ tagId: secondTag.id })), {
    deleted: true,
    tagId: secondTag.id,
  });
  const failed = await tools.delete_unused_tag({ tagId: firstTag.id });
  assert.equal(failed.isError, true);
  assert.deepEqual(resultText(failed), {
    deleted: false,
    message: "Tag was in use or not found.",
  });
  assert.deepEqual(resultText(await tools.delete_unused_tag({ tagId: missingTagId })), {
    deleted: false,
    message: "Tag was in use or not found.",
  });
  assert.deepEqual(resultText(await tools.delete_unused_tag({ tagId: otherOwnerTagId })), {
    deleted: false,
    message: "Tag was in use or not found.",
  });
  assert.deepEqual(
    resultText(await tools.delete_unused_tag({ tagId: secondTag.id, ownerId: "owner-b" })),
    {
      error: "Invalid tag deletion input.",
    },
  );
  assert.deepEqual(calls, [secondTag.id, firstTag.id, missingTagId, otherOwnerTagId]);
});

test("MCP delete_unused_tag uses the write rate limit and hides repository errors", async () => {
  const limiterCalls: Array<{ key: string; limit: number }> = [];
  const limited = createTagMcpTools({
    userId: "owner-a",
    limiter: {
      check(key, policy) {
        limiterCalls.push({ key, limit: policy.limit });
        return { allowed: false, retryAfterSeconds: 1 };
      },
    },
    service: {
      async deleteUnused() {
        throw new Error("must not run");
      },
    } as never,
  });

  const result = await limited.delete_unused_tag({ tagId: secondTag.id });
  assert.equal(result.isError, true);
  assert.deepEqual(resultText(result), { error: "Rate limit exceeded." });
  assert.deepEqual(limiterCalls, [{ key: "owner-a:mcp:write", limit: 30 }]);

  const failed = createTagMcpTools({
    userId: "owner-a",
    service: {
      async deleteUnused() {
        throw new Error("private database detail");
      },
    } as never,
  });
  assert.deepEqual(resultText(await failed.delete_unused_tag({ tagId: secondTag.id })), {
    error: "Unable to delete tag.",
  });
});

test("MCP merge_tags merges explicit IDs and conceals same, missing, and unowned tags", async () => {
  const calls: Array<{ sourceTagId: string; targetTagId: string }> = [];
  const unavailableIds = new Set([
    `${firstTag.id}:${firstTag.id}`,
    `00000000-0000-4000-8000-000000000003:${secondTag.id}`,
    `00000000-0000-4000-8000-000000000004:${secondTag.id}`,
  ]);
  const tools = createTagMcpTools({
    userId: "owner-a",
    service: {
      async merge(sourceTagId: string, targetTagId: string) {
        calls.push({ sourceTagId, targetTagId });
        return !unavailableIds.has(`${sourceTagId}:${targetTagId}`);
      },
    } as never,
  });

  assert.deepEqual(
    resultText(await tools.merge_tags({ sourceTagId: firstTag.id, targetTagId: secondTag.id })),
    { merged: true, sourceTagId: firstTag.id, targetTagId: secondTag.id },
  );
  const unavailable = [
    { sourceTagId: firstTag.id, targetTagId: firstTag.id },
    { sourceTagId: "00000000-0000-4000-8000-000000000003", targetTagId: secondTag.id },
    { sourceTagId: "00000000-0000-4000-8000-000000000004", targetTagId: secondTag.id },
  ];
  for (const selection of unavailable) {
    const result = await tools.merge_tags(selection);
    assert.equal(result.isError, true);
    assert.deepEqual(resultText(result), {
      merged: false,
      message: "One or both selected tags were not found or cannot be merged.",
    });
  }
  assert.deepEqual(
    resultText(await tools.merge_tags({ sourceTagId: "not-a-uuid", targetTagId: secondTag.id })),
    {
      error: "Invalid tag merge input.",
    },
  );
  assert.deepEqual(
    resultText(
      await tools.merge_tags({
        sourceTagId: firstTag.id,
        targetTagId: secondTag.id,
        ownerId: "owner-b",
      }),
    ),
    { error: "Invalid tag merge input." },
  );
  assert.deepEqual(calls, [
    { sourceTagId: firstTag.id, targetTagId: secondTag.id },
    ...unavailable,
  ]);
});

test("MCP merge_tags uses the write rate limit and hides repository errors", async () => {
  const selection = { sourceTagId: firstTag.id, targetTagId: secondTag.id };
  const limiterCalls: Array<{ key: string; limit: number }> = [];
  const limited = createTagMcpTools({
    userId: "owner-a",
    limiter: {
      check(key, policy) {
        limiterCalls.push({ key, limit: policy.limit });
        return { allowed: false, retryAfterSeconds: 1 };
      },
    },
    service: {
      async merge() {
        throw new Error("must not run");
      },
    } as never,
  });
  const denied = await limited.merge_tags(selection);
  assert.equal(denied.isError, true);
  assert.deepEqual(resultText(denied), { error: "Rate limit exceeded." });
  assert.deepEqual(limiterCalls, [{ key: "owner-a:mcp:write", limit: 30 }]);

  const failed = createTagMcpTools({
    userId: "owner-a",
    service: {
      async merge() {
        throw new Error("private database detail");
      },
    } as never,
  });
  assert.deepEqual(resultText(await failed.merge_tags(selection)), {
    error: "Unable to merge tags.",
  });
});
