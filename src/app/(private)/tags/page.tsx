import { TAG_PAGE_SIZE, encodeTagCursor, parseTagCursor } from "./_lib/tag-pagination";
import { TagsPageContent } from "./page-content";
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
    <TagsPageContent tags={tags} error={error} nextHref={nextHref} previousHref={previousHref} />
  );
}
