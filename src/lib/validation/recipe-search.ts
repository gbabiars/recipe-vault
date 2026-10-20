import { z } from "zod";

export const recipeSearchRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).max(200),
  })
  .strict();

export const recipeSearchParseSchema = z
  .object({
    matchAny: z.array(z.string().trim().min(1).max(32)).max(5),
    preferences: z
      .array(z.enum(["easy", "quick"]))
      .max(2)
      .refine((preferences) => new Set(preferences).size === preferences.length),
  })
  .strict();

export type RecipeSearchPreference = "easy" | "quick" | "easy-quick" | "quick-easy";
export type RecipeSearchParse = z.output<typeof recipeSearchParseSchema>;
