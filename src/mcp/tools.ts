import { createHash } from "node:crypto";
import { z } from "zod";
import type { RecipeDocumentContent } from "@/lib/validation/recipe-document";
import type { DocumentTagInventoryItem } from "@/lib/db/tag-repository";
import type { OwnerBoundTagService } from "@/lib/recipes/tag-service";
import type { OwnerBoundRecipeService } from "@/lib/recipes/recipe-service";
import {
  recipeDocumentContentSchema,
  recipeDocumentSchema,
} from "@/lib/validation/recipe-document";
import { tagNameSchema } from "@/lib/validation/recipe";
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
const recipeIdInputSchema = z.object({ recipeId: z.uuid() }).strict();
const tagListInputSchema = z
  .object({
    search: z.string().trim().max(200).optional(),
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
// A wire schema cannot expose Zod's normalization transform to MCP JSON Schema.
// Accept the shared schema's alphabet here, then normalize with tagNameSchema.
const tagNameInput = z
  .string()
  .regex(/^\s*[a-z0-9][a-z0-9 _-]*\s*$/iu)
  .max(256);
const tagNameCanonical = z
  .string()
  .regex(/^[a-z0-9][a-z0-9 _-]*$/u)
  .max(64);
const replaceTagInputSchema = z
  .object({ sourceName: tagNameInput, targetName: tagNameInput })
  .strict();
const tagCursorSchema = z
  .object({
    version: z.literal(1),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/u),
    name: z.string().min(1).max(64),
    usageCount: z.number().int().positive().optional(),
  })
  .strict();

const tagNamesInputSchema = z.array(tagNameInput).max(32);
const tagNamesOutputSchema = z.array(tagNameCanonical).max(32);
const mcpDocumentInputSchema = recipeDocumentSchema.safeExtend({ tags: tagNamesInputSchema });
const mcpContentSchema = recipeDocumentContentSchema.safeExtend({ tags: tagNamesInputSchema });
const mcpDocumentOutputSchema = recipeDocumentSchema.safeExtend({ tags: tagNamesOutputSchema });
const replaceInputSchema = z
  .object({ recipe: mcpDocumentInputSchema, expectedRevision: z.number().int().positive() })
  .strict();
const listSummarySchema = mcpDocumentOutputSchema
  .pick({ id: true, title: true, description: true, yield: true, time: true, tags: true })
  .extend({ revision: z.number().int().positive() })
  .strict();
export const mcpSearchRecipesOutputSchema = z
  .object({ recipes: z.array(listSummarySchema) })
  .strict();
export const mcpGetRecipeOutputSchema = z
  .object({ recipe: mcpDocumentOutputSchema, revision: z.number().int().positive() })
  .strict();

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
  query: { search?: string; sort: string; limit: number },
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        version: 1,
        ownerId: userId,
        search: query.search ?? "",
        sort: query.sort,
        limit: query.limit,
      }),
    )
    .digest("hex");
}

function decodeCursor(
  cursor: string,
  fingerprint: string,
): { name: string; usageCount?: number } | null {
  try {
    const parsed = tagCursorSchema.safeParse(
      JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")),
    );
    if (!parsed.success || parsed.data.fingerprint !== fingerprint) return null;
    return {
      name: parsed.data.name,
      ...(parsed.data.usageCount === undefined ? {} : { usageCount: parsed.data.usageCount }),
    };
  } catch {
    return null;
  }
}

function encodeCursor(fingerprint: string, tag: DocumentTagInventoryItem, sort: string) {
  return Buffer.from(
    JSON.stringify({
      version: 1,
      fingerprint,
      name: tag.name,
      ...(sort === "name_asc" ? {} : { usageCount: tag.usageCount }),
    }),
    "utf8",
  ).toString("base64url");
}

/** MCP exposes only document-derived tag names; owner identity comes from verified auth. */
export function createTagMcpTools(context: McpTagToolContext) {
  return {
    list_tags: async (raw: unknown) => {
      const parsed = tagListInputSchema.safeParse(raw);
      if (!parsed.success) return text({ error: "Invalid tag list input." }, true);
      if (!allowed(context, false).allowed) return text({ error: "Rate limit exceeded." }, true);
      const { search, sort, limit, cursor } = parsed.data;
      const fingerprint = cursorFingerprint(context.userId, { search, sort, limit });
      const after = cursor ? decodeCursor(cursor, fingerprint) : undefined;
      if (cursor && !after)
        return text({ error: "Invalid tag cursor. Start a new tag listing." }, true);
      if (after && (sort === "name_asc") === (after.usageCount !== undefined))
        return text({ error: "Invalid tag cursor. Start a new tag listing." }, true);
      try {
        const page = await context.service.listFromRecipes({
          search: search || undefined,
          sort,
          limit,
          after: after ?? undefined,
        });
        const last = page.tags.at(-1);
        return text({
          tags: page.tags,
          ...(page.hasMore && last ? { nextCursor: encodeCursor(fingerprint, last, sort) } : {}),
        });
      } catch {
        return text({ error: "Unable to load tags." }, true);
      }
    },
    replace_tag_name: async (raw: unknown) => {
      const parsed = replaceTagInputSchema.safeParse(raw);
      if (!parsed.success) return text({ error: "Invalid tag replacement input." }, true);
      if (!allowed(context, true).allowed) return text({ error: "Rate limit exceeded." }, true);
      try {
        const sourceName = tagNameSchema.parse(parsed.data.sourceName);
        const targetName = tagNameSchema.parse(parsed.data.targetName);
        const result = await context.service.replaceNameInRecipes({ sourceName, targetName });
        if (result.status === "source_missing")
          return text({ replaced: false, message: "Source tag was not found." }, true);
        return text({
          replaced: true,
          sourceName,
          targetName,
          changedRecipes: result.changedRecipes,
        });
      } catch {
        return text({ error: "Unable to replace tag name." }, true);
      }
    },
  };
}

