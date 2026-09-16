import { getServerSupabaseClient } from "@/lib/auth/server";
import { getRecipeService } from "@/lib/recipes";
import { createRecipeApi } from "@/lib/api/recipe-handlers";

const api = createRecipeApi({
  getUser: async () => (await (await getServerSupabaseClient()).auth.getUser()).data.user,
  getService: getRecipeService,
});

export const GET = api.list;
export const POST = api.create;
