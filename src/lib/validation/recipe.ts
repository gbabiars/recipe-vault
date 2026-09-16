import { z } from "zod";

const labelSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9][a-z0-9 _-]*$/i, "Use letters, numbers, spaces, underscores, or hyphens.");

const labelsSchema = z.array(labelSchema).max(32).transform((labels) => {
  return [...new Set(labels.map((label) => label.toLowerCase()))];
});

const optionalText = (maxLength: number) => z.string().trim().min(1).max(maxLength).optional();

export const recipeIngredientInputSchema = z
  .object({
    displayOrder: z.number().int().positive(),
    quantity: z.number().finite().nonnegative(),
    unit: z.string().trim().min(1).max(32),
    ingredientName: z.string().trim().min(1).max(200),
    notes: optionalText(1_000),
  })
  .strict();

export const recipeStepInputSchema = z
  .object({
    stepOrder: z.number().int().positive(),
    instruction: z.string().trim().min(1).max(5_000),
    durationMinutes: z.number().int().nonnegative().optional(),
  })
  .strict();

const recipeFieldsSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    summary: optionalText(2_000),
    prepTimeMinutes: z.number().int().nonnegative().optional(),
    cookTimeMinutes: z.number().int().nonnegative().optional(),
    totalTimeMinutes: z.number().int().nonnegative().optional(),
    servings: z.number().int().positive().optional(),
    tags: labelsSchema.default([]),
    dietaryFlags: labelsSchema.default([]),
    sourceUrl: z.string().url().max(2_000).regex(/^https?:\/\/\S+$/i, "Use an HTTP(S) URL.").optional(),
    notes: optionalText(10_000),
  })
  .strict();

export const recipeCreateInputSchema = recipeFieldsSchema
  .extend({
    ingredients: z.array(recipeIngredientInputSchema).min(1),
    steps: z.array(recipeStepInputSchema).min(1),
  })
  .superRefine((recipe, context) => {
    if (
      recipe.totalTimeMinutes !== undefined &&
      recipe.prepTimeMinutes !== undefined &&
      recipe.cookTimeMinutes !== undefined &&
      recipe.totalTimeMinutes < recipe.prepTimeMinutes + recipe.cookTimeMinutes
    ) {
      context.addIssue({
        code: "custom",
        path: ["totalTimeMinutes"],
        message: "Total time must be at least prep time plus cook time.",
      });
    }

    for (const [field, values] of [
      ["ingredients", recipe.ingredients.map((ingredient) => ingredient.displayOrder)],
      ["steps", recipe.steps.map((step) => step.stepOrder)],
    ] as const) {
      if (new Set(values).size !== values.length) {
        context.addIssue({ code: "custom", path: [field], message: "Display order values must be unique." });
      }
    }
  });

// Defaults are intentionally omitted in patches: `{}` must not turn into a request to
// replace tags and dietary flags with empty arrays.
const recipeUpdateFieldsSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    summary: optionalText(2_000),
    prepTimeMinutes: z.number().int().nonnegative().optional(),
    cookTimeMinutes: z.number().int().nonnegative().optional(),
    totalTimeMinutes: z.number().int().nonnegative().optional(),
    servings: z.number().int().positive().optional(),
    tags: labelsSchema.optional(),
    dietaryFlags: labelsSchema.optional(),
    sourceUrl: z.string().url().max(2_000).regex(/^https?:\/\/\S+$/i, "Use an HTTP(S) URL.").optional(),
    notes: optionalText(10_000),
  })
  .strict();

// Update payloads are patches. The database remains the final guard for combinations
// of timing fields when a patch contains only one of them.
export const recipeUpdateInputSchema = recipeUpdateFieldsSchema
  .extend({
    ingredients: z.array(recipeIngredientInputSchema).min(1).optional(),
    steps: z.array(recipeStepInputSchema).min(1).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, "Provide at least one field to update.");

export type RecipeCreateInput = z.output<typeof recipeCreateInputSchema>;
export type RecipeUpdateInput = z.output<typeof recipeUpdateInputSchema>;
