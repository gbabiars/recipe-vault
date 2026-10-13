import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { getTagService } from "@/lib/recipes";
import { createRecipeTagApi } from "@/lib/api/document-tag-handlers";

const api = createRecipeTagApi({
  getUser: getAuthenticatedUser,
  getService: getTagService,
});

export const GET = api.list;