/** Recipe methods are bound to an owner selected by verified MCP authentication. */
export function createRecipeMcpTools(context: McpToolContext) {
  return {
    search_recipes: async (raw: unknown) => {
      const parsed = searchInputSchema.safeParse(raw);
      if (!parsed.success) return text({ error: "Invalid search input." }, true);
      if (!allowed(context, false).allowed) return text({ error: "Rate limit exceeded." }, true);
      try {
        const page = await context.service.listDocumentPage({
          search: parsed.data.query,
          tags: parsed.data.tags.map((tag) => tagNameSchema.parse(tag)),
          page: 1,
          pageSize: parsed.data.limit,
        });
        const output = mcpSearchRecipesOutputSchema.parse({
          recipes: page.items.map(
            ({ id, title, description, yield: recipeYield, time, tags, revision }) => ({
              id,
              title,
              description,
              ...(recipeYield ? { yield: recipeYield } : {}),
              time,
              tags,
              revision,
            }),
          ),
        });
        return { ...text(output), structuredContent: output };
      } catch {
        return text({ error: "Unable to search recipes." }, true);
      }
    },
    get_recipe: async (raw: unknown) => {
      const parsed = recipeIdInputSchema.safeParse(raw);
      if (!parsed.success) return text({ error: "Recipe not found." }, true);
      if (!allowed(context, false).allowed) return text({ error: "Rate limit exceeded." }, true);
      try {
        const snapshot = await context.service.getDocument(parsed.data.recipeId);
        if (!snapshot) return text({ error: "Recipe not found." }, true);
        const output = mcpGetRecipeOutputSchema.parse(snapshot);
        return { ...text(output), structuredContent: output };
      } catch {
        return text({ error: "Unable to load recipe." }, true);
      }
    },
    save_recipe: async (raw: unknown) => {
      const parsed = recipeDocumentContentSchema.safeParse(raw);
      if (!parsed.success) return text({ error: "Recipe validation failed." }, true);
      if (!allowed(context, true).allowed) return text({ error: "Rate limit exceeded." }, true);
      try {
        const result = await context.service.createDocument(parsed.data as RecipeDocumentContent, {
          requestId: context.requestId,
          method: "MCP save_recipe",
        });
        if (result.status !== "saved")
          return text(
            {
              error:
                result.status === "invalid"
                  ? "Recipe validation failed."
                  : "Unable to save recipe.",
            },
            true,
          );
        return text({
          recipeId: result.recipe.id,
          revision: result.revision,
          message: "Recipe saved.",
        });
      } catch {
        return text({ error: "Unable to save recipe." }, true);
      }
    },
    replace_recipe: async (raw: unknown) => {
      const parsed = replaceInputSchema.safeParse(raw);
      if (!parsed.success) return text({ error: "Recipe validation failed." }, true);
      if (!allowed(context, true).allowed) return text({ error: "Rate limit exceeded." }, true);
      try {
        const result = await context.service.replaceDocument(
          parsed.data.recipe,
          parsed.data.expectedRevision,
          { requestId: context.requestId, method: "MCP replace_recipe" },
        );
        if (result.status === "saved")
          return text({
            recipeId: result.recipe.id,
            revision: result.revision,
            message: "Recipe replaced.",
          });
        if (result.status === "conflict")
          return text(
            { error: "Recipe changed since it was read.", revision: result.revision },
            true,
          );
        return text({ error: "Recipe not found or invalid." }, true);
      } catch {
        return text({ error: "Unable to replace recipe." }, true);
      }
    },
  };
}

export const mcpToolSchemas = {
  search: searchInputSchema,
  recipeId: recipeIdInputSchema,
  recipe: mcpContentSchema,
  replaceRecipe: replaceInputSchema,
  tags: tagListInputSchema,
  replaceTagName: replaceTagInputSchema,
};
