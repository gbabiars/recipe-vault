import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Heading } from "@/components/ui/heading";
import { Inline } from "@/components/ui/inline";
import { List, ListItem } from "@/components/ui/list";
import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { TAG_PAGE_SIZE, encodeTagCursor, parseTagCursor } from "./_lib/tag-pagination";
import { requireUser } from "@/lib/auth/require-user";
import { getTagService } from "@/lib/recipes";

async function fetchTagsPage(
  userId: string,
  cursors: ReturnType<typeof parseTagCursor>,
): Promise<{ tags: { name: string; usageCount: number }[]; hasMore: boolean; error: boolean }> {
  try {
    const inventory = await (
      await getTagService()
    ).listFromRecipes(userId, {
      sort: "name_asc",
      limit: TAG_PAGE_SIZE,
      ...cursors,
    });
    return { tags: inventory.tags, hasMore: inventory.hasMore, error: false };
  } catch {
    return { tags: [], hasMore: false, error: true };
  }
}

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string | string[]; before?: string | string[] }>;
}) {
  const user = await requireUser();
  const cursors = parseTagCursor(await searchParams);
  const { tags, hasMore, error } = await fetchTagsPage(user.id, cursors);

  const firstTag = tags[0];
  const lastTag = tags.at(-1);
  const nextHref =
    !error && lastTag && (hasMore || cursors.before)
      ? `/tags?after=${encodeURIComponent(encodeTagCursor(lastTag))}`
      : undefined;
  const previousHref =
    !error && firstTag && (cursors.after || (cursors.before && hasMore))
      ? `/tags?before=${encodeURIComponent(encodeTagCursor(firstTag))}`
      : undefined;

  return (
    <PageLayout>
      <PageHeader title="Tags" />
      <PageContent>
        {error ? (
          <Alert
            description="Refresh the page to try again."
            title="Tags could not be loaded"
            variant="danger"
          />
        ) : tags.length === 0 ? (
          <Card as="section" padding="large">
            <Stack gap="150">
              <Heading as="h2" level={3}>
                No tags yet
              </Heading>
              <Text as="p">Tag names will appear here when you add them to recipes.</Text>
            </Stack>
          </Card>
        ) : (
          <Stack gap="200">
            <Card padding="none">
              <Stack paddingBlock="100" paddingInline="0">
                <List aria-label="Tags">
                  {tags.map((tag) => (
                    <ListItem
                      key={tag.name}
                      title={tag.name}
                      href={`/recipes?tag=${encodeURIComponent(tag.name)}`}
                      description={`${tag.usageCount} ${tag.usageCount === 1 ? "recipe" : "recipes"}`}
                    />
                  ))}
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
        )}
      </PageContent>
    </PageLayout>
  );
}
