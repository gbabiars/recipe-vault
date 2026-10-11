import { PageContent, PageHeader, PageLayout } from "@/components/ui/page-layout";
import { DocumentTagCatalog } from "./_components/tag-catalog";
import {
  DOCUMENT_TAG_CATALOG_PAGE_SIZE,
  documentTagPageHref,
  parseDocumentTagCursor,
} from "./_lib/document-tag-pagination";
import { requireUser } from "@/lib/auth/require-user";
import { getTagService } from "@/lib/recipes";
import type { DocumentTagInventoryPage } from "@/lib/db/tag-repository";

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string | string[]; before?: string | string[] }>;
}) {
  const user = await requireUser();
  const cursors = parseDocumentTagCursor(await searchParams);
  let inventory: DocumentTagInventoryPage = { tags: [], hasMore: false };
  let error = false;

  try {
    inventory = await (
      await getTagService()
    ).listFromRecipes(user.id, {
      sort: "name_asc",
      limit: DOCUMENT_TAG_CATALOG_PAGE_SIZE,
      ...cursors,
    });
  } catch {
    error = true;
  }

  const lastTag = inventory.tags.at(-1);
  const hasNext = Boolean(lastTag && inventory.hasMore);

  return (
    <PageLayout>
      <PageHeader title="Tags" />
      <PageContent>
        <DocumentTagCatalog
          tags={inventory.tags}
          error={error}
          nextHref={!error && hasNext && lastTag ? documentTagPageHref(lastTag) : undefined}
        />
      </PageContent>
    </PageLayout>
  );
}
