import { z } from "zod";

export const recipeSearchRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).max(200),
  })
  .strict();

export const recipeSearchParseSchema = z
  .object({
    matchAny: z.array(z.string().trim().min(1).max(32)).max(5),
  })
  .strict();

export type RecipeSearchParse = z.output<typeof recipeSearchParseSchema>;
