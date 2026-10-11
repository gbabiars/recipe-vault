import { List } from "@/components/ui/list";
import type { RecipeDocumentListSummary, RecipeSummary } from "@/lib/db/recipe-repository";

import { RecipeListItem } from "./recipe-list-item";
import styles from "./recipe-list.module.css";

type RecipeListProps =
  | { recipes: RecipeSummary[]; documentSummaries?: never }
  | { recipes?: never; documentSummaries: RecipeDocumentListSummary[] };

export function RecipeList(props: RecipeListProps) {
  return (
    <div className={styles.list}>
      <List aria-label="Recipes">
        {props.documentSummaries !== undefined
          ? props.documentSummaries.map((documentSummary) => (
              <RecipeListItem key={documentSummary.id} documentSummary={documentSummary} />
            ))
          : props.recipes.map((recipe) => <RecipeListItem key={recipe.id} recipe={recipe} />)}
      </List>
    </div>
  );
}
