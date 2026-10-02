import assert from "node:assert/strict";
import test from "node:test";
import { mapExtractedRecipe } from "./import-recipe";

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
