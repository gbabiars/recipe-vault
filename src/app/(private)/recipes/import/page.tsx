import { Breadcrumbs, BreadcrumbsItem } from "@/components/ui/breadcrumbs";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { RecipeImportPageForm } from "@/features/recipes/recipe-import-form";
import { RecipeDocumentImportPageForm } from "@/features/recipes/recipe-document-import-form";
import { Stack } from "@/components/ui/stack";
import { requireUser } from "@/lib/auth/require-user";

export default async function ImportRecipePage() {
  await requireUser();

  return (
    <PageLayout>
      <PageHeader
        title="Import a recipe"
        overline={
          <Breadcrumbs trailingSeparator>
            <BreadcrumbsItem href="/recipes">Recipes</BreadcrumbsItem>
          </Breadcrumbs>
        }
      />
      <PageContent>
        <Stack gap="300">
          <RecipeImportPageForm />
          <RecipeDocumentImportPageForm />
        </Stack>
      </PageContent>
    </PageLayout>
  );
}
