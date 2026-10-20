import { RecipeRepository } from "@/lib/db/recipe-repository";
import type {
  AuditMetadata,
  RecipeSnapshot,
  RecipeDeleteResult,
  RecipeWriteResult,
  RecipePage,
} from "@/lib/db/recipe-repository";
import { recipeContentSchema, recipeSchema } from "@/lib/validation/recipe";
import type { RecipeSearchPreference } from "@/lib/validation/recipe-search";

export type RecipeValidationIssue = {
  path: Array<string | number>;
  message: string;
};

export type RecipeServiceResult =
  | ({ status: "saved" } & RecipeSnapshot)
  | { status: "conflict"; revision?: number }
  | { status: "not_found" }
  | { status: "invalid"; issues: RecipeValidationIssue[] };

function validationIssues(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return error.issues.map(({ path, message }) => ({
    path: path.map((part) => (typeof part === "number" ? part : String(part))),
    message,
  }));
}

function mapWriteResult(result: RecipeWriteResult): RecipeServiceResult {
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

  listRecipes(
    ownerId: string,
    options: {
      search?: string;
      preference?: RecipeSearchPreference;
      tags: string[];
      page: number;
      pageSize: number;
    },
  ): Promise<RecipePage> {
    return this.recipes.listRecipes(
      ownerId,
      options.search,
      options.tags,
      (options.page - 1) * options.pageSize,
      options.pageSize,
      options.preference,
    );
  }
  getRecipe(ownerId: string, recipeId: string): Promise<RecipeSnapshot | null> {
    return this.recipes.getRecipe(ownerId, recipeId);
  }
  async createRecipe(
    ownerId: string,
    content: unknown,
    audit?: AuditMetadata,
  ): Promise<RecipeServiceResult> {
    const parsed = recipeContentSchema.safeParse(content);
    if (!parsed.success) return { status: "invalid", issues: validationIssues(parsed.error) };

    const result = mapWriteResult(await this.recipes.createRecipe(ownerId, parsed.data));
    if (result.status === "saved" && audit) {
      await this.recipes.recordAudit(ownerId, result.recipe.id, "recipe.created", audit);
    }
    return result;
  }
  async replaceRecipe(
    ownerId: string,
    recipe: unknown,
    expectedRevision: number,
    audit?: AuditMetadata,
  ): Promise<RecipeServiceResult> {
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

    const parsed = recipeSchema.safeParse(recipe);
    if (!parsed.success) return { status: "invalid", issues: validationIssues(parsed.error) };

    const result = mapWriteResult(
      await this.recipes.replaceRecipe(ownerId, parsed.data, expectedRevision),
    );
    if (result.status === "saved" && audit) {
      await this.recipes.recordAudit(ownerId, parsed.data.id, "recipe.updated", audit);
    }
    return result;
  }
  async deleteRecipe(
    ownerId: string,
    recipeId: string,
    expectedRevision: number,
    audit?: AuditMetadata,
  ): Promise<RecipeDeleteResult> {
    if (
      !Number.isSafeInteger(expectedRevision) ||
      expectedRevision < 1 ||
      expectedRevision > 2_147_483_647
    ) {
      return { status: "invalid" };
    }
    return this.recipes.deleteRecipe(ownerId, recipeId, expectedRevision, audit);
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

  listRecipes(options: Parameters<RecipeService["listRecipes"]>[1]) {
    return this.recipes.listRecipes(this.ownerId, options);
  }

  getRecipe(recipeId: string) {
    return this.recipes.getRecipe(this.ownerId, recipeId);
  }

  createRecipe(content: unknown, audit?: AuditMetadata) {
    return this.recipes.createRecipe(this.ownerId, content, audit);
  }

  replaceRecipe(recipe: unknown, expectedRevision: number, audit?: AuditMetadata) {
    return this.recipes.replaceRecipe(this.ownerId, recipe, expectedRevision, audit);
  }

  deleteRecipe(recipeId: string, expectedRevision: number, audit?: AuditMetadata) {
    return this.recipes.deleteRecipe(this.ownerId, recipeId, expectedRevision, audit);
  }
}
