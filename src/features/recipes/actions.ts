"use server";

import { redirect } from "next/navigation";
import type { RecipeCreateInput } from "@/lib/validation/recipe";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import { formOptional, parseRecipeFormData } from "./recipe-form-data";

export type RecipeFormState = { errors: Record<string, string>; message?: string };
export const emptyRecipeFormState: RecipeFormState = { errors: {} };

function validationState(error: unknown): RecipeFormState {
  if (!(error instanceof Error) || !("issues" in error)) return { errors: {}, message: "Unable to save this recipe. Please try again." };
  const issues = (error as { issues: Array<{ path: PropertyKey[]; message: string }> }).issues;
  return { errors: Object.fromEntries(issues.map((issue) => [issue.path.join("."), issue.message])), message: "Please correct the highlighted fields." };
}

export async function saveRecipeAction(_: RecipeFormState, formData: FormData): Promise<RecipeFormState> {
  const user = await requireUser();
  let input: RecipeCreateInput;
  try { input = parseRecipeFormData(formData); } catch (error) { return validationState(error); }
  try {
    const service = await getRecipeService();
    const recipeId = formOptional(formData.get("recipeId"));
    if (recipeId) await service.update(user.id, recipeId, input);
    else await service.create(user.id, input);
  } catch {
    return { errors: {}, message: "Unable to save this recipe. Please try again." };
  }
  redirect("/recipes");
}

export async function deleteRecipeAction(_: RecipeFormState, formData: FormData): Promise<RecipeFormState> {
  if (formData.get("confirmDelete") !== "delete") return { errors: { confirmDelete: "Confirm deletion before continuing." } };
  const user = await requireUser();
  try {
    const recipeId = formOptional(formData.get("recipeId"));
    if (!recipeId) return { errors: {}, message: "Recipe not found." };
    await (await getRecipeService()).delete(user.id, recipeId);
  } catch {
    return { errors: {}, message: "Unable to delete this recipe. Please try again." };
  }
  redirect("/recipes");
}
