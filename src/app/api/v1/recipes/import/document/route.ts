import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import { createRecipeApi } from "@/lib/api/recipe-handlers";

export const runtime = "nodejs";
export const maxDuration = 60;

const api = createRecipeApi({ getUser: getAuthenticatedUser, getService: getRecipeService });

export const POST = api.importDocument;
