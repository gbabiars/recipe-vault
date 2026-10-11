import assert from "node:assert/strict";
import test from "node:test";
import { recipeCreateInputSchema } from "../validation/recipe";
import type { RecipeDocumentContent } from "../validation/recipe-document";
import { RecipeRepository } from "./recipe-repository";

const documentId = "8c0fb550-686a-4a0c-bf8f-690c1359c877";
const recipeContent: RecipeDocumentContent = {
  title: "Orange shortbread",
  description: "Crisp cookies with orange zest.",
  yield: { amount: 24, unit: "cookies" },
  time: { cookMinutes: 18 },
  ingredients: [{ name: "unsalted butter", amount: "1 cup", note: "softened" }],
  equipment: [{ name: "baking sheet" }],
  instructions: ["Cream the butter and sugar."],
  notes: ["Chill the dough."],
  tags: ["baking", "cookies"],
  sourceUrl: "https://example.com/shortbread",
};

function rpcSavedDocument(revision = 3) {
  return {
    status: "saved",
    recipe_id: documentId,
    revision,
    document: recipeContent,
  };
}

test("document reads assemble the row ID and revision while scoping by owner", async () => {
  const calls: Array<[string, ...unknown[]]> = [];
  const query = {
    select: (fields: string) => {
      calls.push(["select", fields]);
      return query;
    },
    eq: (field: string, value: string) => {
      calls.push(["eq", field, value]);
      return query;
    },
    maybeSingle: async () => ({
      data: { id: documentId, document: recipeContent, revision: 7 },
      error: null,
    }),
  };
  const repository = new RecipeRepository({ from: () => query } as never);

  const current = await repository.getDocument("owner-a", documentId);

  assert.deepEqual(calls, [
    ["select", "id, document, revision"],
    ["eq", "owner_id", "owner-a"],
    ["eq", "id", documentId],
  ]);
  assert.deepEqual(current, {
    recipe: { id: documentId, ...recipeContent },
    revision: 7,
  });
});

test("document create sends id-free content and owner to the atomic RPC", async () => {
  let rpcCall: { name: string; args: Record<string, unknown> } | undefined;
  const repository = new RecipeRepository({
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCall = { name, args };
      return { data: [rpcSavedDocument(1)], error: null };
    },
  } as never);

  const result = await repository.createDocument("owner-a", recipeContent);

  assert.deepEqual(rpcCall, {
    name: "recipe_vault_write_recipe_document",
    args: {
      target_owner_id: "owner-a",
      target_recipe_id: null,
      target_expected_revision: null,
      target_document: recipeContent,
    },
  });
  assert.equal("id" in (rpcCall?.args.target_document as object), false);
  assert.deepEqual(result, {
    status: "saved",
    recipe: { id: documentId, ...recipeContent },
    revision: 1,
  });
});

test("document replacement sends the immutable row ID and expected revision", async () => {
  let rpcArgs: Record<string, unknown> | undefined;
  const repository = new RecipeRepository({
    rpc: async (_name: string, args: Record<string, unknown>) => {
      rpcArgs = args;
      return { data: [{ ...rpcSavedDocument(9), status: "conflict" }], error: null };
    },
  } as never);

  const recipe = { id: documentId, ...recipeContent };
  const result = await repository.replaceDocument("owner-a", recipe, 8);

  assert.deepEqual(rpcArgs, {
    target_owner_id: "owner-a",
    target_recipe_id: documentId,
    target_expected_revision: 8,
    target_document: recipeContent,
  });
  assert.deepEqual(result, { status: "conflict", revision: 9 });
});

test("document write preserves explicit not-found and invalid outcomes", async () => {
  const repository = new RecipeRepository({
    rpc: async (_name: string, args: { target_recipe_id: string | null }) => ({
      data: [
        args.target_recipe_id === null
          ? { status: "invalid", recipe_id: null, revision: null, document: null }
          : { status: "not_found", recipe_id: null, revision: null, document: null },
      ],
      error: null,
    }),
  } as never);

  assert.deepEqual(await repository.createDocument("owner-a", recipeContent), {
    status: "invalid",
  });
  assert.deepEqual(
    await repository.replaceDocument("owner-a", { id: documentId, ...recipeContent }, 1),
    { status: "not_found" },
  );
});

test("recipe list queries are constrained to the current owner before RLS is applied", async () => {
  const filters: string[][] = [];
  const query = {
    select: () => query,
    eq: (column: string, value: string) => {
      filters.push([column, value]);
      return query;
    },
    order: () => ({
      then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
        resolve({ data: [], error: null }),
    }),
    ilike: () => query,
    contains: () => query,
  };
  const repository = new RecipeRepository({ from: () => query } as never);
  await repository.list("owner-a");
  assert.deepEqual(filters, [["owner_id", "owner-a"]]);
});

