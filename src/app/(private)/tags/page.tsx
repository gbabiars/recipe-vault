import { TAG_PAGE_SIZE, parseTagCursor, tagPageHref } from "./_lib/tag-pagination";
import { TagsPageContent } from "./page-content";
import { requireUser } from "@/lib/auth/require-user";
import { getTagService } from "@/lib/recipes";

export default async function TagsPage({
  searchParams,
}: {
  searchParams: Promise<{ after?: string | string[]; before?: string | string[] }>;
}) {
  const user = await requireUser();
  const cursors = parseTagCursor(await searchParams);
  let tags: { name: string; usageCount: number }[] = [];
  let hasMore = false;
  let error = false;
  try {
    const inventory = await (
      await getTagService()
    ).listFromRecipes(user.id, {
      sort: "name_asc",
      limit: TAG_PAGE_SIZE,
      ...cursors,
    });
    tags = inventory.tags;
    hasMore = inventory.hasMore;
  } catch {
    error = true;
  }

  const firstTag = tags[0];
  const lastTag = tags.at(-1);
  const nextHref =
    !error && lastTag && (hasMore || cursors.before) ? tagPageHref(lastTag) : undefined;
  const previousHref =
    !error && firstTag && (cursors.after || (cursors.before && hasMore))
      ? tagPageHref(firstTag, "before")
      : undefined;

  return (
    <TagsPageContent tags={tags} error={error} nextHref={nextHref} previousHref={previousHref} />
  );
}
