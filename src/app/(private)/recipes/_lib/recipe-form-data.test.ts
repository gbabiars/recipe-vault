import assert from "node:assert/strict";
import test from "node:test";
import { parseRecipeFormData } from "./recipe-form-data";

function validForm() {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    title: "Toast",
    ingredientCount: "1",
    "ingredient-0-amount": "2 slices",
    "ingredient-0-name": "bread",
    stepCount: "1",
    "step-0-instruction": "Toast the bread.",
  }))
    form.set(key, value);
  return form;
}

test("recipe form validation retains the shared schema rules", () => {
  const missingTitle = validForm();
  missingTitle.set("title", "");
  assert.throws(() => parseRecipeFormData(missingTitle));
  const invalidUpdate = validForm();
  invalidUpdate.set("ingredient-0-amount", "x".repeat(129));
  assert.throws(() => parseRecipeFormData(invalidUpdate));
});
