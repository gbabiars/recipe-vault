import assert from "node:assert/strict";
import test from "node:test";
import { TagRepository } from "../src/lib/db/tag-repository";
import { OwnerBoundTagService, TagService } from "../src/lib/recipes/tag-service";
import { createTagMcpTools } from "../src/mcp/tools";
import type { RateLimiter } from "../src/lib/api/rate-limit";

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

function resultText(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

test("tag repository passes an explicit owner and maps the RPC lookahead page", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = new TagRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return {
        data: [
          { id: firstTag.id, name: firstTag.name, usage_count: "4" },
          { id: secondTag.id, name: secondTag.name, usage_count: 0 },
        ],
        error: null,
      };
    },
  } as never);
  const page = await repository.list("owner-a", {
    usage: "all",
    sort: "name_asc",
    limit: 1,
  });

  assert.deepEqual(page, { tags: [firstTag], hasMore: true });
  assert.equal(calls[0].name, "recipe_vault_list_tag_inventory");
  assert.equal(calls[0].args.target_owner_id, "owner-a");
  assert.equal(calls[0].args.target_limit, 2);
});

test("tag repository passes owner and stable ID to the guarded delete RPC", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = new TagRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: false, error: null };
    },
  } as never);

  assert.equal(await repository.deleteUnused("owner-a", secondTag.id), false);
  assert.deepEqual(calls, [
    {
      name: "recipe_vault_delete_unused_tag",
      args: { target_owner_id: "owner-a", target_tag_id: secondTag.id },
    },
  ]);
});

test("owner-bound tag service supplies its verified owner to the repository", async () => {
  let requestedOwner: string | undefined;
  const repository = new TagRepository({
    rpc: async (_name: string, args: { target_owner_id: string }) => {
      requestedOwner = args.target_owner_id;
      return { data: [], error: null };
    },
  } as never);
  const service = new OwnerBoundTagService("verified-owner", new TagService(repository));

  await service.list({ usage: "unused", sort: "usage_asc", limit: 25 });
  assert.equal(requestedOwner, "verified-owner");
});

test("owner-bound tag service never accepts an owner from delete input", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const repository = new TagRepository({
    rpc: async (_name: string, args: Record<string, unknown>) => {
      calls.push(args);
      return { data: true, error: null };
    },
  } as never);
  const service = new OwnerBoundTagService("verified-owner", new TagService(repository));

  assert.equal(await service.deleteUnused(secondTag.id), true);
  assert.deepEqual(calls, [{ target_owner_id: "verified-owner", target_tag_id: secondTag.id }]);
});

test("MCP list_tags defaults to the full alphabetic inventory and returns only tag fields", async () => {
  const calls: unknown[] = [];
  const tools = createTagMcpTools({
    userId: "owner-a",
    service: {
      async list(options: unknown) {
        calls.push(options);
        return { tags: [firstTag], hasMore: false };
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
  const tools = createTagMcpTools({
    userId: "owner-a",
    service: {
      async list(options: Record<string, unknown>) {
        calls.push(options);
        return options.after
          ? { tags: [secondTag], hasMore: false }
          : { tags: [firstTag], hasMore: true };
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
