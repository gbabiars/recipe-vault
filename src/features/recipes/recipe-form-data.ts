import { recipeCreateInputSchema, type RecipeCreateInput } from "@/lib/validation/recipe";

const optional = (value: FormDataEntryValue | null) => {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
};
const number = (value: FormDataEntryValue | null) => {
  const text = optional(value);
  return text === undefined ? undefined : Number(text);
};
const labels = (value: FormDataEntryValue | null) => (optional(value)?.split(",").map((label) => label.trim()).filter(Boolean) ?? []);

/** Converts browser FormData into the shared Iteration 1 create wire format. */
export function parseRecipeFormData(formData: FormData): RecipeCreateInput {
  const rowCount = Number(formData.get("ingredientCount"));
  const stepCount = Number(formData.get("stepCount"));
  const candidate = {
    title: optional(formData.get("title")), summary: optional(formData.get("summary")),
    prepTimeMinutes: number(formData.get("prepTimeMinutes")), cookTimeMinutes: number(formData.get("cookTimeMinutes")),
    totalTimeMinutes: number(formData.get("totalTimeMinutes")), servings: number(formData.get("servings")),
    tags: labels(formData.get("tags")), dietaryFlags: labels(formData.get("dietaryFlags")),
    sourceUrl: optional(formData.get("sourceUrl")), notes: optional(formData.get("notes")),
    ingredients: Array.from({ length: Number.isInteger(rowCount) && rowCount > 0 ? rowCount : 0 }, (_, index) => ({
      displayOrder: index + 1, quantity: number(formData.get(`ingredient-${index}-quantity`)),
      unit: optional(formData.get(`ingredient-${index}-unit`)), ingredientName: optional(formData.get(`ingredient-${index}-name`)),
      notes: optional(formData.get(`ingredient-${index}-notes`)),
    })),
    steps: Array.from({ length: Number.isInteger(stepCount) && stepCount > 0 ? stepCount : 0 }, (_, index) => ({
      stepOrder: index + 1, instruction: optional(formData.get(`step-${index}-instruction`)),
      durationMinutes: number(formData.get(`step-${index}-durationMinutes`)),
    })),
  };
  return recipeCreateInputSchema.parse(candidate);
}

export function formOptional(value: FormDataEntryValue | null) { return optional(value); }
