import { requireUser } from "@/lib/auth/require-user";
import { RecipeDocumentEditor } from "../_components/recipe-document-editor";
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
        <RecipeDocumentEditor returnTo="/recipes" />
      </PageContent>
    </PageLayout>
  );
}
