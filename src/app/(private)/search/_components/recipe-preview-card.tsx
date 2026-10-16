import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Heading } from "@/components/ui/heading";
import { Inline } from "@/components/ui/inline";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { Clock } from "lucide-react";
import type { RecipeSummary } from "@/lib/db/recipe-repository";

type PreviewRecipe = Pick<RecipeSummary, "id" | "title" | "description" | "time" | "tags">;

export function RecipePreviewCard({ recipe }: { recipe: PreviewRecipe }) {
  return (
    <Card
      as="article"
      href={`/recipes/${encodeURIComponent(recipe.id)}`}
      label={`View ${recipe.title}`}
    >
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
    </Card>
  );
}
