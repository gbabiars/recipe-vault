import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import { createDocumentRecipeApi } from "@/lib/api/document-recipe-handlers";

export const runtime = "nodejs";
export const maxDuration = 60;

const api = createDocumentRecipeApi({
  getUser: getAuthenticatedUser,
  getService: getRecipeService,
});

export const POST = api.importDocument;
