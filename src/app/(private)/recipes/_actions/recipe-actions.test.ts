import assert from "node:assert/strict";
import test from "node:test";
import { deleteRecipeAction } from "./recipe-actions";
import { emptyRecipeFormState } from "../_lib/recipe-form-state";

test("delete action requires an explicit confirmation", async () => {
  const form = new FormData();
  form.set("recipeId", "recipe");
  const result = await deleteRecipeAction(emptyRecipeFormState, form);
  assert.equal(result.errors.confirmDelete, "Confirm deletion before continuing.");
});
