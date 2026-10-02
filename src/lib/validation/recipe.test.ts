import assert from "node:assert/strict";
import test from "node:test";
import { recipeCreateInputSchema, recipeUpdateInputSchema } from "./recipe";

const validRecipe = {
  title: "Lemon Pasta",
  prepTimeMinutes: 10,
  cookTimeMinutes: 15,
  totalTimeMinutes: 25,
  servings: 2,
  tags: ["Weeknight", "weeknight"],
  ingredients: [{ displayOrder: 1, amount: "200 g", ingredientName: "spaghetti" }],
  steps: [{ stepOrder: 1, instruction: "Cook the pasta.", durationMinutes: 10 }],
};

test("accepts a structured recipe and canonicalizes labels", () => {
  const result = recipeCreateInputSchema.parse(validRecipe);

  assert.deepEqual(result.tags, ["weeknight"]);
});

test("accepts optional free-text amounts and rejects invalid ingredient amounts", () => {
  assert.deepEqual(
    recipeCreateInputSchema.parse({
      ...validRecipe,
      ingredients: [{ displayOrder: 1, ingredientName: "salt" }],
    }).ingredients,
    [{ displayOrder: 1, ingredientName: "salt" }],
  );
  assert.deepEqual(
    recipeCreateInputSchema.parse({
      ...validRecipe,
      ingredients: [{ displayOrder: 1, amount: "  1 1/2 cups  ", ingredientName: "milk" }],
    }).ingredients[0].amount,
    "1 1/2 cups",
  );
  for (const amount of [" ", "x".repeat(129)]) {
    assert.equal(
      recipeCreateInputSchema.safeParse({
        ...validRecipe,
        ingredients: [{ displayOrder: 1, amount, ingredientName: "salt" }],
      }).success,
      false,
    );
  }
});

test("rejects retired quantity and unit fields, durations, servings, and ordering", () => {
  for (const invalid of [
    {
      ...validRecipe,
      ingredients: [{ displayOrder: 1, quantity: 1, unit: "g", ingredientName: "spaghetti" }],
    },
    { ...validRecipe, steps: [{ ...validRecipe.steps[0], durationMinutes: -1 }] },
    { ...validRecipe, servings: 0 },
    { ...validRecipe, steps: [{ ...validRecipe.steps[0], stepOrder: 0 }] },
  ]) {
    assert.equal(recipeCreateInputSchema.safeParse(invalid).success, false);
  }
});

test("rejects inconsistent total time and duplicate child ordering", () => {
  assert.equal(
    recipeCreateInputSchema.safeParse({ ...validRecipe, totalTimeMinutes: 20 }).success,
    false,
  );
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

test("rejects retired dietary fields in create and update commands", () => {
  assert.equal(
    recipeCreateInputSchema.safeParse({ ...validRecipe, dietaryFlags: ["vegan"] }).success,
    false,
  );
  assert.equal(recipeUpdateInputSchema.safeParse({ dietaryFlags: ["vegan"] }).success, false);
});

const input = recipeCreateInputSchema.parse({
  title: "Soup",
  tags: [" Dinner  Party ", "dinner party", "Week  Night"],
  ingredients: [{ displayOrder: 1, amount: "1 cup", ingredientName: "water" }],
  steps: [{ stepOrder: 1, instruction: "Boil." }],
});

test("recipe tag names collapse case, outer whitespace, and repeated spaces", () => {
  assert.deepEqual(input.tags, ["dinner party", "week night"]);
});
