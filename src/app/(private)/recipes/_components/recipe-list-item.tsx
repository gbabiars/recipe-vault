import { Chip } from "@/components/ui/chip";
import { Inline } from "@/components/ui/inline";
import { ListItem } from "@/components/ui/list";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { Clock, Users } from "lucide-react";
import type { RecipeDocumentListSummary, RecipeSummary } from "@/lib/db/recipe-repository";

type RecipeListItemProps =
  | { recipe: RecipeSummary; documentSummary?: never }
  | { recipe?: never; documentSummary: RecipeDocumentListSummary };

export function RecipeListItem(props: RecipeListItemProps) {
  if (props.documentSummary) {
    return <DocumentRecipeListItem summary={props.documentSummary} />;
  }

  const { recipe } = props;
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

function DocumentRecipeListItem({ summary }: { summary: RecipeDocumentListSummary }) {
  const timeMetadata = [
    summary.time.prepMinutes !== undefined && `Prep: ${summary.time.prepMinutes} min`,
    summary.time.cookMinutes !== undefined && `Cook: ${summary.time.cookMinutes} min`,
    summary.time.totalMinutes !== undefined && `Total time: ${summary.time.totalMinutes} min`,
  ].filter((value): value is string => Boolean(value));

  return (
    <ListItem
      title={summary.title}
      href={`/recipes/${summary.id}`}
      description={
        <Stack as="span" gap="050">
          {summary.description && <Text>{summary.description}</Text>}
          {(timeMetadata.length > 0 || summary.yield !== undefined) && (
            <Inline as="span" gap="100" align="center">
              {timeMetadata.length > 0 && (
                <Inline as="span" gap="050" align="center">
                  <Clock aria-hidden="true" size={16} />
                  {timeMetadata.map((value) => (
                    <Text key={value}>{value}</Text>
                  ))}
                </Inline>
              )}
              {summary.yield && (
                <Text>
                  Yield: {summary.yield.amount} {summary.yield.unit}
                </Text>
              )}
            </Inline>
          )}
          {summary.tags.length > 0 && (
            <Inline as="span" gap="100">
              {summary.tags.slice(0, 2).map((tag) => (
                <Chip key={tag}>{tag}</Chip>
              ))}
              {summary.tags.length > 2 && <Chip>+{summary.tags.length - 2}</Chip>}
            </Inline>
          )}
        </Stack>
      }
    />
  );
}
