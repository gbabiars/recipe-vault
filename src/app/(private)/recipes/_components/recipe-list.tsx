import { List, ListItem } from "@/components/ui/list";
import { SkeletonHeading, SkeletonText, Skeleton } from "@/components/ui/skeleton";
import { Stack } from "@/components/ui/stack";
import { Inline } from "@/components/ui/inline";
import type { RecipeDocumentListSummary } from "@/lib/db/recipe-repository";

import { RecipeListItem } from "./recipe-list-item";
import styles from "./recipe-list.module.css";

export function RecipeList({
  documentSummaries,
}: {
  documentSummaries: RecipeDocumentListSummary[];
}) {
  return (
    <div className={styles.list}>
      <List aria-label="Recipes">
        {documentSummaries.map((documentSummary) => (
          <RecipeListItem key={documentSummary.id} documentSummary={documentSummary} />
        ))}
      </List>
    </div>
  );
}

export function RecipeListSkeleton() {
  return (
    <div className={styles.list} role="status" aria-label="Loading recipes">
      <List aria-label="Loading recipes">
        {Array.from({ length: 5 }, (_, index) => (
          <ListItem
            key={index}
            title={<SkeletonHeading level={6} width="300px" />}
            description={
              <Stack as="span" gap="050">
                <SkeletonText size="medium" width="400px" />
                <Inline gap="050">
                  <Skeleton width="120px" height="28px" radius="full" />
                  <Skeleton width="100px" height="28px" radius="full" />
                </Inline>
              </Stack>
            }
          />
        ))}
      </List>
    </div>
  );
}
