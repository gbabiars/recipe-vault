const MAX_DATABASE_OFFSET = 2_147_483_647;

export const RECIPE_PAGE_SIZE = 25;
export const MAX_RECIPE_PAGE_WITH_DB_OFFSET =
  Math.floor(MAX_DATABASE_OFFSET / RECIPE_PAGE_SIZE) + 1;

/** Parse a one-based page number, restarting at page 1 for invalid input. */
export function parseRecipePage(value: unknown): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return 1;

  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function recipePageHref({
  q,
  tags,
  page,
}: {
  q?: string;
  tags: string[];
  page: number;
}): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  for (const tag of tags) params.append("tag", tag);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/recipes?${query}` : "/recipes";
}
