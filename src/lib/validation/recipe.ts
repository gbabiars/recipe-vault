import { z } from "zod";
import { tagNameSchema } from "./tag";

const optionalText = (maxLength: number) => z.string().trim().min(1).max(maxLength).optional();
const maxInstructionLength = 5_000 + " (Duration: 2147483647 minutes)".length;

const recipeDocumentIngredientSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    amount: optionalText(128),
    note: optionalText(1_000),
  })
  .strict();

const recipeDocumentEquipmentSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    note: optionalText(1_000),
  })
  .strict();

const recipeDocumentTimeSchema = z
  .object({
    prepMinutes: z.number().int().nonnegative().optional(),
    cookMinutes: z.number().int().nonnegative().optional(),
    totalMinutes: z.number().int().nonnegative().optional(),
  })
  .strict();

const recipeDocumentYieldSchema = z
  .object({
    amount: z.number().positive(),
    unit: z.string().trim().min(1).max(64),
  })
  .strict();

export const recipeSchema = z
  .object({
    id: z.uuid(),
    title: z.string().trim().min(1).max(200),
    description: z.string().max(2_000),
    yield: recipeDocumentYieldSchema.optional(),
    time: recipeDocumentTimeSchema,
    ingredients: z.array(recipeDocumentIngredientSchema).min(1),
    equipment: z.array(recipeDocumentEquipmentSchema),
    instructions: z.array(z.string().trim().min(1).max(maxInstructionLength)).min(1),
    notes: z.array(z.string().trim().min(1).max(10_000)),
    tags: z
      .array(tagNameSchema)
      .max(32)
      .transform((tags) => [...new Set(tags)]),
    sourceUrl: z
      .string()
      .url()
      .max(2_000)
      .regex(/^https?:\/\/\S+$/i, "Use an HTTP(S) URL.")
      .optional(),
  })
  .strict();

export type Recipe = z.output<typeof recipeSchema>;

export const recipeContentSchema = recipeSchema.omit({ id: true }).strict();

export type RecipeContent = z.output<typeof recipeContentSchema>;
