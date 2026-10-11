import { RecipeRepository } from "@/lib/db/recipe-repository";
import {
  recipeCreateInputSchema,
  type RecipeCreateInput,
  type RecipeUpdateInput,
} from "@/lib/validation/recipe";
import type {
  AuditMetadata,
  RecipeDocumentSnapshot,
  RecipeDocumentWriteResult,
  RecipeDocumentPage,
  RecipePage,
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

  listTags(ownerId: string, search?: string) {
    return this.recipes.listTags(ownerId, search);
  }

  list(ownerId: string, search?: string, tags?: string[]) {
    return this.recipes.list(ownerId, search, tags);
  }
  listPage(
    ownerId: string,
    options: {
      search?: string;
      tags: string[];
      page: number;
      pageSize: number;
    },
  ): Promise<RecipePage> {
    return this.recipes.listPage(
      ownerId,
      options.search,
      options.tags,
      (options.page - 1) * options.pageSize,
      options.pageSize,
    );
  }
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
  get(ownerId: string, recipeId: string) {
    return this.recipes.get(ownerId, recipeId);
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
  async create(ownerId: string, input: RecipeCreateInput, audit?: AuditMetadata) {
    const recipe = await this.recipes.create(ownerId, input);
    if (audit) await this.recipes.recordAudit(ownerId, recipe.id, "recipe.created", audit);
    return recipe;
  }
  async update(
    ownerId: string,
    recipeId: string,
    patch: RecipeUpdateInput | RecipeCreateInput,
    audit?: AuditMetadata,
  ) {
    const current = await this.recipes.get(ownerId, recipeId);
    if (!current) return null;
    const merged = recipeCreateInputSchema.parse({
      title: current.title,
      summary: current.summary,
      prepTimeMinutes: current.prepTimeMinutes,
      cookTimeMinutes: current.cookTimeMinutes,
      totalTimeMinutes: current.totalTimeMinutes,
      servings: current.servings,
      tags: current.tags,
      sourceUrl: current.sourceUrl,
      notes: current.notes,
      ...patch,
      ingredients: patch.ingredients ?? current.ingredients,
      steps: patch.steps ?? current.steps,
    });
    const recipe = await this.recipes.update(ownerId, recipeId, merged);
    if (recipe && audit) await this.recipes.recordAudit(ownerId, recipeId, "recipe.updated", audit);
    return recipe;
  }
  async delete(ownerId: string, recipeId: string, audit?: AuditMetadata) {
    const recipe = await this.recipes.get(ownerId, recipeId);
    if (!recipe) return false;
    if (audit) await this.recipes.recordAudit(ownerId, recipeId, "recipe.deleted", audit);
    await this.recipes.remove(ownerId, recipeId);
    return true;
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

  listPage(options: Parameters<RecipeService["listPage"]>[1]) {
    return this.recipes.listPage(this.ownerId, options);
  }

  listDocumentPage(options: Parameters<RecipeService["listDocumentPage"]>[1]) {
    return this.recipes.listDocumentPage(this.ownerId, options);
  }

  get(recipeId: string) {
    return this.recipes.get(this.ownerId, recipeId);
  }

  create(input: RecipeCreateInput, audit?: AuditMetadata) {
    return this.recipes.create(this.ownerId, input, audit);
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
}
