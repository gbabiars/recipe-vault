import assert from "node:assert/strict";
import test from "node:test";
import { TagRepository } from "../src/lib/db/tag-repository";
import { TagService, OwnerBoundTagService } from "../src/lib/recipes/tag-service";
import { RecipeRepository } from "../src/lib/db/recipe-repository";

const tagId = "11111111-1111-4111-8111-111111111111";
const otherId = "22222222-2222-4222-8222-222222222222";

function query(result: Record<string, unknown>, calls: unknown[][]) {
  const builder = new Proxy(
    {},
    {
      get: (_target, property) => {
        if (property === "then") return (resolve: (value: unknown) => void) => resolve(result);
        return (...args: unknown[]) => {
          calls.push([property, ...args]);
          return builder;
        };
      },
    },
  );
  return builder;
}

test("tag catalog searches canonical names and orders and pages deterministically", async () => {
  const calls: unknown[][] = [];
  const repository = new TagRepository({
    from: (table: string) => {
      calls.push(["from", table]);
      return query(
        { data: [{ id: tagId, name: "week night", recipe_tags: [{ count: 2 }] }], count: 1 },
        calls,
      );
    },
  } as never);
  const service = new TagService(repository, {} as RecipeRepository);
  assert.deepEqual(
    await service.list("owner-a", { search: "  Week   Night ", offset: 10, limit: 5 }),
    {
      items: [{ id: tagId, name: "week night", recipeCount: 2 }],
      total: 1,
    },
  );
  assert.deepEqual(calls, [
    ["from", "tags"],
    ["select", "id, name, recipe_tags(count)", { count: "exact" }],
    ["eq", "owner_id", "owner-a"],
    ["order", "name", { ascending: true }],
    ["order", "id", { ascending: true }],
    ["range", 10, 14],
    ["ilike", "name", "%week night%"],
  ]);
  assert.throws(() => service.list("owner-a", { limit: 101 }));
});

test("concurrent exact-name requests use insert-or-ignore and resolve the same ID", async () => {
  const calls: unknown[][] = [];
  const repository = new TagRepository({
    from: (table: string) => {
      calls.push(["from", table]);
      return query({ data: { id: tagId, name: "dinner", recipe_tags: [] } }, calls);
    },
  } as never);
  const service = new TagService(repository, {} as RecipeRepository);
  const [first, second] = await Promise.all([
    service.create("owner-a", " Dinner "),
    service.create("owner-a", "dinner"),
  ]);
  assert.equal(first.id, second.id);
  assert.equal(first.recipeCount, 0);
  assert.equal(calls.filter(([method]) => method === "upsert").length, 2);
  assert.ok(
    calls.some(
      ([method, value, options]) =>
        method === "upsert" &&
        (value as { name: string }).name === "dinner" &&
        (options as { ignoreDuplicates: boolean }).ignoreDuplicates,
    ),
  );
});

test("rename reports a unique-name conflict without merging", async () => {
  const calls: unknown[][] = [];
  const repository = new TagRepository({
    from: () => query({ data: null, error: { code: "23505" } }, calls),
  } as never);
  const result = await new TagService(repository, {} as RecipeRepository).rename(
    "owner-a",
    tagId,
    " Dinner ",
  );
  assert.deepEqual(result, { status: "conflict" });
  assert.ok(
    calls.some(
      ([method, value]) => method === "update" && (value as { name: string }).name === "dinner",
    ),
  );
  assert.ok(
    calls.some(
      ([method, field, value]) => method === "eq" && field === "owner_id" && value === "owner-a",
    ),
  );
});

test("delete scopes by owner and handles used and unused tags the same way", async () => {
  for (const id of [tagId, otherId]) {
    const calls: unknown[][] = [];
    const repository = new TagRepository({
      from: () => query({ data: [{ id }] }, calls),
    } as never);
    assert.equal(await repository.delete("owner-a", id), true);
    assert.ok(calls.some(([method]) => method === "delete"));
    assert.ok(
      calls.some(
        ([method, field, value]) => method === "eq" && field === "owner_id" && value === "owner-a",
      ),
    );
  }
});

test("foreign tag lookup cannot reach recipe listing, including owner-bound service", async () => {
  const owners: string[] = [];
  const tags = {
    get: async (owner: string) => {
      owners.push(owner);
      return null;
    },
  } as unknown as TagRepository;
  const recipes = {
    listPage: () => {
      throw new Error("foreign recipe query attempted");
    },
  } as unknown as RecipeRepository;
  const bound = new OwnerBoundTagService("owner-a", new TagService(tags, recipes));
  assert.equal(await bound.get(tagId), null);
  assert.equal(await bound.listRecipes(tagId), null);
  assert.deepEqual(owners, ["owner-a", "owner-a"]);
});

test("associated recipe listing filters on the stable tag ID and owner", async () => {
  const calls: unknown[][] = [];
  const recipes = new RecipeRepository({
    from: () => query({ data: [], count: 0 }, calls),
  } as never);
  const tags = {
    get: async () => ({ id: tagId, name: "dinner", recipeCount: 0 }),
  } as unknown as TagRepository;
  const page = await new TagService(tags, recipes).listRecipes("owner-a", tagId, {
    offset: 5,
    limit: 10,
  });
  assert.deepEqual(page, { items: [], total: 0 });
  assert.ok(
    calls.some(
      ([method, fields]) =>
        method === "select" && String(fields).includes("recipe_tags!inner(tag_id)"),
    ),
  );
  assert.ok(
    calls.some(
      ([method, field, ids]) =>
        method === "in" && field === "recipe_tags.tag_id" && (ids as string[])[0] === tagId,
    ),
  );
  assert.ok(
    calls.some(
      ([method, field, owner]) => method === "eq" && field === "owner_id" && owner === "owner-a",
    ),
  );
  assert.ok(calls.some(([method, from, to]) => method === "range" && from === 5 && to === 14));
});
