import assert from "node:assert/strict";
import test from "node:test";
import { TagRepository } from "./tag-repository";

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

test("tag repository passes an explicit owner and maps the RPC lookahead page", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = new TagRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return {
        data: [
          {
            id: firstTag.id,
            name: firstTag.name,
            usage_count: "4",
            description: "Tags for relaxed weeknight meals.",
          },
          { id: secondTag.id, name: secondTag.name, usage_count: 0, description: null },
          {
            id: "00000000-0000-4000-8000-000000000003",
            name: "snack",
            usage_count: 1,
            description: null,
          },
        ],
        error: null,
      };
    },
  } as never);
  const page = await repository.list("owner-a", {
    usage: "all",
    sort: "name_asc",
    limit: 2,
  });

  assert.deepEqual(page, {
    tags: [{ ...firstTag, description: "Tags for relaxed weeknight meals." }, secondTag],
    hasMore: true,
  });
  assert.equal(calls[0].name, "recipe_vault_list_tag_inventory");
  assert.deepEqual(calls[0].args, {
    target_owner_id: "owner-a",
    target_search: null,
    target_usage: "all",
    target_sort: "name_asc",
    after_usage_count: null,
    after_name: null,
    after_tag_id: null,
    target_limit: 3,
    before_usage_count: null,
    before_name: null,
    before_tag_id: null,
  });
});

test("tag repository passes a before cursor for reverse keyset pagination", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = new TagRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: [], error: null };
    },
  } as never);
  const before = {
    usageCount: 3,
    name: "supper",
    id: "00000000-0000-4000-8000-000000000004",
  };

  await repository.list("owner-a", {
    usage: "all",
    sort: "name_asc",
    limit: 25,
    before,
  });

  assert.deepEqual(calls, [
    {
      name: "recipe_vault_list_tag_inventory",
      args: {
        target_owner_id: "owner-a",
        target_search: null,
        target_usage: "all",
        target_sort: "name_asc",
        after_usage_count: null,
        after_name: null,
        after_tag_id: null,
        target_limit: 26,
        before_usage_count: before.usageCount,
        before_name: before.name,
        before_tag_id: before.id,
      },
    },
  ]);
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

test("tag repository passes both explicitly selected IDs and owner to merge RPC", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = new TagRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: true, error: null };
    },
  } as never);

  assert.equal(await repository.merge("owner-a", firstTag.id, secondTag.id), true);
  assert.deepEqual(calls, [
    {
      name: "recipe_vault_merge_tags",
      args: {
        target_owner_id: "owner-a",
        source_tag_id: firstTag.id,
        target_tag_id: secondTag.id,
      },
    },
  ]);
});