const input = recipeCreateInputSchema.parse({
  title: "Soup",
  tags: [" Dinner  Party ", "dinner party", "Week  Night"],
  ingredients: [{ displayOrder: 1, amount: "1 cup", ingredientName: "water" }],
  steps: [{ stepOrder: 1, instruction: "Boil." }],
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
  assert.deepEqual(calls[0].args.ingredient_data, [
    {
      display_order: 1,
      amount: "1 cup",
      ingredient_name: "water",
      notes: null,
    },
  ]);
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

test("recipe reads map optional amounts and order ingredients by display order", async () => {
  const selections: string[] = [];
  const query = {
    select: (fields: string) => {
      selections.push(fields);
      return query;
    },
    eq: () => query,
    maybeSingle: async () => ({
      data: {
        id: "recipe-a",
        owner_id: "owner-a",
        title: "Soup",
        summary: null,
        prep_time_minutes: null,
        cook_time_minutes: null,
        total_time_minutes: null,
        servings: null,
        tags: [],
        source_url: null,
        notes: null,
        created_at: "now",
        updated_at: "now",
        recipe_ingredients: [
          {
            display_order: 2,
            amount: "to taste",
            ingredient_name: "pepper",
            notes: null,
          },
          { display_order: 1, amount: null, ingredient_name: "water", notes: "cold" },
        ],
        recipe_steps: [],
      },
      error: null,
    }),
  };
  const repository = new RecipeRepository({ from: () => query } as never);

  const result = await repository.get("owner-a", "recipe-a");

  assert.match(
    selections[0],
    /recipe_ingredients\(display_order, amount, ingredient_name, notes\)/,
  );
  assert.doesNotMatch(selections[0], /quantity|unit/);
  assert.deepEqual(
    result?.ingredients.map(({ displayOrder, ingredientName }) => [displayOrder, ingredientName]),
    [
      [1, "water"],
      [2, "pepper"],
    ],
  );
  assert.equal(result?.ingredients[0].amount, undefined);
  assert.equal(result?.ingredients[1].amount, "to taste");
  assert.deepEqual(JSON.parse(JSON.stringify(result?.ingredients)), [
    { displayOrder: 1, ingredientName: "water", notes: "cold" },
    { displayOrder: 2, amount: "to taste", ingredientName: "pepper" },
  ]);
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

const tags = [
  ...Array.from({ length: 30 }, (_, index) => ({
    owner: "mine",
    name: `tag ${String(index).padStart(2, "0")}`,
  })),
  { owner: "mine", name: "100% good" },
  { owner: "mine", name: "a_b" },
  { owner: "mine", name: "a\\b" },
  { owner: "other", name: "secret" },
];

function setupRepository(options: { fail?: boolean } = {}) {
  const calls: Array<[string, unknown]> = [];
  const query = {
    select: (field: string) => {
      calls.push(["select", field]);
      return query;
    },
    eq: (field: string, value: string) => {
      calls.push([field, value]);
      return query;
    },
    order: (field: string) => {
      calls.push(["order", field]);
      return query;
    },
    limit: (count: number) => {
      calls.push(["limit", count]);
      return query;
    },
    ilike: (field: string, pattern: string) => {
      calls.push([field, pattern]);
      return query;
    },
    then: (resolve: (value: { data: Array<{ name: string }>; error: Error | null }) => void) => {
      const owner = calls.find(([key]) => key === "owner_id")?.[1];
      const pattern = calls.find(([key]) => key === "name")?.[1] as string | undefined;
      const needle = pattern
        ?.slice(1, -1)
        .replace(/\\([\\%_])/g, "$1")
        .toLowerCase();
      const data = tags
        .filter(
          (tag) => tag.owner === owner && (!needle || tag.name.toLowerCase().includes(needle)),
        )
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 25)
        .map(({ name }) => ({ name }));
      resolve({ data, error: options.fail ? new Error("db unavailable") : null });
    },
  };
  const repository = new RecipeRepository({
    from: (table: string) => {
      calls.push(["from", table]);
      return query;
    },
  } as never);
  return { repository, calls };
}

test("tag catalog is owned, alphabetic, and capped", async () => {
  const { repository, calls } = setupRepository();
  const result = await repository.listTags("mine");
  assert.deepEqual(
    result,
    tags
      .filter((tag) => tag.owner === "mine")
      .map(({ name }) => ({ name }))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 25),
  );
  assert.deepEqual(calls.slice(0, 5), [
    ["from", "tags"],
    ["select", "name"],
    ["owner_id", "mine"],
    ["order", "name"],
    ["limit", 25],
  ]);
});

test("tag searches match case-insensitively and escape SQL wildcards", async () => {
  for (const [search, expected, pattern] of [
    ["TAG 29", "tag 29", "%TAG 29%"],
    ["%", "100% good", "%\\%%"],
    ["_", "a_b", "%\\_%"],
    ["\\", "a\\b", "%\\\\%"],
  ]) {
    const { repository, calls } = setupRepository();
    assert.deepEqual(await repository.listTags("mine", search), [{ name: expected }]);
    assert.deepEqual(
      calls.find(([key]) => key === "name"),
      ["name", pattern],
    );
  }
});
