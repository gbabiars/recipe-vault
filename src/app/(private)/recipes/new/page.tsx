import { requireUser } from "@/lib/auth/require-user";
import { RecipeForm } from "@/features/recipes/recipe-form";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
export default async function NewRecipePage() {
  await requireUser();
  return (
    <PageLayout>
      <PageHeader title="Create recipe" />
      <PageContent>
        <RecipeForm />
      </PageContent>
    </PageLayout>
  );
}
