import type { LegacyRecipe } from "@/lib/db/recipe-repository";
import {
  recipeDocumentSchema,
  type Recipe as ValidatedRecipe,
} from "@/lib/validation/recipe-document";

/** Converts the current relational read model to the agreed recipe document. */
export function convertLegacyRecipeToDocument(recipe: LegacyRecipe): ValidatedRecipe {
  if (recipe.servings !== undefined && recipe.servings <= 0) {
    throw new Error("Cannot convert a recipe with nonpositive legacy servings.");
  }

  const ingredients = [...recipe.ingredients]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map(({ ingredientName, amount, notes }) => ({
      name: ingredientName,
      ...(amount === undefined ? {} : { amount }),
      ...(notes === undefined ? {} : { note: notes }),
    }));

  const instructions = [...recipe.steps]
    .sort((left, right) => left.stepOrder - right.stepOrder)
    .map(({ instruction, durationMinutes }) =>
      durationMinutes === undefined
        ? instruction
        : `${instruction} (Duration: ${durationMinutes} minutes)`,
    );

  const document = {
    id: recipe.id,
    title: recipe.title,
    description: recipe.summary ?? "",
    ...(recipe.servings === undefined
      ? {}
      : { yield: { amount: recipe.servings, unit: "servings" } }),
    time: {
      ...(recipe.prepTimeMinutes === undefined ? {} : { prepMinutes: recipe.prepTimeMinutes }),
      ...(recipe.cookTimeMinutes === undefined ? {} : { cookMinutes: recipe.cookTimeMinutes }),
      ...(recipe.totalTimeMinutes === undefined ? {} : { totalMinutes: recipe.totalTimeMinutes }),
    },
    ingredients,
    equipment: [],
    instructions,
    notes: recipe.notes === undefined ? [] : [recipe.notes],
    tags: [...recipe.tags],
    ...(recipe.sourceUrl === undefined ? {} : { sourceUrl: recipe.sourceUrl }),
  };

  return recipeDocumentSchema.parse(document);
}
