import { getServerSupabaseClient } from "@/lib/auth/server";
import { getRecipeService } from "@/lib/recipes";
import { createRecipeApi } from "@/lib/api/recipe-handlers";

const api = createRecipeApi({
  getUser: async () => (await (await getServerSupabaseClient()).auth.getUser()).data.user,
  getService: getRecipeService,
});
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  return api.get(request, (await params).id);
}
export async function PATCH(request: Request, { params }: Context) {
  return api.update(request, (await params).id);
}
export async function DELETE(request: Request, { params }: Context) {
  return api.remove(request, (await params).id);
}
