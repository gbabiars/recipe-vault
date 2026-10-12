import type { RecipeService } from "@/lib/recipes/recipe-service";
import { MAX_RECIPE_PAGE_WITH_DB_OFFSET, RECIPE_PAGE_SIZE } from "./recipe-pagination";

type RecipePageReader = Pick<RecipeService, "listDocumentPage">;

function pageCount(total: number) {
  return Math.min(MAX_RECIPE_PAGE_WITH_DB_OFFSET, Math.max(1, Math.ceil(total / RECIPE_PAGE_SIZE)));
}

export async function loadRecipePage(
  recipeService: RecipePageReader,
  ownerId: string,
  {
    search,
    tags,
    requestedPage,
  }: {
    search?: string;
    tags: string[];
    requestedPage: number;
  },
) {
  const options = { search, tags, pageSize: RECIPE_PAGE_SIZE };
  const loadPage = (page: number) => recipeService.listDocumentPage(ownerId, { ...options, page });

  let page = requestedPage > MAX_RECIPE_PAGE_WITH_DB_OFFSET ? 1 : requestedPage;
  let result = await loadPage(page);
  for (let retry = 0; retry < 2; retry++) {
    const lastPage = pageCount(result.total);
    const nextPage = Math.min(requestedPage, lastPage);
    if (nextPage === page) break;
    page = nextPage;
    result = await loadPage(page);
  }

  // Counts can shrink between requests. Page 1 is always populated when total is positive.
  if (result.total > 0 && result.items.length === 0) {
    page = 1;
    result = await loadPage(page);
  }

  return { ...result, page, pageCount: pageCount(result.total) };
}
