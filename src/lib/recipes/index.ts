import { RecipeRepository } from "@/lib/db/recipe-repository";
import { getMcpSupabaseClient, getServerSupabaseClient } from "@/lib/auth/server";
import { OwnerBoundRecipeService, RecipeService } from "./recipe-service";

export async function getRecipeService() {
  return new RecipeService(new RecipeRepository(await getServerSupabaseClient()));
}

/** Creates the only service-role data path, bound to a verified MCP owner. */
export function getOwnerBoundMcpRecipeService(ownerId: string) {
  return new OwnerBoundRecipeService(
    ownerId,
    new RecipeService(new RecipeRepository(getMcpSupabaseClient())),
  );
}
