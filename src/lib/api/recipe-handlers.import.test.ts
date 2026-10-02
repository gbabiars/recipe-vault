import assert from "node:assert/strict";
import test from "node:test";
import { createRecipeApi } from "./recipe-handlers";
import { mapExtractedRecipe } from "../recipes/import-recipe";
import { SourceReadError } from "../recipes/read-source";
import type { RecipeCreateInput } from "../validation/recipe";

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
