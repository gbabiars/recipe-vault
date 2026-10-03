import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { TagCatalog } from "@/features/recipes/tag-catalog";
import {
  parseTagPageCursors,
  tagPageHref,
  TAG_CATALOG_PAGE_SIZE,
} from "@/features/recipes/tag-pagination";
import { requireUser } from "@/lib/auth/require-user";
import { getTagService } from "@/lib/recipes";
import type { TagInventoryPage } from "@/lib/db/tag-repository";

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string | string[]; before?: string | string[] }>;
}) {
  const user = await requireUser();
  const cursors = parseTagPageCursors(await searchParams);
  let inventory: TagInventoryPage = { tags: [], hasMore: false };
  let error = false;

  try {
    inventory = await (
      await getTagService()
    ).list(user.id, {
      usage: "all",
      sort: "name_asc",
      limit: TAG_CATALOG_PAGE_SIZE,
      ...cursors,
    });
  } catch {
    error = true;
  }

  const firstTag = inventory.tags[0];
  const lastTag = inventory.tags.at(-1);
  const hasPrevious = Boolean(firstTag && (cursors.before ? inventory.hasMore : cursors.after));
  const hasNext = Boolean(lastTag && (cursors.before || inventory.hasMore));

  return (
    <PageLayout>
      <PageHeader title="Tags" />
      <PageContent>
        <TagCatalog
          tags={inventory.tags}
          error={error}
          previousHref={
            !error && hasPrevious && firstTag ? tagPageHref("before", firstTag) : undefined
          }
          nextHref={!error && hasNext && lastTag ? tagPageHref("after", lastTag) : undefined}
        />
      </PageContent>
    </PageLayout>
  );
}
