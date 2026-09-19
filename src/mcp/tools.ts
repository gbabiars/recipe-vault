import { z } from "zod";
import type { OwnerBoundRecipeService } from "@/lib/recipes/recipe-service";
import { recipeCreateInputSchema } from "@/lib/validation/recipe";
import {
  defaultRateLimiter,
  type RateLimiter,
  recipeReadLimit,
  recipeWriteLimit,
} from "@/lib/api/rate-limit";

export type McpToolContext = {
  userId: string;
  service: OwnerBoundRecipeService;
  requestId: string;
  limiter?: RateLimiter;
};

const searchInputSchema = z
  .object({
    query: z.string().trim().min(1).max(200).optional(),
    tags: z.array(z.string().trim().min(1).max(64)).max(32).default([]),
    dietaryFlags: z.array(z.string().trim().min(1).max(64)).max(32).default([]),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .strict();

const recipeIdInputSchema = z.object({ recipeId: z.string().uuid() }).strict();

function text(value: unknown, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }], isError };
}

function allowed(context: McpToolContext, write: boolean) {
  return (context.limiter ?? defaultRateLimiter).check(
    `${context.userId}:mcp:${write ? "write" : "read"}`,
    write ? recipeWriteLimit : recipeReadLimit,
  );
}

/**
 * The tool adapter stays independent of HTTP and receives only a verified user
 * context. The owner-bound service ensures the service-role MCP adapter cannot
 * select a tenant from model-controlled tool input.
 */
export function createRecipeMcpTools(context: McpToolContext) {
  return {
    search_recipes: async (raw: unknown) => {
      const parsed = searchInputSchema.safeParse(raw);
      if (!parsed.success) return text({ error: "Invalid search input." }, true);
      if (!allowed(context, false).allowed) return text({ error: "Rate limit exceeded." }, true);
      try {
        const results = await context.service.listPage({
          search: parsed.data.query,
          tags: parsed.data.tags.map((tag) => tag.toLowerCase()),
          dietaryFlags: parsed.data.dietaryFlags.map((flag) => flag.toLowerCase()),
          page: 1,
          pageSize: parsed.data.limit,
        });
        return text({
          recipes: results.items.map((recipe) => ({
            id: recipe.id,
            title: recipe.title,
            ...(recipe.summary ? { summary: recipe.summary } : {}),
            ...(recipe.prepTimeMinutes !== undefined
              ? { prepTimeMinutes: recipe.prepTimeMinutes }
              : {}),
            ...(recipe.cookTimeMinutes !== undefined
              ? { cookTimeMinutes: recipe.cookTimeMinutes }
              : {}),
            ...(recipe.totalTimeMinutes !== undefined
              ? { totalTimeMinutes: recipe.totalTimeMinutes }
              : {}),
            ...(recipe.servings !== undefined ? { servings: recipe.servings } : {}),
            tags: recipe.tags,
          })),
        });
      } catch {
        return text({ error: "Unable to search recipes." }, true);
      }
    },
    get_recipe: async (raw: unknown) => {
      const parsed = recipeIdInputSchema.safeParse(raw);
      if (!parsed.success) return text({ error: "Recipe not found." }, true);
      if (!allowed(context, false).allowed) return text({ error: "Rate limit exceeded." }, true);
      try {
        const recipe = await context.service.get(parsed.data.recipeId);
        if (!recipe) return text({ error: "Recipe not found." }, true);
        return text({ recipe });
      } catch {
        return text({ error: "Unable to load recipe." }, true);
      }
    },
    save_recipe: async (raw: unknown) => {
      const parsed = recipeCreateInputSchema.safeParse(raw);
      if (!parsed.success) return text({ error: "Recipe validation failed." }, true);
      if (!allowed(context, true).allowed) return text({ error: "Rate limit exceeded." }, true);
      try {
        const recipe = await context.service.create(parsed.data, {
          requestId: context.requestId,
          method: "MCP save_recipe",
        });
        return text({ recipeId: recipe.id, message: "Recipe saved." });
      } catch {
        return text({ error: "Unable to save recipe." }, true);
      }
    },
  };
}

export const mcpToolSchemas = {
  search: searchInputSchema,
  recipeId: recipeIdInputSchema,
  recipe: recipeCreateInputSchema,
};
