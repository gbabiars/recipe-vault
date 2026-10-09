import { Chip } from "@/components/ui/chip";
import { Inline } from "@/components/ui/inline";
import { ListItem } from "@/components/ui/list";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { Clock, Users } from "lucide-react";
import type { RecipeSummary } from "@/lib/db/recipe-repository";

export function RecipeListItem({ recipe }: { recipe: RecipeSummary }) {
  return (
    <ListItem
      title={recipe.title}
      href={`/recipes/${recipe.id}`}
      description={
        <Stack as="span" gap="050">
          {(recipe.totalTimeMinutes !== undefined || recipe.servings !== undefined) && (
            <Inline as="span" gap="100" align="center">
              {recipe.totalTimeMinutes !== undefined && (
                <Inline as="span" gap="050" align="center">
                  <Clock aria-hidden="true" size={16} />
                  <Text>Total time: {recipe.totalTimeMinutes} min</Text>
                </Inline>
              )}
              {recipe.servings !== undefined && (
                <Inline as="span" gap="050" align="center">
                  <Users aria-hidden="true" size={16} />
                  <Text>Serves {recipe.servings}</Text>
                </Inline>
              )}
            </Inline>
          )}
          {recipe.tags.length > 0 && (
            <Inline as="span" gap="100">
              {recipe.tags.slice(0, 2).map((tag) => (
                <Chip key={tag}>{tag}</Chip>
              ))}
              {recipe.tags.length > 2 && <Chip>+{recipe.tags.length - 2}</Chip>}
            </Inline>
          )}
        </Stack>
      }
    />
  );
}
