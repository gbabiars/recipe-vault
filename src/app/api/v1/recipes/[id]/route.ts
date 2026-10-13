import { getAuthenticatedUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import { createRecipeApi } from "@/lib/api/document-recipe-handlers";

const api = createRecipeApi({
  getUser: getAuthenticatedUser,
  getService: getRecipeService,
});
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  return api.get(request, (await params).id);
}
export async function PUT(request: Request, { params }: Context) {
  return api.replace(request, (await params).id);
}
export async function DELETE(request: Request, { params }: Context) {
  return api.remove(request, (await params).id);
}
