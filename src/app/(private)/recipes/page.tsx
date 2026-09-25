import styles from "./page.module.css";
import feedbackStyles from "../page-feedback.module.css";
import headingStyles from "../page-heading.module.css";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Stack } from "@/components/ui/stack";
import { TextInput } from "@/components/ui/text-input";
import { RecipeListCard } from "@/features/recipes/recipe-list-card";
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
    <>
      <div className={headingStyles.pageHeading}>
        <div>
          <Heading>Your recipes</Heading>
        </div>
        <ButtonLink variant="primary" render={<Link href="/recipes/new" />}>
          Create recipe
        </ButtonLink>
      </div>
      <Card as="form" className={styles.filters} method="get" variant="subtle">
        <div className={styles.filtersGrid}>
          <TextInput name="q" label="Search title" type="search" defaultValue={q} />
          <TextInput name="tag" label="Tag" defaultValue={tag} placeholder="weeknight" />
          <TextInput
            name="dietary"
            label="Dietary flag"
            defaultValue={dietary}
            placeholder="vegetarian"
          />
          <Stack justify="end">
            <Button type="submit">Filter</Button>
          </Stack>
        </div>
      </Card>
      {error ? (
        <Card as="p" className={feedbackStyles.errorMessage} role="alert">
          {error}
        </Card>
      ) : recipes.length === 0 ? (
        <Card as="section" padding="large">
          <Heading as="h2" level={3}>
            No recipes found
          </Heading>
          <p>
            {q || tag || dietary
              ? "Try a different search or filter."
              : "Start your private collection with your first recipe."}
          </p>
          <Link href="/recipes/new">Create a recipe</Link>
        </Card>
      ) : (
        <Stack as="ul" gap="150" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {recipes.map((recipe) => (
            <RecipeListCard key={recipe.id} recipe={recipe} />
          ))}
        </Stack>
      )}
    </>
  );
}
