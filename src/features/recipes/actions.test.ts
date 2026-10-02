import assert from "node:assert/strict";
import test from "node:test";
import { deleteRecipeAction } from "./actions";
import { emptyRecipeFormState } from "./recipe-form-state";

test("delete action requires an explicit confirmation", async () => {
  const form = new FormData();
  form.set("recipeId", "recipe");
  const result = await deleteRecipeAction(emptyRecipeFormState, form);
  assert.equal(result.errors.confirmDelete, "Confirm deletion before continuing.");
});
