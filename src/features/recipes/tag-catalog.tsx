import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Inline } from "@/components/ui/inline";
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
      <Stack as="ul" gap="200" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {tags.map((tag) => {
          const recipeHref = `/recipes?tag=${encodeURIComponent(tag.name)}`;
          return (
            <Card as="li" key={tag.id} label={tag.name} render={<Link href={recipeHref} />}>
              <Stack gap="150">
                <Stack gap="050">
                  <Heading as="h2" level={5}>
                    {tag.name}
                  </Heading>
                  {tag.description && (
                    <Text as="p" size="large">
                      {tag.description}
                    </Text>
                  )}
                </Stack>
                <Inline gap="100">
                  <Text size="large" appearance="secondary">
                    <Link href={recipeHref}>
                      {tag.usageCount} {tag.usageCount === 1 ? "recipe" : "recipes"}
                    </Link>
                  </Text>
                </Inline>
              </Stack>
            </Card>
          );
        })}
      </Stack>
      {(previousHref || nextHref) && (
        <nav aria-label="Tag pages">
          <Inline gap="100">
            {previousHref && (
              <Button
                label="Previous"
                href={previousHref}
                variant="subtle"
                render={<Link href={previousHref} />}
              />
            )}
            {nextHref && (
              <Button
                label="Next"
                href={nextHref}
                variant="subtle"
                render={<Link href={nextHref} />}
              />
            )}
          </Inline>
        </nav>
      )}
    </Stack>
  );
}
