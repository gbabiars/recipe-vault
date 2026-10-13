import { recipeDocumentSchema, type Recipe } from "@/lib/validation/recipe-document";

export type RecipeViewState =
  | { state: "loading" }
  | { state: "error" }
  | { state: "recipe"; recipe: Recipe };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function getRecipeViewState(structuredContent: unknown, isError = false): RecipeViewState {
  if (
    isError ||
    !isRecord(structuredContent) ||
    Object.keys(structuredContent).some((key) => key !== "recipe" && key !== "revision") ||
    typeof structuredContent.revision !== "number" ||
    !Number.isInteger(structuredContent.revision) ||
    structuredContent.revision < 1
  ) {
    return { state: "error" };
  }

  const recipe = recipeDocumentSchema.safeParse(structuredContent.recipe);
  return recipe.success ? { state: "recipe", recipe: recipe.data } : { state: "error" };
}
