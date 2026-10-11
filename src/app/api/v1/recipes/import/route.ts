import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import { createDocumentRecipeApi } from "@/lib/api/document-recipe-handlers";

const api = createDocumentRecipeApi({
  getUser: getAuthenticatedUser,
  getService: getRecipeService,
});

export const POST = api.importRecipe;
