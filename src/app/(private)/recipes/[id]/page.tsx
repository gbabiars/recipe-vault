import headingStyles from "../../page-heading.module.css";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
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
    <>
      <div className={headingStyles.pageHeading}>
        <div>
          <Link href="/recipes">← All recipes</Link>
          <Heading as="h1" level={2}>
            {recipe.title}
          </Heading>
          {recipe.summary && (
            <Text as="p" size="medium">
              {recipe.summary}
            </Text>
          )}
        </div>
        <ButtonLink render={<Link href={`/recipes/${recipe.id}/edit`} />}>Edit recipe</ButtonLink>
      </div>
      <Stack gap="200">
        <RecipeDetailsCard recipe={recipe} />
        <RecipeIngredientsCard ingredients={recipe.ingredients} />
        <RecipeMethodCard steps={recipe.steps} />
        {recipe.notes && <RecipeNotesCard notes={recipe.notes} />}
        <RecipeDeleteCard recipeId={recipe.id} deleteAction={deleteRecipeAction} />
      </Stack>
    </>
  );
}
