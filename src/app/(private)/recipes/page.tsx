import { Suspense } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { RecipeFilters } from "./_components/recipe-filters";
import { RecipeList, RecipeListSkeleton } from "./_components/recipe-list";
import { RecipePagination } from "./_components/recipe-pagination";
import { RecipesHeaderActions } from "./_components/recipes-header-actions";
import { loadRecipePage } from "./_lib/load-recipe-page";
import { parseRecipePage, recipePageHref } from "./_lib/recipe-pagination";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import type { RecipeDocumentListSummary } from "@/lib/db/recipe-repository";

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string | string[]; page?: string | string[] }>;
}) {
  const { q, tag, page } = await searchParams;
  const tags = tag == null ? [] : Array.isArray(tag) ? tag : [tag];
  const requestedPage = parseRecipePage(page);
  return (
    <PageLayout>
      <PageHeader title="Your recipes" actions={<RecipesHeaderActions />} />
      <PageContent>
        <Stack gap="200">
          <RecipeFilters q={q} tag={tags} />
          <Card padding="none">
            <Stack paddingBlock="200" paddingInline="200">
              <Suspense
                key={JSON.stringify([q, tags, requestedPage])}
                fallback={<RecipeListSkeleton />}
              >
                <RecipeResults q={q} tags={tags} requestedPage={requestedPage} />
              </Suspense>
            </Stack>
          </Card>
        </Stack>
      </PageContent>
    </PageLayout>
  );
}

async function RecipeResults({
  q,
  tags,
  requestedPage,
}: {
  q?: string;
  tags: string[];
  requestedPage: number;
}) {
  const user = await requireUser();
  let documentSummaries: RecipeDocumentListSummary[];
  let total = 0;
  let displayedPage = 1;
  let pageCount = 1;
  let error: string | undefined;
  try {
    const result = await loadRecipePage(await getRecipeService(), user.id, {
      search: q?.trim() || undefined,
      tags,
      requestedPage,
    });
    ({ items: documentSummaries, total, page: displayedPage, pageCount } = result);
  } catch {
    documentSummaries = [];
    error = "Recipes could not be loaded. Refresh the page to try again.";
  }
  return (
    <>
      {error ? (
        <Alert
          description="Refresh the page to try again."
          title="Recipes could not be loaded"
          variant="danger"
        />
      ) : documentSummaries.length === 0 ? (
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
              <Button label="Create a recipe" href="/recipes/new" />
            </div>
          </Stack>
        </Card>
      ) : (
        <Stack gap="200">
          <RecipeList documentSummaries={documentSummaries} />
          <RecipePagination
            page={displayedPage}
            pageCount={pageCount}
            total={total}
            previousHref={
              displayedPage > 1 ? recipePageHref({ q, tags, page: displayedPage - 1 }) : undefined
            }
            nextHref={
              displayedPage < pageCount
                ? recipePageHref({ q, tags, page: displayedPage + 1 })
                : undefined
            }
          />
        </Stack>
      )}
    </>
  );
}
