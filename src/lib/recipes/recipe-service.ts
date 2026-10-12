import { RecipeRepository } from "@/lib/db/recipe-repository";
import type {
  AuditMetadata,
  RecipeDocumentSnapshot,
  RecipeDocumentDeleteResult,
  RecipeDocumentWriteResult,
  RecipeDocumentPage,
} from "@/lib/db/recipe-repository";
import {
  recipeDocumentContentSchema,
  recipeDocumentSchema,
} from "@/lib/validation/recipe-document";

export type RecipeDocumentValidationIssue = {
  path: Array<string | number>;
  message: string;
};

export type RecipeDocumentServiceResult =
  | ({ status: "saved" } & RecipeDocumentSnapshot)
  | { status: "conflict"; revision?: number }
  | { status: "not_found" }
  | { status: "invalid"; issues: RecipeDocumentValidationIssue[] };

function validationIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return error.issues.map(({ path, message }) => ({
    path: path.map((part) => (typeof part === "number" ? part : String(part))),
    message,
  }));
}

function mapWriteResult(result: RecipeDocumentWriteResult): RecipeDocumentServiceResult {
  if (result.status === "invalid") {
    return {
      status: "invalid",
      issues: [{ path: [], message: "Recipe document did not pass database validation." }],
    };
  }
  return result;
}

export class RecipeService {
  constructor(private readonly recipes: RecipeRepository) {}

  listDocumentPage(
    ownerId: string,
    options: {
      search?: string;
      tags: string[];
      page: number;
      pageSize: number;
    },
  ): Promise<RecipeDocumentPage> {
    return this.recipes.listDocumentPage(
      ownerId,
      options.search,
      options.tags,
      (options.page - 1) * options.pageSize,
      options.pageSize,
    );
  }
  getDocument(ownerId: string, recipeId: string): Promise<RecipeDocumentSnapshot | null> {
    return this.recipes.getDocument(ownerId, recipeId);
  }
  async createDocument(
    ownerId: string,
    content: unknown,
    audit?: AuditMetadata,
  ): Promise<RecipeDocumentServiceResult> {
    const parsed = recipeDocumentContentSchema.safeParse(content);
    if (!parsed.success) return { status: "invalid", issues: validationIssues(parsed.error) };

    const result = mapWriteResult(await this.recipes.createDocument(ownerId, parsed.data));
    if (result.status === "saved" && audit) {
      await this.recipes.recordAudit(ownerId, result.recipe.id, "recipe.created", audit);
    }
    return result;
  }
  async replaceDocument(
    ownerId: string,
    recipe: unknown,
    expectedRevision: number,
    audit?: AuditMetadata,
  ): Promise<RecipeDocumentServiceResult> {
    if (
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 1 ||
      expectedRevision > 2_147_483_647
    ) {
      return {
        status: "invalid",
        issues: [
          { path: ["expectedRevision"], message: "Expected revision must be a positive integer." },
        ],
      };
    }

    const parsed = recipeDocumentSchema.safeParse(recipe);
    if (!parsed.success) return { status: "invalid", issues: validationIssues(parsed.error) };

    const result = mapWriteResult(
      await this.recipes.replaceDocument(ownerId, parsed.data, expectedRevision),
    );
    if (result.status === "saved" && audit) {
      await this.recipes.recordAudit(ownerId, parsed.data.id, "recipe.updated", audit);
    }
    return result;
  }
  async deleteDocument(
    ownerId: string,
    recipeId: string,
    expectedRevision: number,
    audit?: AuditMetadata,
  ): Promise<RecipeDocumentDeleteResult> {
    if (
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 1 ||
      expectedRevision > 2_147_483_647
    ) {
      return { status: "invalid" };
    }
    return this.recipes.deleteDocument(ownerId, recipeId, expectedRevision, audit);
  }
}

/**
 * Binds a recipe service to one verified owner. MCP tools receive this wrapper
 * so they cannot select or override a tenant ID from tool input.
 */
export class OwnerBoundRecipeService {
  constructor(
    readonly ownerId: string,
    private readonly recipes: RecipeService,
  ) {}

  listDocumentPage(options: Parameters<RecipeService["listDocumentPage"]>[1]) {
    return this.recipes.listDocumentPage(this.ownerId, options);
  }

  getDocument(recipeId: string) {
    return this.recipes.getDocument(this.ownerId, recipeId);
  }

  createDocument(content: unknown, audit?: AuditMetadata) {
    return this.recipes.createDocument(this.ownerId, content, audit);
  }

  replaceDocument(recipe: unknown, expectedRevision: number, audit?: AuditMetadata) {
    return this.recipes.replaceDocument(this.ownerId, recipe, expectedRevision, audit);
  }

  deleteDocument(recipeId: string, expectedRevision: number, audit?: AuditMetadata) {
    return this.recipes.deleteDocument(this.ownerId, recipeId, expectedRevision, audit);
  }
}
