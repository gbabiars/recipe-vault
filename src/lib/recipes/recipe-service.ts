import { RecipeRepository } from "@/lib/db/recipe-repository";
import { recipeCreateInputSchema, type RecipeCreateInput, type RecipeUpdateInput } from "@/lib/validation/recipe";
import type { AuditMetadata, RecipePage } from "@/lib/db/recipe-repository";

export class RecipeService {
  constructor(private readonly recipes: RecipeRepository) {}

  list(ownerId: string, search?: string, tags?: string[], dietaryFlags?: string[]) {
    return this.recipes.list(ownerId, search, tags, dietaryFlags);
  }
  listPage(ownerId: string, options: { search?: string; tags: string[]; dietaryFlags: string[]; page: number; pageSize: number }): Promise<RecipePage> {
    return this.recipes.listPage(ownerId, options.search, options.tags, options.dietaryFlags, (options.page - 1) * options.pageSize, options.pageSize);
  }
  get(ownerId: string, recipeId: string) {
    return this.recipes.get(ownerId, recipeId);
  }
  async create(ownerId: string, input: RecipeCreateInput, audit?: AuditMetadata) {
    const recipe = await this.recipes.create(ownerId, input);
    if (audit) await this.recipes.recordAudit(ownerId, recipe.id, "recipe.created", audit);
    return recipe;
  }
  async update(ownerId: string, recipeId: string, patch: RecipeUpdateInput | RecipeCreateInput, audit?: AuditMetadata) {
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
      dietaryFlags: current.dietaryFlags,
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
