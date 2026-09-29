import styles from "./page.module.css";
import Link from "next/link";
import { Suspense } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuLinkItem,
  DropdownMenuPopup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Heading } from "@/components/ui/heading";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { RecipeFilters } from "@/features/recipes/recipe-filters";
import { RecipeListCard } from "@/features/recipes/recipe-list-card";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import type { RecipeSummary } from "@/lib/db/recipe-repository";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string | string[] }>;
}) {
  const { q, tag } = await searchParams;
  const tags = tag == null ? [] : Array.isArray(tag) ? tag : [tag];
  return (
    <PageLayout>
      <PageHeader
        title="Your recipes"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button />}>Add a recipe</DropdownMenuTrigger>
            <DropdownMenuPopup align="end">
              <DropdownMenuLinkItem render={<Link href="/recipes/new" />}>
                Create manually
              </DropdownMenuLinkItem>
              <DropdownMenuLinkItem render={<Link href="/recipes/import" />}>
                Import from a website
              </DropdownMenuLinkItem>
            </DropdownMenuPopup>
          </DropdownMenu>
        }
      />
      <PageContent>
        <Stack gap="200">
          <RecipeFilters q={q} tag={tags} />
          <Suspense
            key={JSON.stringify([q, tags])}
            fallback={
              <Text as="p" aria-live="polite">
                Loading your recipes…
              </Text>
            }
          >
            <RecipeResults q={q} tags={tags} />
          </Suspense>
        </Stack>
      </PageContent>
    </PageLayout>
  );
}

async function RecipeResults({ q, tags }: { q?: string; tags: string[] }) {
  const user = await requireUser();
  let recipes: RecipeSummary[];
  let error: string | undefined;
  try {
    recipes = await (await getRecipeService()).list(user.id, q?.trim(), tags);
  } catch {
    recipes = [];
    error = "Recipes could not be loaded. Refresh the page to try again.";
  }
  return (
    <>
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
              {q || tags.length > 0
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
    </>
  );
}
