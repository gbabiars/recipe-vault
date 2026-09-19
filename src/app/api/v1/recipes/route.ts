import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import { createRecipeApi } from "@/lib/api/recipe-handlers";

const api = createRecipeApi({
  getUser: getAuthenticatedUser,
  getService: getRecipeService,
});

export const GET = api.list;
export const POST = api.create;
