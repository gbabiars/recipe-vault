import type { ReactNode } from "react";

import { Card } from "../../components/ui/card/card";
import { Chip } from "../../components/ui/chip/chip";
import { Heading } from "../../components/ui/heading/heading";
import { Inline } from "../../components/ui/inline/inline";
import { PageContent, PageHeader, PageLayout } from "../../components/ui/page-layout/page-layout";
import { Stack } from "../../components/ui/stack/stack";
import { Text } from "../../components/ui/text/text";

import "./recipe-view.css";

export type RecipeViewData = {
  title: string;
  summary?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  servings?: number;
  tags: string[];
  ingredients: Array<{
    amount?: string;
    ingredientName: string;
    notes?: string;
  }>;
  steps: Array<{ instruction: string; durationMinutes?: number }>;
  notes?: string;
  sourceUrl?: string;
};

export type RecipeViewProps =
  | { state: "loading" }
  | { state: "error" }
  | { state: "recipe"; recipe: RecipeViewData };

function RecipeViewStatus({ state }: { state: "loading" | "error" }) {
  const loading = state === "loading";

  return (
    <main className="recipe-view" aria-busy={loading ? true : undefined}>
      <PageLayout>
        <PageHeader title="Recipe" />
        <PageContent>
          <Text as="p" role={loading ? "status" : "alert"}>
            {loading ? "Loading recipe…" : "This recipe could not be displayed."}
          </Text>
        </PageContent>
      </PageLayout>
    </main>
  );
}

function RecipeDetailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card as="section" padding="large">
      <Stack gap="150">
        <Heading as="h2" level={5}>
          {title}
        </Heading>
        {children}
      </Stack>
    </Card>
  );
}

function RecipeDetails({ recipe }: { recipe: RecipeViewData }) {
  const timing = [
    recipe.prepTimeMinutes === undefined ? undefined : `Prep: ${recipe.prepTimeMinutes} min`,
    recipe.cookTimeMinutes === undefined ? undefined : `Cook: ${recipe.cookTimeMinutes} min`,
    recipe.totalTimeMinutes === undefined ? undefined : `Total: ${recipe.totalTimeMinutes} min`,
    recipe.servings === undefined ? undefined : `Serves: ${recipe.servings}`,
  ].filter((detail): detail is string => detail !== undefined);

  return (
    <main className="recipe-view">
      <PageLayout>
        <PageHeader title={recipe.title} description={recipe.summary} />
        <PageContent>
          <Stack gap="200">
            {recipe.tags.length > 0 && (
              <Inline
                as="ul"
                gap="100"
                rowGap="050"
                style={{ listStyle: "none", margin: 0, padding: 0 }}
              >
                {recipe.tags.map((tag, index) => (
                  <li key={`${index}:${tag}`}>
                    <Chip>Tag: {tag}</Chip>
                  </li>
                ))}
              </Inline>
            )}

            {timing.length > 0 && (
              <Text as="p" appearance="secondary">
                {timing.join(" · ")}
              </Text>
            )}

            <RecipeDetailCard title="Ingredients">
              <ul className="recipe-view__list">
                {recipe.ingredients.map((ingredient, index) => {
                  const name = `${ingredient.amount ? `${ingredient.amount} ` : ""}${ingredient.ingredientName}`;
                  const label = ingredient.notes ? `${name} (${ingredient.notes})` : name;

                  return (
                    <li key={`${index}:${ingredient.ingredientName}`}>
                      <Text>{label}</Text>
                    </li>
                  );
                })}
              </ul>
            </RecipeDetailCard>

            <RecipeDetailCard title="Steps">
              <ol className="recipe-view__list">
                {recipe.steps.map((step, index) => (
                  <li key={`${index}:${step.instruction}`}>
                    <Text>
                      {step.instruction}
                      {step.durationMinutes !== undefined && ` (${step.durationMinutes} min)`}
                    </Text>
                  </li>
                ))}
              </ol>
            </RecipeDetailCard>

            {recipe.notes && (
              <RecipeDetailCard title="Notes">
                <div className="recipe-view__notes">
                  <Text as="p">{recipe.notes}</Text>
                </div>
              </RecipeDetailCard>
            )}

            {recipe.sourceUrl && (
              <Text as="p" appearance="secondary">
                <strong>Source: </strong>
                {recipe.sourceUrl}
              </Text>
            )}
          </Stack>
        </PageContent>
      </PageLayout>
    </main>
  );
}

export function RecipeView(props: RecipeViewProps) {
  if (props.state === "loading" || props.state === "error") {
    return <RecipeViewStatus state={props.state} />;
  }

  return <RecipeDetails recipe={props.recipe} />;
}
