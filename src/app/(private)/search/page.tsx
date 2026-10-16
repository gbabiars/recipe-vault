"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Grid } from "@/components/ui/grid";
import { Heading } from "@/components/ui/heading";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { Stack } from "@/components/ui/stack";
import { Textarea } from "@/components/ui/textarea";
import { Text } from "@/components/ui/text";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
import { RecipePreviewCard } from "./_components/recipe-preview-card";
import styles from "./page.module.css";

type RecipeSearchResponse = {
  data: RecipeSummary[];
  meta: { total: number };
};

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string>();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(false);
  const [requestError, setRequestError] = useState(false);
  const [inputError, setInputError] = useState<string>();

  const hasSearched = submittedQuery !== undefined;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const search = query.trim();

    if (search.length === 0) {
      setInputError("Enter a recipe or ingredient to search.");
      return;
    }

    setInputError(undefined);
    setSubmittedQuery(search);
    setRecipes([]);
    setTotal(0);
    setRequestError(false);
    setPending(true);

    try {
      const params = new URLSearchParams({ search, pageSize: "25" });
      const response = await fetch(`/api/v1/recipes?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Recipe search failed.");

      const result = (await response.json()) as RecipeSearchResponse;
      if (!Array.isArray(result.data) || typeof result.meta?.total !== "number") {
        throw new Error("Recipe search returned an invalid response.");
      }
      setRecipes(result.data);
      setTotal(result.meta.total);
    } catch {
      setRequestError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={`${styles.page} ${hasSearched ? styles.resultsPage : ""}`}>
      <PageLayout className={`${styles.content} ${hasSearched ? styles.resultsContent : ""}`}>
        {!hasSearched && <PageHeader title="What sounds good tonight?" />}
        <PageContent className={hasSearched ? styles.resultsPageContent : undefined}>
          <div className={`${styles.pageBody} ${hasSearched ? styles.resultsPageBody : ""}`}>
            {hasSearched && (
              <section aria-label="Search results" aria-busy={pending} className={styles.results}>
                <Heading as="h2" level={4}>
                  Results for “{submittedQuery}”
                </Heading>
                {pending ? (
                  <Text as="p" role="status" aria-live="polite">
                    Searching your recipes…
                  </Text>
                ) : requestError ? (
                  <Alert
                    title="Search could not be completed"
                    description="Please try again."
                    variant="danger"
                  />
                ) : recipes.length === 0 ? (
                  <Stack gap="100">
                    <Heading as="h3" level={5}>
                      No recipes found
                    </Heading>
                    <Text as="p" role="status" aria-live="polite">
                      Try a different ingredient or phrase.
                    </Text>
                  </Stack>
                ) : (
                  <Stack gap="150">
                    <Text as="p" role="status" aria-live="polite">
                      Showing {recipes.length} of {total} recipes
                    </Text>
                    <Grid columns={{ minWidth: 280, max: 2 }} gap="200">
                      {recipes.map((recipe) => (
                        <RecipePreviewCard key={recipe.id} recipe={recipe} />
                      ))}
                    </Grid>
                  </Stack>
                )}
              </section>
            )}

            <form
              className={`${styles.composer} ${hasSearched ? styles.composerAtBottom : ""}`}
              onSubmit={handleSubmit}
            >
              <Textarea
                label="Search your recipes"
                visuallyHiddenLabel
                placeholder="Search by ingredient or recipe name..."
                required
                maxLength={200}
                error={inputError}
                value={query}
                onValueChange={(value) => {
                  setQuery(value);
                  setInputError(undefined);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                rows={hasSearched ? 1 : 3}
                textareaClassName={styles.input}
              />
              <div className={styles.actions}>
                <Button label="Search" type="submit" variant="primary" pending={pending} />
              </div>
            </form>
          </div>
        </PageContent>
      </PageLayout>
    </div>
  );
}
