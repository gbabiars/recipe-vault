import assert from "node:assert/strict";
import test from "node:test";
import { importRecipeDocumentFromApi } from "./import-recipe-document-from-api";

test("returns the recipe ID from the successful document import response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    Response.json({ data: { recipe: { id: "recipe-123" }, revision: 1 } }, { status: 201 });

  try {
    const result = await importRecipeDocumentFromApi(
      new File(["pdf"], "fried-rice-recipe.pdf", { type: "application/pdf" }),
    );
    assert.deepEqual(result, { id: "recipe-123" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
