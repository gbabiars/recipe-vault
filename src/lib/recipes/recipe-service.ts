import { RecipeRepository } from "@/lib/db/recipe-repository";
import type { RecipeCreateInput } from "@/lib/validation/recipe";

export class RecipeService {
  constructor(private readonly recipes: RecipeRepository) {}

  list(ownerId: string, search?: string, tags?: string[], dietaryFlags?: string[]) { return this.recipes.list(ownerId, search, tags, dietaryFlags); }
  get(ownerId: string, recipeId: string) { return this.recipes.get(ownerId, recipeId); }
  create(ownerId: string, input: RecipeCreateInput) { return this.recipes.create(ownerId, input); }
  update(ownerId: string, recipeId: string, input: RecipeCreateInput) { return this.recipes.update(ownerId, recipeId, input); }
  delete(ownerId: string, recipeId: string) { return this.recipes.remove(ownerId, recipeId); }
}
