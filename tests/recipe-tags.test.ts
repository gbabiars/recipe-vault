import assert from "node:assert/strict";
import test from "node:test";
import { RecipeRepository } from "../src/lib/db/recipe-repository";
import { recipeCreateInputSchema } from "../src/lib/validation/recipe";

const input = recipeCreateInputSchema.parse({
  title: "Soup",
  tags: [" Dinner  Party ", "dinner party", "Week  Night"],
  ingredients: [{ displayOrder: 1, quantity: 1, unit: "cup", ingredientName: "water" }],
  steps: [{ stepOrder: 1, instruction: "Boil." }],
});

test("recipe tag names collapse case, outer whitespace, and repeated spaces", () => {
  assert.deepEqual(input.tags, ["dinner party", "week night"]);
});

test("recipe create sends one atomic database write and propagates failure", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const repository = new RecipeRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: null, error: new Error("step constraint") };
    },
    from: () => {
      throw new Error("partial table write attempted");
    },
  } as never);
  await assert.rejects(repository.create("owner-a", input), /Could not create the recipe/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, "recipe_vault_write_recipe");
  assert.equal(calls[0].args.target_owner_id, "owner-a");
  assert.deepEqual((calls[0].args.recipe_data as { tags: string[] }).tags, input.tags);
});

test("recipe update uses the same atomic write boundary", async () => {
  const calls: string[] = [];
  const repository = new RecipeRepository({
    rpc: async (name: string, args: { target_recipe_id: string }) => {
      calls.push(`${name}:${args.target_recipe_id}`);
      return { data: null, error: new Error("step constraint") };
    },
  } as never);
  await assert.rejects(repository.update("owner-a", "recipe-a", input));
  assert.deepEqual(calls, ["recipe_vault_write_recipe:recipe-a"]);
});

test("multiple recipe tag filters use any-match semantics", async () => {
  const overlapCalls: string[][] = [];
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    overlaps: (_field: string, tags: string[]) => {
      overlapCalls.push(tags);
      return query;
    },
    then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
      resolve({ data: [], error: null }),
  };
  const repository = new RecipeRepository({ from: () => query } as never);
  await repository.list("owner-a", undefined, ["dinner", "weeknight"]);
  assert.deepEqual(overlapCalls, [["dinner", "weeknight"]]);
});

test("multiple stable tag IDs use one any-match association filter", async () => {
  const calls: unknown[][] = [];
  const query = {
    select: (fields: string) => {
      calls.push(["select", fields]);
      return query;
    },
    eq: () => query,
    order: () => query,
    range: () => query,
    in: (field: string, ids: string[]) => {
      calls.push(["in", field, ids]);
      return query;
    },
    then: (resolve: (value: { data: unknown[]; count: number; error: null }) => void) =>
      resolve({ data: [], count: 0, error: null }),
  };
  const repository = new RecipeRepository({ from: () => query } as never);
  await repository.listPage("owner-a", undefined, [], [], 0, 25, ["tag-a", "tag-b"]);
  assert.ok(String(calls[0][1]).includes("recipe_tags!inner(tag_id)"));
  assert.deepEqual(calls[1], ["in", "recipe_tags.tag_id", ["tag-a", "tag-b"]]);
});
