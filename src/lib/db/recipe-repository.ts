import type { SupabaseClient } from "@supabase/supabase-js";
import type { RecipeCreateInput } from "@/lib/validation/recipe";
import {
  recipeDocumentContentSchema,
  recipeDocumentSchema,
  type RecipeDocument,
  type RecipeDocumentContent,
} from "@/lib/validation/recipe-document";

export type Recipe = {
  id: string;
  ownerId: string;
  title: string;
  summary?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  servings?: number;
  tags: string[];
  sourceUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export type RecipeIngredient = RecipeCreateInput["ingredients"][number];
export type RecipeStep = RecipeCreateInput["steps"][number];
export type AuditMetadata = { requestId: string; method: string };
export type RecipeDocumentSnapshot = { recipe: RecipeDocument; revision: number };
export type RecipeDocumentListSummary = Pick<
  RecipeDocument,
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

type DatabaseRecipeDocument = {
  id: string;
  document: unknown;
  revision: number;
};

type DatabaseRecipeDocumentSummary = DatabaseRecipeDocument & {
  created_at: string;
  updated_at: string;
};

type RecipeDocumentWriteRpcResult = {
  status: RecipeDocumentWriteResult["status"];
  recipe_id: string | null;
  revision: number | null;
  document: unknown | null;
};

function mapRecipeDocument(row: DatabaseRecipeDocument): RecipeDocumentSnapshot {
  if (!Number.isSafeInteger(row.revision) || row.revision < 1 || row.revision > 2_147_483_647) {
    throw new Error("Could not load this recipe.");
  }
  const content = recipeDocumentContentSchema.parse(row.document);
  return {
    recipe: recipeDocumentSchema.parse({ id: row.id, ...content }),
    revision: row.revision,
  };
}

function mapRecipeDocumentSummary(row: DatabaseRecipeDocumentSummary): RecipeDocumentListSummary {
  const { recipe } = mapRecipeDocument(row);
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

function escapeLikeSubstring(value: string): string {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** All operations use the caller's JWT and therefore remain subject to database RLS. */
export class RecipeRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getDocument(ownerId: string, id: string): Promise<RecipeDocumentSnapshot | null> {
    const { data, error } = await this.client
      .from("recipes")
      .select("id, document, revision")
      .eq("owner_id", ownerId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error("Could not load this recipe.");
    return data ? mapRecipeDocument(data as DatabaseRecipeDocument) : null;
  }

  async listDocumentPage(
    ownerId: string,
    search: string | undefined,
    tags: string[],
    offset: number,
    limit: number,
  ): Promise<RecipeDocumentPage> {
    let query = this.client
      .from("recipes")
      .select("id, document, revision, created_at, updated_at", { count: "exact" })
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false })
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1);

    if (search) query = query.ilike("title_text", `%${escapeLikeSubstring(search)}%`);
    if (tags.length) {
      const clauses = tags.map((tag) => `document->tags.cs.${JSON.stringify([tag])}`);
      query = query.or(clauses.join(","));
    }

    const { data, error, count } = await query;
    if (error) throw new Error("Could not load recipes.");
    return {
      items: (data as unknown as DatabaseRecipeDocumentSummary[]).map(mapRecipeDocumentSummary),
      total: count ?? 0,
    };
  }

  private async writeDocument(
    ownerId: string,
    id: string | null,
    content: RecipeDocumentContent,
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
      ...mapRecipeDocument({
        id: result.recipe_id,
        revision: result.revision,
        document: result.document,
      }),
    };
  }

  createDocument(
    ownerId: string,
    content: RecipeDocumentContent,
  ): Promise<RecipeDocumentWriteResult> {
    return this.writeDocument(ownerId, null, content, null);
  }

  replaceDocument(
    ownerId: string,
    recipe: RecipeDocument,
    expectedRevision: number,
  ): Promise<RecipeDocumentWriteResult> {
    const { id, ...content } = recipe;
    return this.writeDocument(
      ownerId,
      id,
      recipeDocumentContentSchema.parse(content),
      expectedRevision,
    );
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
