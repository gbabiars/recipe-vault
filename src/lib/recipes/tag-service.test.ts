import assert from "node:assert/strict";
import test from "node:test";
import { TagRepository } from "../db/tag-repository";
import { OwnerBoundTagService, TagService } from "./tag-service";

test("document tag inventory delegates owner, search, sort, cursor, and page size", async () => {
  const calls: Array<{ ownerId: string; options: Record<string, unknown> }> = [];
  const expectedPage = {
    tags: [{ name: "weeknight", usageCount: 3 }],
    hasMore: false,
  };
  const repository = {
    listFromDocuments: async (ownerId: string, options: Record<string, unknown>) => {
      calls.push({ ownerId, options });
      return expectedPage;
    },
  } as unknown as TagRepository;
  const service = new TagService(repository);
  const options = {
    search: " week ",
    sort: "usage_desc" as const,
    limit: 10,
    after: { name: "dinner", usageCount: 4 },
  };

  assert.equal(await service.listFromRecipes("owner-a", options), expectedPage);
  assert.deepEqual(calls, [{ ownerId: "owner-a", options }]);
});

test("owner-bound document tag inventory uses its verified owner", async () => {
  const calls: Array<{ ownerId: string; options: Record<string, unknown> }> = [];
  const expectedPage = {
    tags: [{ name: "dinner", usageCount: 2 }],
    hasMore: true,
  };
  const repository = {
    listFromDocuments: async (ownerId: string, options: Record<string, unknown>) => {
      calls.push({ ownerId, options });
      return expectedPage;
    },
  } as unknown as TagRepository;
  const service = new OwnerBoundTagService("verified-owner", new TagService(repository));
  const options = { sort: "name_asc" as const, limit: 25 };

  assert.equal(await service.listFromRecipes(options), expectedPage);
  assert.deepEqual(calls, [{ ownerId: "verified-owner", options }]);
  assert.deepEqual(Object.keys(expectedPage.tags[0]), ["name", "usageCount"]);
});

test("document tag inventory errors propagate through the service", async () => {
  const repository = {
    listFromDocuments: async () => {
      throw new Error("Could not load tags.");
    },
  } as unknown as TagRepository;
  const service = new TagService(repository);

  await assert.rejects(
    service.listFromRecipes("owner-a", { sort: "name_asc", limit: 25 }),
    /Could not load tags/,
  );
});

test("tag service validates canonical names and returns replacement results", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = new TagRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: [{ status: "replaced", changed_recipes: 2 }], error: null };
    },
  } as never);
  const service = new TagService(repository);

  assert.deepEqual(
    await service.replaceNameInRecipes("owner-a", {
      sourceName: "quick meals",
      targetName: "weeknight",
    }),
    { status: "replaced", changedRecipes: 2 },
  );
  assert.deepEqual(calls[0].args, {
    target_owner_id: "owner-a",
    source_name: "quick meals",
    target_name: "weeknight",
  });
  assert.throws(
    () =>
      service.replaceNameInRecipes("owner-a", {
        sourceName: "Quick Meals",
        targetName: "weeknight",
      }),
    /Invalid canonical tag name/,
  );
  assert.throws(
    () =>
      service.replaceNameInRecipes("owner-a", {
        sourceName: "quick meals",
        targetName: "quick meals",
      }),
    /must differ/,
  );
  assert.equal(calls.length, 1);
});

test("owner-bound tag service supplies its verified owner to document name replacement", async () => {
  let requestedOwner: string | undefined;
  const repository = new TagRepository({
    rpc: async (_name: string, args: { target_owner_id: string }) => {
      requestedOwner = args.target_owner_id;
      return { data: [{ status: "source_missing", changed_recipes: 0 }], error: null };
    },
  } as never);
  const service = new OwnerBoundTagService("verified-owner", new TagService(repository));

  assert.deepEqual(
    await service.replaceNameInRecipes({ sourceName: "quick meals", targetName: "weeknight" }),
    { status: "source_missing" },
  );
  assert.equal(requestedOwner, "verified-owner");
});
