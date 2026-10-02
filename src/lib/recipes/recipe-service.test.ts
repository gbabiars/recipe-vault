import assert from "node:assert/strict";
import test from "node:test";
import { parseRecipeFormData } from "../../features/recipes/recipe-form-data";
import { RecipeService } from "./recipe-service";

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

test("recipe service scopes create, edit, and delete commands to the current owner", async () => {
  const calls: Array<[string, string]> = [];
  const repository = {
    get: async () => ({
      id: "recipe",
      ownerId: "owner-a",
      title: "Toast",
      tags: [],
      ingredients: inputIngredients(),
      steps: inputSteps(),
      createdAt: "now",
      updatedAt: "now",
    }),
    create: async (owner: string) => {
      calls.push(["create", owner]);
      return { id: "recipe" };
    },
    update: async (owner: string) => {
      calls.push(["update", owner]);
      return null;
    },
    remove: async (owner: string) => {
      calls.push(["delete", owner]);
    },
  };
  const service = new RecipeService(repository as never);
  const input = parseRecipeFormData(validForm());
  await service.create("owner-a", input);
  await service.update("owner-a", "recipe", input);
  await service.delete("owner-a", "recipe");
  assert.deepEqual(calls, [
    ["create", "owner-a"],
    ["update", "owner-a"],
    ["delete", "owner-a"],
  ]);
});

function inputIngredients() {
  return [{ displayOrder: 1, amount: "2 slices", ingredientName: "bread" }];
}
function inputSteps() {
  return [{ stepOrder: 1, instruction: "Toast the bread." }];
}
