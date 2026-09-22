import { requireUser } from "@/lib/auth/require-user";
import { RecipeForm } from "@/features/recipes/recipe-form";
export default async function NewRecipePage() {
  await requireUser();
  return (
    <>
      <h1>Create recipe</h1>
      <RecipeForm />
    </>
  );
}
