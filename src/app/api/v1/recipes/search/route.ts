import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { createRecipeSearchApi } from "@/lib/api/recipe-search-handler";
import { getRecipeService } from "@/lib/recipes";
import { parseRecipeSearch } from "@/lib/recipes/recipe-search-parser";

const api = createRecipeSearchApi({
  getUser: getAuthenticatedUser,
  getService: getRecipeService,
  parseSearch: parseRecipeSearch,
});

export const POST = api.post;
