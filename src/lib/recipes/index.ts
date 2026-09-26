import { RecipeRepository } from "@/lib/db/recipe-repository";
import { TagRepository } from "@/lib/db/tag-repository";
import { getMcpSupabaseClient, getServerSupabaseClient } from "@/lib/auth/server";
import { OwnerBoundRecipeService, RecipeService } from "./recipe-service";
import { OwnerBoundTagService, TagService } from "./tag-service";

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

export async function getTagService() {
  const client = await getServerSupabaseClient();
  return new TagService(new TagRepository(client), new RecipeRepository(client));
}

export function getOwnerBoundMcpTagService(ownerId: string) {
  const client = getMcpSupabaseClient();
  return new OwnerBoundTagService(
    ownerId,
    new TagService(new TagRepository(client), new RecipeRepository(client)),
  );
}
