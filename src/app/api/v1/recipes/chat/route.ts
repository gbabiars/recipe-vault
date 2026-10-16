import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { createRecipeChatApi } from "@/lib/api/recipe-chat-handler";
import { getRecipeService } from "@/lib/recipes";
import { parseRecipeSearch } from "@/lib/recipes/recipe-search-parser";

const api = createRecipeChatApi({
  getUser: getAuthenticatedUser,
  getService: getRecipeService,
  parseSearch: parseRecipeSearch,
});

export const POST = api.post;
