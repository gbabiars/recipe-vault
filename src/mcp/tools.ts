import { createHash } from "node:crypto";
import { z } from "zod";
import type { Recipe } from "@/lib/db/recipe-repository";
import type { OwnerBoundTagService } from "@/lib/recipes/tag-service";
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

export type McpTagToolContext = {
  userId: string;
  service: OwnerBoundTagService;
  limiter?: RateLimiter;
};

const searchInputSchema = z
  .object({
    query: z.string().trim().min(1).max(200).optional(),
    tags: z.array(z.string().trim().min(1).max(64)).max(32).default([]),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .strict();

const recipeIdInputSchema = z.object({ recipeId: z.string().uuid() }).strict();

const tagListInputSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    usage: z.enum(["all", "used", "unused"]).default("all"),
    sort: z.enum(["name_asc", "usage_desc", "usage_asc"]).default("name_asc"),
    limit: z.number().int().min(1).max(100).default(50),
    cursor: z
      .string()
      .min(1)
      .max(1024)
      .regex(/^[A-Za-z0-9_-]+$/u)
      .optional(),
  })
  .strict();

const tagCursorSchema = z
  .object({
    version: z.literal(1),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
    usageCount: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER),
    name: z.string().min(1).max(64),
    id: z.string().uuid(),
  })
  .strict();

const recipeDisplaySchema = z
  .object({
    title: z.string(),
    summary: z.string().optional(),
    prepTimeMinutes: z.number().int().nonnegative().optional(),
    cookTimeMinutes: z.number().int().nonnegative().optional(),
    totalTimeMinutes: z.number().int().nonnegative().optional(),
    servings: z.number().int().positive().optional(),
    tags: z.array(z.string()),
    ingredients: z.array(
      z
        .object({
          quantity: z.number().finite().nonnegative(),
          unit: z.string(),
          ingredientName: z.string(),
          notes: z.string().optional(),
        })
        .strict(),
    ),
    steps: z.array(
      z
        .object({
          instruction: z.string(),
          durationMinutes: z.number().int().nonnegative().optional(),
        })
        .strict(),
    ),
    notes: z.string().optional(),
    sourceUrl: z.string().url().optional(),
  })
  .strict();

export const mcpGetRecipeOutputSchema = z.object({ recipe: recipeDisplaySchema }).strict();

function displayRecipe(recipe: Recipe) {
  return mcpGetRecipeOutputSchema.parse({
    recipe: {
      title: recipe.title,
      ...(recipe.summary !== undefined ? { summary: recipe.summary } : {}),
      ...(recipe.prepTimeMinutes !== undefined ? { prepTimeMinutes: recipe.prepTimeMinutes } : {}),
      ...(recipe.cookTimeMinutes !== undefined ? { cookTimeMinutes: recipe.cookTimeMinutes } : {}),
      ...(recipe.totalTimeMinutes !== undefined
        ? { totalTimeMinutes: recipe.totalTimeMinutes }
        : {}),
      ...(recipe.servings !== undefined ? { servings: recipe.servings } : {}),
      tags: recipe.tags,
      ingredients: recipe.ingredients.map(({ quantity, unit, ingredientName, notes }) => ({
        quantity,
        unit,
        ingredientName,
        ...(notes !== undefined ? { notes } : {}),
      })),
      steps: recipe.steps.map(({ instruction, durationMinutes }) => ({
        instruction,
        ...(durationMinutes !== undefined ? { durationMinutes } : {}),
      })),
      ...(recipe.notes !== undefined ? { notes: recipe.notes } : {}),
      ...(recipe.sourceUrl !== undefined ? { sourceUrl: recipe.sourceUrl } : {}),
    },
  });
}

function text(value: unknown, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(value) }], isError };
}

function allowed(context: { userId: string; limiter?: RateLimiter }, write: boolean) {
  return (context.limiter ?? defaultRateLimiter).check(
    `${context.userId}:mcp:${write ? "write" : "read"}`,
    write ? recipeWriteLimit : recipeReadLimit,
  );
}

function cursorFingerprint(
  userId: string,
  query: { search?: string; usage: string; sort: string; limit: number },
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        version: 1,
        ownerId: userId,
        search: query.search ?? "",
        usage: query.usage,
        sort: query.sort,
        limit: query.limit,
      }),
    )
    .digest("hex");
}

function decodeTagCursor(
  cursor: string,
  fingerprint: string,
): { usageCount: number; name: string; id: string } | null {
  try {
    const json = Buffer.from(cursor, "base64url");
    if (json.toString("base64url") !== cursor) return null;
    const parsed = tagCursorSchema.safeParse(JSON.parse(json.toString("utf8")));
    if (!parsed.success || parsed.data.fingerprint !== fingerprint) return null;
    return {
      usageCount: parsed.data.usageCount,
      name: parsed.data.name,
      id: parsed.data.id,
    };
  } catch {
    return null;
  }
}

function encodeTagCursor(
  fingerprint: string,
  tag: { usageCount: number; name: string; id: string },
) {
  return Buffer.from(JSON.stringify({ version: 1, fingerprint, ...tag }), "utf8").toString(
    "base64url",
  );
}

/** The tag adapter has no owner parameter; identity comes from verified MCP auth. */
export function createTagMcpTools(context: McpTagToolContext) {
  return {
    list_tags: async (raw: unknown) => {
      const parsed = tagListInputSchema.safeParse(raw);
      if (!parsed.success) return text({ error: "Invalid tag list input." }, true);

      const { search, usage, sort, limit, cursor } = parsed.data;
      const fingerprint = cursorFingerprint(context.userId, { search, usage, sort, limit });
      const cursorPosition = cursor ? decodeTagCursor(cursor, fingerprint) : undefined;
      if (cursor && cursorPosition === null)
        return text({ error: "Invalid tag cursor. Start a new tag listing." }, true);
      const after = cursorPosition ?? undefined;
      if (!allowed(context, false).allowed) return text({ error: "Rate limit exceeded." }, true);

      try {
        const page = await context.service.list({
          search: search || undefined,
          usage,
          sort,
          limit,
          after,
        });
        const lastTag = page.tags.at(-1);
        const nextCursor =
          page.hasMore && lastTag ? encodeTagCursor(fingerprint, lastTag) : undefined;
        return text({
          tags: page.tags,
          ...(nextCursor ? { nextCursor } : {}),
        });
      } catch {
        return text({ error: "Unable to load tags." }, true);
      }
    },
  };
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
        return {
          ...text({ recipe }),
          structuredContent: displayRecipe(recipe),
        };
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
  tags: tagListInputSchema,
};
