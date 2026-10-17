import { Clock } from "lucide-react";

import { Card } from "../../../ui/card/card";
import { Chip } from "../../../ui/chip/chip";
import { Heading } from "../../../ui/heading/heading";
import { Inline } from "../../../ui/inline/inline";
import { Stack } from "../../../ui/stack/stack";
import { Text } from "../../../ui/text/text";
import styles from "./recipe-preview-card.module.css";

export type RecipePreview = {
  title: string;
  description: string;
  time: { totalMinutes?: number };
  tags: string[];
};

export type RecipePreviewCardProps = {
  recipe: RecipePreview;
  href?: string;
};

export function RecipePreviewCard({ recipe, href }: RecipePreviewCardProps) {
  const content = (
    <Stack gap="150">
      <Heading as="h2" level={5}>
        {recipe.title}
      </Heading>
      {recipe.description && <Text as="p">{recipe.description}</Text>}
      {recipe.time.totalMinutes !== undefined && (
        <Inline gap="050" align="center">
          <Clock aria-hidden="true" size={16} />
          <Text>{recipe.time.totalMinutes} min</Text>
        </Inline>
      )}
      {recipe.tags.length > 0 && (
        <Inline gap="100">
          {recipe.tags.slice(0, 2).map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
          {recipe.tags.length > 2 && <Chip>+{recipe.tags.length - 2}</Chip>}
        </Inline>
      )}
    </Stack>
  );

  if (href === undefined) {
    return (
      <Card as="article" className={styles.card}>
        {content}
      </Card>
    );
  }

  return (
    <Card as="article" className={styles.card} href={href} label={`View ${recipe.title}`}>
      {content}
    </Card>
  );
}
