import { Card } from "../../components/ui/card/card";
import { Chip } from "../../components/ui/chip/chip";
import { Heading } from "../../components/ui/heading/heading";
import { Inline } from "../../components/ui/inline/inline";
import { Stack } from "../../components/ui/stack/stack";
import { Text } from "../../components/ui/text/text";
import type { RecipeSearchResult, RecipeSearchViewState } from "./recipe-search-view-state";

import "./recipe-search-view.css";

function RecipeResultCard({ recipe }: { recipe: RecipeSearchResult }) {
  const metadata = [
    recipe.prepTimeMinutes === undefined ? undefined : "Prep: " + recipe.prepTimeMinutes + " min",
    recipe.cookTimeMinutes === undefined ? undefined : "Cook: " + recipe.cookTimeMinutes + " min",
    recipe.totalTimeMinutes === undefined
      ? undefined
      : "Total: " + recipe.totalTimeMinutes + " min",
    recipe.servings === undefined ? undefined : "Serves: " + recipe.servings,
  ].filter((detail): detail is string => detail !== undefined);

  return (
    <Card as="li" padding="medium">
      <Stack gap="150">
        <Stack gap="050">
          <Heading as="h2" level={5}>
            {recipe.title}
          </Heading>
          {recipe.summary && (
            <Text as="p" size="large">
              {recipe.summary}
            </Text>
          )}
        </Stack>
        {metadata.length > 0 && (
          <Text as="p" size="small" appearance="secondary">
            {metadata.join(" · ")}
          </Text>
        )}
        {recipe.tags.length > 0 && (
          <Inline
            as="ul"
            aria-label={"Tags for " + recipe.title}
            gap="100"
            rowGap="050"
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            {recipe.tags.map((tag, index) => (
              <li key={recipe.id + ":" + index + ":" + tag}>
                <Chip>{tag}</Chip>
              </li>
            ))}
          </Inline>
        )}
      </Stack>
    </Card>
  );
}

export function RecipeSearchView(props: RecipeSearchViewState) {
  const isLoading = props.state === "loading";

  return (
    <main className="recipe-search-view" aria-busy={isLoading ? true : undefined}>
      <Stack gap="200">
        <Heading as="h1" level={2}>
          Search results
        </Heading>
        {props.state === "loading" && (
          <Text as="p" role="status">
            Loading search results…
          </Text>
        )}
        {props.state === "error" && (
          <Text as="p" role="alert">
            Search results could not be displayed.
          </Text>
        )}
        {props.state === "empty" && (
          <Text as="p" role="status">
            No recipes matched this search.
          </Text>
        )}
        {props.state === "recipes" && (
          <Stack
            as="ul"
            aria-label="Recipe search results"
            gap="150"
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            {props.recipes.map((recipe) => (
              <RecipeResultCard key={recipe.id} recipe={recipe} />
            ))}
          </Stack>
        )}
      </Stack>
    </main>
  );
}
