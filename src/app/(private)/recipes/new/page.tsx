import { requireUser } from "@/lib/auth/require-user";
import { RecipeForm } from "@/features/recipes/recipe-form";
import { Heading } from "@/components/ui/heading";
export default async function NewRecipePage() {
  await requireUser();
  return (
    <>
      <Heading>Create recipe</Heading>
      <RecipeForm />
    </>
  );
}
