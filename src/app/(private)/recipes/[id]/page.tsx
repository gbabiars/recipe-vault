import { notFound } from "next/navigation";
import { Breadcrumbs, BreadcrumbsItem } from "@/components/ui/breadcrumbs";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { Stack } from "@/components/ui/stack";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import { RecipeDocumentDetailCards } from "./_components/recipe-detail-cards";
import { DocumentRecipePageActions } from "./_components/document-recipe-page-actions";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const snapshot = await (await getRecipeService()).getRecipe(user.id, id);
  if (!snapshot) notFound();

  const recipe = snapshot.recipe;

  return (
    <PageLayout>
      <PageHeader
        title={recipe.title}
        overline={
          <Breadcrumbs trailingSeparator>
            <BreadcrumbsItem href="/recipes">Recipes</BreadcrumbsItem>
          </Breadcrumbs>
        }
        description={recipe.description || undefined}
        actions={
          <DocumentRecipePageActions
            recipeId={recipe.id}
            recipeTitle={recipe.title}
            revision={snapshot.revision}
            editHref={`/recipes/${recipe.id}/edit`}
          />
        }
      />
      <PageContent>
        <Stack gap="200">
          <RecipeDocumentDetailCards recipe={recipe} />
        </Stack>
      </PageContent>
    </PageLayout>
  );
}
