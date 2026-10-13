import type { ReactNode } from "react";

import { Card } from "../../components/ui/card/card";
import { Chip } from "../../components/ui/chip/chip";
import { Heading } from "../../components/ui/heading/heading";
import { Inline } from "../../components/ui/inline/inline";
import { PageContent, PageHeader, PageLayout } from "../../components/ui/page-layout/page-layout";
import { Stack } from "../../components/ui/stack/stack";
import { Text } from "../../components/ui/text/text";
import type { Recipe } from "@/lib/validation/recipe";

import "./recipe-view.css";

export type RecipeViewData = Recipe;

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
  const metadata = [
    recipe.time.prepMinutes === undefined ? undefined : `Prep: ${recipe.time.prepMinutes} min`,
    recipe.time.cookMinutes === undefined ? undefined : `Cook: ${recipe.time.cookMinutes} min`,
    recipe.time.totalMinutes === undefined ? undefined : `Total: ${recipe.time.totalMinutes} min`,
    recipe.yield === undefined ? undefined : `Yield: ${recipe.yield.amount} ${recipe.yield.unit}`,
  ].filter((detail): detail is string => detail !== undefined);

  return (
    <main className="recipe-view">
      <PageLayout>
        <PageHeader title={recipe.title} description={recipe.description || undefined} />
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

            {metadata.length > 0 && (
              <Text as="p" appearance="secondary">
                {metadata.join(" · ")}
              </Text>
            )}

            <RecipeDetailCard title="Ingredients">
              <ul className="recipe-view__list">
                {recipe.ingredients.map((ingredient, index) => {
                  const name = `${ingredient.amount ? `${ingredient.amount} ` : ""}${ingredient.name}`;
                  const label = ingredient.note ? `${name} (${ingredient.note})` : name;

                  return (
                    <li key={`${index}:${ingredient.name}`}>
                      <Text>{label}</Text>
                    </li>
                  );
                })}
              </ul>
            </RecipeDetailCard>

            <RecipeDetailCard title="Instructions">
              <ol className="recipe-view__list">
                {recipe.instructions.map((instruction, index) => (
                  <li key={`${index}:${instruction}`}>
                    <Text>{instruction}</Text>
                  </li>
                ))}
              </ol>
            </RecipeDetailCard>

            {recipe.equipment.length > 0 && (
              <RecipeDetailCard title="Equipment">
                <ul className="recipe-view__list">
                  {recipe.equipment.map((item, index) => (
                    <li key={`${index}:${item.name}`}>
                      <Text>{item.note ? `${item.name} (${item.note})` : item.name}</Text>
                    </li>
                  ))}
                </ul>
              </RecipeDetailCard>
            )}

            {recipe.notes.length > 0 && (
              <RecipeDetailCard title="Notes">
                <div className="recipe-view__notes">
                  <ul className="recipe-view__list">
                    {recipe.notes.map((note, index) => (
                      <li key={`${index}:${note}`}>
                        <Text>{note}</Text>
                      </li>
                    ))}
                  </ul>
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
