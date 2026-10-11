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

test("document tag inventory passes an owner, filters, and usage/name cursor", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = new TagRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return {
        data: [
          { name: "dinner", usage_count: "4" },
          { name: "lunch", usage_count: 3 },
          { name: "weeknight", usage_count: 2 },
        ],
        error: null,
      };
    },
  } as never);

  const page = await repository.listFromDocuments("owner-a", {
    search: "  night ",
    sort: "usage_desc",
    limit: 2,
    after: { usageCount: 4, name: "dinner" },
  });

  assert.deepEqual(page, {
    tags: [
      { name: "dinner", usageCount: 4 },
      { name: "lunch", usageCount: 3 },
    ],
    hasMore: true,
  });
  assert.deepEqual(calls, [
    {
      name: "recipe_vault_list_document_tag_inventory",
      args: {
        target_owner_id: "owner-a",
        target_search: "night",
        target_sort: "usage_desc",
        after_usage_count: 4,
        after_name: "dinner",
        target_limit: 3,
      },
    },
  ]);
});

test("document tag inventory maps only canonical name and positive usage count", async () => {
  const repository = new TagRepository({
    rpc: async () => ({ data: [{ name: "dinner", usage_count: 0 }], error: null }),
  } as never);

  await assert.rejects(
    repository.listFromDocuments("owner-a", { sort: "name_asc", limit: 25 }),
    /Could not load tags/,
  );
});

test("document tag filtering passes the explicit owner and exact name", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const recipeId = "00000000-0000-4000-8000-000000000010";
  const repository = new TagRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: [{ recipe_id: recipeId }], error: null };
    },
  } as never);

  assert.deepEqual(await repository.listRecipeIdsWithDocumentTag("owner-a", "dinner"), [recipeId]);
  assert.deepEqual(calls, [
    {
      name: "recipe_vault_list_recipe_ids_by_document_tag",
      args: { target_owner_id: "owner-a", target_tag_name: "dinner" },
    },
  ]);
});

test("document tag name sorting accepts a name-only cursor", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = new TagRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: [], error: null };
    },
  } as never);

  await repository.listFromDocuments("owner-a", {
    sort: "name_asc",
    limit: 25,
    after: { name: "dinner" },
  });
  assert.equal(calls[0].args.after_usage_count, null);
  assert.equal(calls[0].args.after_name, "dinner");
});

test("document tag usage sorting requires the usage/name cursor pair", async () => {
  const repository = new TagRepository({
    rpc: async () => {
      throw new Error("Invalid cursors must not reach the database");
    },
  } as never);

  await assert.rejects(
    repository.listFromDocuments("owner-a", {
      sort: "usage_desc",
      limit: 25,
      after: { name: "dinner" },
    }),
    /Could not load tags/,
  );
});

test("document tag name replacement passes explicit owner and canonical names", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = new TagRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: [{ status: "replaced", changed_recipes: "3" }], error: null };
    },
  } as never);

  assert.deepEqual(await repository.replaceDocumentTagName("owner-a", "quick meals", "weeknight"), {
    status: "replaced",
    changedRecipes: 3,
  });
  assert.deepEqual(calls, [
    {
      name: "recipe_vault_replace_document_tag",
      args: {
        target_owner_id: "owner-a",
        source_name: "quick meals",
        target_name: "weeknight",
      },
    },
  ]);
});

test("document tag name replacement maps a missing source without exposing IDs", async () => {
  const repository = new TagRepository({
    rpc: async () => ({ data: [{ status: "source_missing", changed_recipes: 0 }], error: null }),
  } as never);

  assert.deepEqual(await repository.replaceDocumentTagName("owner-a", "quick meals", "weeknight"), {
    status: "source_missing",
  });
});

test("document tag name replacement rejects malformed RPC results", async () => {
  const repository = new TagRepository({
    rpc: async () => ({ data: [{ status: "replaced", changed_recipes: 0 }], error: null }),
  } as never);

  await assert.rejects(
    repository.replaceDocumentTagName("owner-a", "quick meals", "weeknight"),
    /Could not rename tag/,
  );
});
