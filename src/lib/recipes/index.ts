import { RecipeRepository } from "@/lib/db/recipe-repository";
import { getServerSupabaseClient } from "@/lib/auth/server";
import { RecipeService } from "./recipe-service";

export async function getRecipeService() {
  return new RecipeService(new RecipeRepository(await getServerSupabaseClient()));
}
