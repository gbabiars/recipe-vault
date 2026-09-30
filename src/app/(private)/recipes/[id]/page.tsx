import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, BreadcrumbsItem } from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { Stack } from "@/components/ui/stack";
import {
  RecipeDeleteCard,
  RecipeDetailsCard,
  RecipeIngredientsCard,
  RecipeMethodCard,
  RecipeNotesCard,
} from "@/features/recipes/recipe-detail-cards";
import { deleteRecipeAction } from "@/features/recipes/actions";
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
            <BreadcrumbsItem>
              <Link href="/recipes">Recipes</Link>
            </BreadcrumbsItem>
          </Breadcrumbs>
        }
        description={recipe.summary}
        actions={
          <Button
            href={`/recipes/${recipe.id}/edit`}
            render={<Link href={`/recipes/${recipe.id}/edit`} />}
          >
            Edit recipe
          </Button>
        }
      />
      <PageContent>
        <Stack gap="200">
          <RecipeDetailsCard recipe={recipe} />
          <RecipeIngredientsCard ingredients={recipe.ingredients} />
          <RecipeMethodCard steps={recipe.steps} />
          {recipe.notes && <RecipeNotesCard notes={recipe.notes} />}
          <RecipeDeleteCard recipeId={recipe.id} deleteAction={deleteRecipeAction} />
        </Stack>
      </PageContent>
    </PageLayout>
  );
}
