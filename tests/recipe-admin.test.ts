import assert from "node:assert/strict";
import test from "node:test";
import { ensureAuthenticatedUser } from "../src/lib/auth/require-user";
import { deleteRecipeAction } from "../src/features/recipes/actions";
import { parseRecipeFormData } from "../src/features/recipes/recipe-form-data";
import { emptyRecipeFormState } from "../src/features/recipes/recipe-form-state";
import { RecipeService } from "../src/lib/recipes/recipe-service";
import { RecipeRepository } from "../src/lib/db/recipe-repository";

function validForm() {
  const form = new FormData();
  for (const [key, value] of Object.entries({
    title: "Toast",
    ingredientCount: "1",
    "ingredient-0-quantity": "2",
    "ingredient-0-unit": "slices",
    "ingredient-0-name": "bread",
    stepCount: "1",
    "step-0-instruction": "Toast the bread.",
  }))
    form.set(key, value);
  return form;
}

test("unauthenticated recipe requests are redirected to sign-in", () => {
  assert.throws(
    () =>
      ensureAuthenticatedUser(null, () => {
        throw new Error("redirect:/sign-in");
      }),
    /redirect:\/sign-in/,
  );
  assert.deepEqual(
    ensureAuthenticatedUser({ id: "owner" }, () => {
      throw new Error("unreachable");
    }),
    { id: "owner" },
  );
});

test("every signed-in Clerk user receives an authenticated application identity", () => {
  assert.deepEqual(
    ensureAuthenticatedUser({ id: "user_one" }, () => {
      throw new Error("unreachable");
    }),
    { id: "user_one" },
  );
  assert.deepEqual(
    ensureAuthenticatedUser({ id: "user_two" }, () => {
      throw new Error("unreachable");
    }),
    { id: "user_two" },
  );
});

test("recipe form validation retains the shared schema rules", () => {
  const missingTitle = validForm();
  missingTitle.set("title", "");
  assert.throws(() => parseRecipeFormData(missingTitle));
  const invalidUpdate = validForm();
  invalidUpdate.set("ingredient-0-quantity", "-1");
  assert.throws(() => parseRecipeFormData(invalidUpdate));
});

test("recipe service scopes create, edit, and delete commands to the current owner", async () => {
  const calls: Array<[string, string]> = [];
  const repository = {
    get: async () => ({
      id: "recipe",
      ownerId: "owner-a",
      title: "Toast",
      tags: [],
      dietaryFlags: [],
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
  return [{ displayOrder: 1, quantity: 2, unit: "slices", ingredientName: "bread" }];
}
function inputSteps() {
  return [{ stepOrder: 1, instruction: "Toast the bread." }];
}

test("recipe list queries are constrained to the current owner before RLS is applied", async () => {
  const filters: string[][] = [];
  const query = {
    select: () => query,
    eq: (column: string, value: string) => {
      filters.push([column, value]);
      return query;
    },
    order: () => ({
      then: (resolve: (value: { data: unknown[]; error: null }) => void) =>
        resolve({ data: [], error: null }),
    }),
    ilike: () => query,
    contains: () => query,
  };
  const repository = new RecipeRepository({ from: () => query } as never);
  await repository.list("owner-a");
  assert.deepEqual(filters, [["owner_id", "owner-a"]]);
});

test("delete action requires an explicit confirmation", async () => {
  const form = new FormData();
  form.set("recipeId", "recipe");
  const result = await deleteRecipeAction(emptyRecipeFormState, form);
  assert.equal(result.errors.confirmDelete, "Confirm deletion before continuing.");
});

test("the application has no registration route or registration UI", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  assert.equal(existsSync(new URL("../src/app/sign-up", import.meta.url)), false);
  assert.doesNotMatch(
    readFileSync(new URL("../src/app/sign-in/[[...sign-in]]/page.tsx", import.meta.url), "utf8"),
    /signUp|register|invitation/i,
  );
});

test("the sign-in route accepts Clerk's nested authentication steps", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  const signInPage = new URL("../src/app/sign-in/[[...sign-in]]/page.tsx", import.meta.url);
  assert.equal(existsSync(signInPage), true);
  assert.match(readFileSync(signInPage, "utf8"), /<SignIn /);
});

test("the private user-profile route remains available separately from MCP key management", async () => {
  const { existsSync, readFileSync } = await import("node:fs");
  const profilePage = new URL(
    "../src/app/(private)/user-profile/[[...user-profile]]/page.tsx",
    import.meta.url,
  );
  assert.equal(existsSync(profilePage), true);
  const page = readFileSync(profilePage, "utf8");
  assert.match(page, /<UserProfile /);
  assert.match(page, /requireUser\(\)/);
  assert.doesNotMatch(page, /MCP keys/);
});
