import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Inline } from "@/components/ui/inline";
import { List, ListItem } from "@/components/ui/list";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import type { TagInventoryItem } from "@/lib/db/tag-repository";

export type TagCatalogProps = {
  tags: TagInventoryItem[];
  previousHref?: string;
  nextHref?: string;
  error?: boolean;
};

export function TagCatalog({ tags, previousHref, nextHref, error = false }: TagCatalogProps) {
  if (error) {
    return (
      <div role="alert">
        <Card as="div">
          <Text as="p" appearance="error">
            Tags could not be loaded. Refresh the page to try again.
          </Text>
        </Card>
      </div>
    );
  }

  if (tags.length === 0) {
    return (
      <Card as="section" padding="large">
        <Stack gap="150">
          <Heading as="h2" level={3}>
            No tags yet
          </Heading>
          <Text as="p">Tag names will appear here when you add them to recipes.</Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="200">
      <Card padding="none">
        <Stack paddingBlock="100" paddingInline="0">
          <List aria-label="Tags">
            {tags.map((tag) => {
              const recipeHref = `/recipes?tag=${encodeURIComponent(tag.name)}`;
              return (
                <ListItem
                  key={tag.id}
                  title={tag.name}
                  href={recipeHref}
                  description={
                    <>
                      {tag.description && `${tag.description} · `}
                      {tag.usageCount} {tag.usageCount === 1 ? "recipe" : "recipes"}
                    </>
                  }
                />
              );
            })}
          </List>
        </Stack>
      </Card>
      {(previousHref || nextHref) && (
        <nav aria-label="Tag pages">
          <Inline gap="100">
            {previousHref && <Button label="Previous" href={previousHref} variant="subtle" />}
            {nextHref && <Button label="Next" href={nextHref} variant="subtle" />}
          </Inline>
        </nav>
      )}
    </Stack>
  );
}
