import styles from "./page.module.css";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Grid } from "@/components/ui/grid";
import { Heading } from "@/components/ui/heading";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { Stack } from "@/components/ui/stack";
import { TextInput } from "@/components/ui/text-input";
import { Text } from "@/components/ui/text";
import { RecipeListCard } from "@/features/recipes/recipe-list-card";
import { TagFilter } from "@/features/recipes/tag-filter";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import type { RecipeSummary } from "@/lib/db/recipe-repository";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; dietary?: string }>;
}) {
  const user = await requireUser();
  const { q, tag, dietary } = await searchParams;
  let recipes: RecipeSummary[];
  let error: string | undefined;
  try {
    recipes = await (
      await getRecipeService()
    ).list(user.id, q?.trim(), tag ? [tag] : [], dietary ? [dietary] : []);
  } catch {
    recipes = [];
    error = "Recipes could not be loaded. Refresh the page to try again.";
  }
  return (
    <PageLayout>
      <PageHeader
        title="Your recipes"
        actions={
          <ButtonLink variant="primary" render={<Link href="/recipes/new" />}>
            Create recipe
          </ButtonLink>
        }
      />
      <PageContent>
        <Stack gap="200">
          <Card as="form" method="get" variant="subtle">
            <Grid gap="150" columns={{ minWidth: 180, max: 4 }}>
              <TextInput name="q" label="Search title" type="search" defaultValue={q} />
              <TagFilter tag={tag} />
              <TextInput
                name="dietary"
                label="Dietary flag"
                defaultValue={dietary}
                placeholder="vegetarian"
              />
              <Stack justify="end">
                <Button type="submit">Filter</Button>
              </Stack>
            </Grid>
          </Card>
          {error ? (
            <Card as="div" role="alert">
              <Text as="p" appearance="error">
                {error}
              </Text>
            </Card>
          ) : recipes.length === 0 ? (
            <Card as="section" padding="large">
              <Stack gap="150">
                <Heading as="h2" level={3}>
                  No recipes found
                </Heading>
                <Text as="p">
                  {q || tag || dietary
                    ? "Try a different search or filter."
                    : "Start your private collection with your first recipe."}
                </Text>
                <div>
                  <ButtonLink render={<Link href="/recipes/new" />}>Create a recipe</ButtonLink>
                </div>
              </Stack>
            </Card>
          ) : (
            <Stack as="ul" gap="200" className={styles.recipeList}>
              {recipes.map((recipe) => (
                <RecipeListCard key={recipe.id} recipe={recipe} />
              ))}
            </Stack>
          )}
        </Stack>
      </PageContent>
    </PageLayout>
  );
}
