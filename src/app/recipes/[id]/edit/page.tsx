import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import { RecipeForm } from "@/features/recipes/recipe-form";
import { RecipeShell } from "@/features/recipes/recipe-shell";
export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const recipe = await (await getRecipeService()).get(user.id, id);
  if (!recipe) notFound();
  return (
    <RecipeShell>
      <h1>Edit recipe</h1>
      <RecipeForm recipe={recipe} />
    </RecipeShell>
  );
}
