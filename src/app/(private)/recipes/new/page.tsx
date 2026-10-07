import { requireUser } from "@/lib/auth/require-user";
import { RecipeForm } from "@/features/recipes/recipe-form";
import { saveRecipeAction } from "@/features/recipes/actions";
import { Breadcrumbs, BreadcrumbsItem } from "@/components/ui/breadcrumbs";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
export default async function NewRecipePage() {
  await requireUser();
  return (
    <PageLayout>
      <PageHeader
        title="Create recipe"
        overline={
          <Breadcrumbs trailingSeparator>
            <BreadcrumbsItem href="/recipes">Recipes</BreadcrumbsItem>
          </Breadcrumbs>
        }
      />
      <PageContent>
        <RecipeForm saveAction={saveRecipeAction} />
      </PageContent>
    </PageLayout>
  );
}
