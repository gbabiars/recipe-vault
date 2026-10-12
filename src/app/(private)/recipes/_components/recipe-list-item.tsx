import { Chip } from "@/components/ui/chip";
import { Inline } from "@/components/ui/inline";
import { ListItem } from "@/components/ui/list";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { Clock } from "lucide-react";
import type { RecipeDocumentListSummary } from "@/lib/db/recipe-repository";

export function RecipeListItem({
  documentSummary,
}: {
  documentSummary: RecipeDocumentListSummary;
}) {
  return <DocumentRecipeListItem summary={documentSummary} />;
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
