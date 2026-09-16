import assert from "node:assert/strict";
import test from "node:test";
import { recipeCreateInputSchema, recipeUpdateInputSchema } from "../src/lib/validation/recipe";

const validRecipe = {
  title: "Lemon Pasta",
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  totalTimeMinutes: 25,
  servings: 2,
  tags: ["Weeknight", "weeknight"],
  dietaryFlags: ["Vegetarian"],
  ingredients: [{ displayOrder: 1, quantity: 200, unit: "g", ingredientName: "spaghetti" }],
  steps: [{ stepOrder: 1, instruction: "Cook the pasta.", durationMinutes: 10 }],
};

test("accepts a structured recipe and canonicalizes labels", () => {
  const result = recipeCreateInputSchema.parse(validRecipe);

  assert.deepEqual(result.tags, ["weeknight"]);
  assert.deepEqual(result.dietaryFlags, ["vegetarian"]);
});

test("rejects invalid quantities, durations, servings, and ordering", () => {
  for (const invalid of [
    { ...validRecipe, ingredients: [{ ...validRecipe.ingredients[0], quantity: -1 }] },
    { ...validRecipe, steps: [{ ...validRecipe.steps[0], durationMinutes: -1 }] },
    { ...validRecipe, servings: 0 },
    { ...validRecipe, steps: [{ ...validRecipe.steps[0], stepOrder: 0 }] },
  ]) {
    assert.equal(recipeCreateInputSchema.safeParse(invalid).success, false);
  }
});

test("rejects inconsistent total time and duplicate child ordering", () => {
  assert.equal(recipeCreateInputSchema.safeParse({ ...validRecipe, totalTimeMinutes: 20 }).success, false);
  assert.equal(
    recipeCreateInputSchema.safeParse({
      ...validRecipe,
      ingredients: [...validRecipe.ingredients, { ...validRecipe.ingredients[0] }],
    }).success,
    false,
  );
});

test("requires a non-empty update patch", () => {
  assert.equal(recipeUpdateInputSchema.safeParse({}).success, false);
  assert.equal(recipeUpdateInputSchema.safeParse({ title: "Updated" }).success, true);
});
