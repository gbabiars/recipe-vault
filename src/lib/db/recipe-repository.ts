import type { SupabaseClient } from "@supabase/supabase-js";
import {
  recipeContentSchema,
  recipeSchema,
  type Recipe as ValidatedRecipe,
  type RecipeContent,
} from "@/lib/validation/recipe";

export type AuditMetadata = { requestId: string; method: string };
export type RecipeDocumentSnapshot = { recipe: ValidatedRecipe; revision: number };
export type RecipeDocumentListSummary = Pick<
  ValidatedRecipe,
  "id" | "title" | "description" | "yield" | "time" | "tags"
> & { revision: number; createdAt: string; updatedAt: string };
export type RecipeDocumentPage = { items: RecipeDocumentListSummary[]; total: number };
export type RecipeDocumentWriteResult =
  | ({ status: "saved" } & RecipeDocumentSnapshot)
  | { status: "conflict"; revision?: number }
  | { status: "not_found" }
  | { status: "invalid" };
export type RecipeDocumentDeleteResult =
  | { status: "deleted"; recipeId: string; revision: number }
  | { status: "conflict"; revision: number }
  | { status: "not_found" }
  | { status: "invalid" };

type DatabaseRecipeRow = {
  id: string;
  revision: number;
  title: unknown;
  description: unknown;
  source_url: unknown;
  prep_minutes: unknown;
  cook_minutes: unknown;
  total_minutes: unknown;
  yield_amount: unknown;
  yield_unit: unknown;
  tags: unknown;
  notes: unknown;
  instructions: unknown;
  ingredients: unknown;
  equipment: unknown;
};

type DatabaseRecipeDocumentSummary = {
  id: string;
  document: unknown;
  revision: number;
  created_at: string;
  updated_at: string;
};

type RecipeDocumentSearchRpcResult = {
  items: unknown;
  total: unknown;
};

type RecipeDocumentWriteRpcResult = {
  status: RecipeDocumentWriteResult["status"];
  recipe_id: string | null;
  revision: number | null;
  document: unknown | null;
};

function mapRecipeDocument(row: DatabaseRecipeRow): RecipeDocumentSnapshot {
  if (!Number.isSafeInteger(row.revision) || row.revision < 1 || row.revision > 2_147_483_647) {
    throw new Error("Could not load this recipe.");
  }
  const time = {
    ...(row.prep_minutes === null ? {} : { prepMinutes: row.prep_minutes }),
    ...(row.cook_minutes === null ? {} : { cookMinutes: row.cook_minutes }),
    ...(row.total_minutes === null ? {} : { totalMinutes: row.total_minutes }),
  };
  const content = recipeContentSchema.parse({
    title: row.title,
    description: row.description,
    ...(row.yield_amount === null && row.yield_unit === null
      ? {}
      : { yield: { amount: row.yield_amount, unit: row.yield_unit } }),
    time,
    ingredients: row.ingredients,
    equipment: row.equipment,
    instructions: row.instructions,
    notes: row.notes,
    tags: row.tags,
    ...(row.source_url === null ? {} : { sourceUrl: row.source_url }),
  });
  return {
    recipe: recipeSchema.parse({ id: row.id, ...content }),
    revision: row.revision,
  };
}

function mapWrittenRecipeDocument(
  id: string,
  revision: number,
  document: unknown,
): RecipeDocumentSnapshot {
  if (!Number.isSafeInteger(revision) || revision < 1 || revision > 2_147_483_647) {
    throw new Error("Could not load this recipe.");
  }
  const content = recipeContentSchema.parse(document);
  return { recipe: recipeSchema.parse({ id, ...content }), revision };
}

