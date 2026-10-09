import { notFound } from "next/navigation";
import { Breadcrumbs, BreadcrumbsItem } from "@/components/ui/breadcrumbs";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { Stack } from "@/components/ui/stack";
import {
  RecipeDetailsCard,
  RecipeIngredientsCard,
  RecipeMethodCard,
  RecipeNotesCard,
} from "./_components/recipe-detail-cards";
import { deleteRecipeAction } from "../_actions/recipe-actions";
import { RecipePageActions } from "./_components/recipe-page-actions";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const recipe = await (await getRecipeService()).get(user.id, id);
  if (!recipe) notFound();
  return (
    <PageLayout>
      <PageHeader
        title={recipe.title}
        overline={
          <Breadcrumbs trailingSeparator>
            <BreadcrumbsItem href="/recipes">Recipes</BreadcrumbsItem>
          </Breadcrumbs>
        }
        description={recipe.summary}
        actions={
          <RecipePageActions
            recipeId={recipe.id}
            recipeTitle={recipe.title}
            editHref={`/recipes/${recipe.id}/edit`}
            deleteAction={deleteRecipeAction}
          />
        }
      />
      <PageContent>
        <Stack gap="200">
          <RecipeDetailsCard recipe={recipe} />
          <RecipeIngredientsCard ingredients={recipe.ingredients} />
          <RecipeMethodCard steps={recipe.steps} />
          {recipe.notes && <RecipeNotesCard notes={recipe.notes} />}
        </Stack>
      </PageContent>
    </PageLayout>
  );
}
