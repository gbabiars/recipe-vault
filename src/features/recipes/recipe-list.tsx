import { List } from "@/components/ui/list";
import type { RecipeSummary } from "@/lib/db/recipe-repository";

import { RecipeListItem } from "./recipe-list-item";
import styles from "./recipe-list.module.css";

export function RecipeList({ recipes }: { recipes: RecipeSummary[] }) {
  return (
    <div className={styles.list}>
      <List aria-label="Recipes">
        {recipes.map((recipe) => (
          <RecipeListItem key={recipe.id} recipe={recipe} />
        ))}
      </List>
    </div>
  );
}
