import { RecipeRepository } from "@/lib/db/recipe-repository";
import { getMcpSupabaseClient, getServerSupabaseClient } from "@/lib/auth/server";
import { TagRepository } from "@/lib/db/tag-repository";
import { OwnerBoundRecipeService, RecipeService } from "./recipe-service";
import { OwnerBoundTagService, TagService } from "./tag-service";

export async function getRecipeService() {
  return new RecipeService(new RecipeRepository(await getServerSupabaseClient()));
}

/** Creates an application tag service using the authenticated session client. */
export async function getTagService() {
  return new TagService(new TagRepository(await getServerSupabaseClient()));
}

/** Creates the only service-role data path, bound to a verified MCP owner. */
export function getOwnerBoundMcpRecipeService(ownerId: string) {
  return new OwnerBoundRecipeService(
    ownerId,
    new RecipeService(new RecipeRepository(getMcpSupabaseClient())),
  );
}

/** Creates an owner-bound tag query service for a verified MCP principal. */
export function getOwnerBoundMcpTagService(ownerId: string) {
  return new OwnerBoundTagService(
    ownerId,
    new TagService(new TagRepository(getMcpSupabaseClient())),
  );
}
