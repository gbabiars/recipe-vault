import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Heading } from "@/components/ui/heading";
import { Inline } from "@/components/ui/inline";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import type { RecipeSummary } from "@/lib/db/recipe-repository";

import styles from "./recipe-list-card.module.css";

export function RecipeListCard({ recipe }: { recipe: RecipeSummary }) {
  return (
    <Card as="li" label={`View ${recipe.title}`} render={<Link href={`/recipes/${recipe.id}`} />}>
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
        <Inline className={styles.metadata} gap="100">
          {recipe.totalTimeMinutes !== undefined && (
            <Text size="large">{recipe.totalTimeMinutes} min</Text>
          )}
          <Text size="large">
            Updated{" "}
            {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
              new Date(recipe.updatedAt),
            )}
          </Text>
        </Inline>
        <Inline gap="100">
          {[...recipe.tags, ...recipe.dietaryFlags].map((label) => (
            <Chip key={label}>{label}</Chip>
          ))}
        </Inline>
      </Stack>
    </Card>
  );
}
