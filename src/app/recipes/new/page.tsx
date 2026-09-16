import { requireUser } from "@/lib/auth/require-user";
import { RecipeForm } from "@/features/recipes/recipe-form";
import { RecipeShell } from "@/features/recipes/recipe-shell";
export default async function NewRecipePage() {
  await requireUser();
  return (
    <RecipeShell>
      <h1>Create recipe</h1>
      <RecipeForm />
    </RecipeShell>
  );
}
