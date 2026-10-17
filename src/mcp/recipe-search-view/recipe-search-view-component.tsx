import { RecipePreviewCard } from "../../components/shared/recipes/recipe-preview-card";
import { Grid } from "../../components/ui/grid/grid";
import { Heading } from "../../components/ui/heading/heading";
import { Stack } from "../../components/ui/stack/stack";
import { Text } from "../../components/ui/text/text";
import type { RecipeSearchViewState } from "./recipe-search-view-state";

import "./recipe-search-view.css";

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
          <Grid
            as="ul"
            aria-label="Recipe search results"
            columns={{ minWidth: 280, max: 2 }}
            className="recipe-search-results"
            gap="200"
            style={{ listStyle: "none", margin: 0, padding: 0 }}
          >
            {props.recipes.map((recipe) => (
              <li key={recipe.id}>
                <RecipePreviewCard recipe={recipe} />
              </li>
            ))}
          </Grid>
        )}
      </Stack>
    </main>
  );
}
