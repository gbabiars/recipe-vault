import { notFound } from "next/navigation";
import { Breadcrumbs, BreadcrumbsItem } from "@/components/ui/breadcrumbs";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import { RecipeDocumentEditor } from "../../_components/recipe-document-editor";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const snapshot = await (await getRecipeService()).getRecipe(user.id, id);
  if (!snapshot) notFound();
  return (
    <PageLayout>
      <PageHeader
        title="Edit recipe"
        overline={
          <Breadcrumbs trailingSeparator>
            <BreadcrumbsItem href="/recipes">Recipes</BreadcrumbsItem>
            <BreadcrumbsItem href={`/recipes/${snapshot.recipe.id}`}>
              {snapshot.recipe.title}
            </BreadcrumbsItem>
          </Breadcrumbs>
        }
      />
      <PageContent>
        <RecipeDocumentEditor snapshot={snapshot} returnTo={`/recipes/${snapshot.recipe.id}`} />
      </PageContent>
    </PageLayout>
  );
}