function mapRecipeDocumentSummary(row: DatabaseRecipeDocumentSummary): RecipeDocumentListSummary {
  const { recipe } = mapWrittenRecipeDocument(row.id, row.revision, row.document);
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    ...(recipe.yield === undefined ? {} : { yield: recipe.yield }),
    time: recipe.time,
    tags: recipe.tags,
    revision: row.revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** All operations use the caller's JWT and therefore remain subject to database RLS. */
export class RecipeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getDocument(ownerId: string, id: string): Promise<RecipeDocumentSnapshot | null> {
    const { data, error } = await this.client
      .from("recipes")
      .select(
        "id, revision, title, description, source_url, prep_minutes, cook_minutes, total_minutes, yield_amount, yield_unit, tags, notes, instructions, ingredients, equipment",
      )
      .eq("owner_id", ownerId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Could not load this recipe.");
    return data ? mapRecipeDocument(data as DatabaseRecipeRow) : null;
  }

  async listDocumentPage(
    ownerId: string,
    search: string | undefined,
    tags: string[],
    offset: number,
    limit: number,
  ): Promise<RecipeDocumentPage> {
    const { data, error } = await this.client.rpc("recipe_vault_search_recipe_documents", {
      target_owner_id: ownerId,
      target_search: search ?? null,
      target_tags: tags,
      target_offset: offset,
      target_limit: limit,
    });
    if (error) throw new Error("Could not load recipes.");
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Could not load recipes.");
    }
    const result = data as RecipeDocumentSearchRpcResult;
    if (
      !Array.isArray(result.items) ||
      !Number.isSafeInteger(result.total) ||
      (result.total as number) < 0
    ) {
      throw new Error("Could not load recipes.");
    }
    return {
      items: (result.items as DatabaseRecipeDocumentSummary[]).map(mapRecipeDocumentSummary),
      total: result.total as number,
    };
  }

  private async writeDocument(
    ownerId: string,
    id: string | null,
    content: RecipeContent,
    expectedRevision: number | null,
  ): Promise<RecipeDocumentWriteResult> {
    const { data, error } = await this.client.rpc("recipe_vault_write_recipe_document", {
      target_owner_id: ownerId,
      target_recipe_id: id,
      target_expected_revision: expectedRevision,
      target_document: content,
    });
    if (error) throw new Error("Could not save this recipe.");

    const result = (Array.isArray(data) ? data[0] : data) as RecipeDocumentWriteRpcResult | null;
    if (!result || !["saved", "conflict", "not_found", "invalid"].includes(result.status)) {
      throw new Error("Could not save this recipe.");
    }
    if (result.status !== "saved") {
      return result.status === "conflict"
        ? { status: "conflict", ...(result.revision === null ? {} : { revision: result.revision }) }
        : { status: result.status };
    }
    if (result.recipe_id === null || result.revision === null || result.document === null) {
      throw new Error("Could not save this recipe.");
    }
    return {
      status: "saved",
      ...mapWrittenRecipeDocument(result.recipe_id, result.revision, result.document),
    };
  }

  createDocument(ownerId: string, content: RecipeContent): Promise<RecipeDocumentWriteResult> {
    return this.writeDocument(ownerId, null, content, null);
  }

  replaceDocument(
    ownerId: string,
    recipe: ValidatedRecipe,
    expectedRevision: number,
  ): Promise<RecipeDocumentWriteResult> {
    const { id, ...content } = recipe;
    return this.writeDocument(ownerId, id, recipeContentSchema.parse(content), expectedRevision);
  }

  async deleteDocument(
    ownerId: string,
    recipeId: string,
    expectedRevision: number,
    audit?: AuditMetadata,
  ): Promise<RecipeDocumentDeleteResult> {
    const { data, error } = await this.client.rpc("recipe_vault_delete_recipe_document", {
      target_owner_id: ownerId,
      target_recipe_id: recipeId,
      target_expected_revision: expectedRevision,
      target_audit_request_id: audit?.requestId ?? null,
      target_audit_method: audit?.method ?? null,
    });
    if (error) throw new Error("Could not delete this recipe.");

    const result = (Array.isArray(data) ? data[0] : data) as {
      status?: string;
      recipe_id?: string | null;
      revision?: number | null;
    } | null;
    if (!result) throw new Error("Could not delete this recipe.");
    if (result.status === "conflict" && Number.isSafeInteger(result.revision)) {
      return { status: "conflict", revision: result.revision as number };
    }
    if (result.status === "not_found" || result.status === "invalid") {
      return { status: result.status };
    }
    if (
      result.status === "deleted" &&
      result.recipe_id === recipeId &&
      Number.isSafeInteger(result.revision)
    ) {
      return { status: "deleted", recipeId, revision: result.revision as number };
    }
    throw new Error("Could not delete this recipe.");
  }

  async recordAudit(
    ownerId: string,
    recipeId: string,
    eventType: string,
    metadata: AuditMetadata,
  ): Promise<void> {
    const { error } = await this.client.rpc("recipe_vault_record_audit_event", {
      target_recipe_id: recipeId,
      target_owner_id: ownerId,
      audit_event_type: eventType,
      audit_event_data: { requestId: metadata.requestId, method: metadata.method, recipeId },
    });
    if (error) throw new Error("Could not record audit event.");
  }
}
