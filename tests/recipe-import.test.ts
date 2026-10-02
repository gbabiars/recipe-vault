import assert from "node:assert/strict";
import test from "node:test";
import { createRecipeApi } from "../src/lib/api/recipe-handlers";
import { mapExtractedRecipe } from "../src/lib/recipes/import-recipe";
import {
  extractSourceText,
  pinnedLookup,
  readSource,
  SourceReadError,
  validateSourceUrl,
} from "../src/lib/recipes/read-source";
import type { RecipeCreateInput } from "../src/lib/validation/recipe";

const extracted = {
  title: "Tomato soup",
  summary: null,
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  totalTimeMinutes: null,
  servings: null,
  ingredients: [{ ingredientName: "tomatoes", amount: "2 cups", notes: null }],
  steps: [{ instruction: "Simmer tomatoes.", durationMinutes: null }],
};

const request = (body: unknown) =>
  new Request("http://test/api/v1/recipes/import", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "x-request-id": "import-test" },
  });

function api(user: string | null, importer: (url: string) => Promise<RecipeCreateInput>) {
  const saved: Array<{ ownerId: string; input: RecipeCreateInput }> = [];
  return {
    saved,
    handler: createRecipeApi({
      getUser: async () => (user ? { id: user } : null),
      getService: async () =>
        ({
          create: async (ownerId: string, input: RecipeCreateInput) => {
            saved.push({ ownerId, input });
            return { id: "recipe-1" };
          },
        }) as never,
      importInput: importer,
    }).importRecipe,
  };
}

test("rejects invalid URLs and unauthenticated requests before reading a source", async () => {
  let calls = 0;
  const importer = async () => {
    calls++;
    return mapExtractedRecipe(extracted, "https://example.com/soup");
  };
  const unauthenticated = api(null, importer);
  assert.equal(
    (await unauthenticated.handler(request({ url: "https://example.com/soup" })))!.status,
    401,
  );
  const authenticated = api("owner-1", importer);
  for (const url of ["file:///etc/passwd", "https://user:pass@example.com", "not-a-url"]) {
    assert.equal((await authenticated.handler(request({ url })))!.status, 422);
  }
  assert.equal(calls, 0);
});

test("rejects local and private destinations", async () => {
  for (const url of [
    "http://localhost/",
    "http://127.0.0.1/",
    "http://10.0.0.1/",
    "http://[::1]/",
  ]) {
    await assert.rejects(
      readSource(url),
      (error: unknown) =>
        error instanceof SourceReadError && error.message === "blocked_destination",
    );
  }
  assert.equal(validateSourceUrl("https://example.com/recipe").href, "https://example.com/recipe");
});

test("pinned DNS lookup respects Node's all-address callback contract", () => {
  const address = { address: "93.184.215.14", family: 4 };
  const lookup = pinnedLookup(address);
  lookup("example.com", { all: true }, (error, result) => {
    assert.equal(error, null);
    assert.deepEqual(result, [address]);
  });
  lookup("example.com", { all: false }, (error, result, family) => {
    assert.equal(error, null);
    assert.equal(result, address.address);
    assert.equal(family, address.family);
  });
});

test("rejects incomplete extracted recipes and preserves the submitted source URL", () => {
  assert.throws(
    () => mapExtractedRecipe({ ...extracted, ingredients: [] }, "https://example.com/soup"),
    /no_recipe/,
  );
  const recipe = mapExtractedRecipe(extracted, "https://example.com/soup");
  assert.equal(recipe.sourceUrl, "https://example.com/soup");
  assert.deepEqual(recipe.ingredients, [
    { displayOrder: 1, ingredientName: "tomatoes", amount: "2 cups" },
  ]);
  assert.equal(recipe.summary, undefined);
});

test("collects recipe JSON-LD and visible page text without unrelated scripts", () => {
  const text = extractSourceText(
    `<html><head><script type="application/ld+json">{"@type":"Recipe","recipeIngredient":["tomatoes"]}</script><script>ignoreThis()</script></head><body><h1>Tomato soup</h1><p>Simmer tomatoes.</p></body></html>`,
  );
  assert.match(text, /recipeIngredient/);
  assert.match(text, /Tomato soup Simmer tomatoes/);
  assert.doesNotMatch(text, /ignoreThis/);
});

test("saves an authenticated import and returns its ID and request ID", async () => {
  const importer = async (url: string) => mapExtractedRecipe(extracted, url);
  const { handler, saved } = api("owner-1", importer);
  const response = (await handler(request({ url: "https://example.com/soup" })))!;
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    data: { id: "recipe-1" },
    meta: { requestId: "import-test" },
  });
  assert.equal(saved[0].ownerId, "owner-1");
  assert.equal(saved[0].input.sourceUrl, "https://example.com/soup");
});

test("returns safe errors for source and extraction failures", async () => {
  for (const code of ["unreachable", "access_denied", "no_recipe", "extraction_failed"]) {
    const { handler, saved } = api("owner-1", async () => {
      throw new SourceReadError(code);
    });
    const response = (await handler(request({ url: "https://example.com/soup" })))!;
    const body = await response.json();
    assert.equal(response.status, 422);
    assert.equal(body.error.code, code);
    assert.equal(body.error.requestId, "import-test");
    if (code === "access_denied")
      assert.match(body.error.message, /website blocked automated access/i);
    assert.equal(saved.length, 0);
  }
});
