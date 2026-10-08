import { Card } from "@/components/ui/card";
import { List } from "@/components/ui/list";
import { Stack } from "@/components/ui/stack";
import type { RecipeSummary } from "@/lib/db/recipe-repository";

import { RecipeListItem } from "./recipe-list-item";

export function RecipeList({ recipes }: { recipes: RecipeSummary[] }) {
  return (
    <Card padding="none">
      <Stack paddingBlock="100" paddingInline="0">
        <List aria-label="Recipes">
          {recipes.map((recipe) => (
            <RecipeListItem key={recipe.id} recipe={recipe} />
          ))}
        </List>
      </Stack>
    </Card>
  );
}
