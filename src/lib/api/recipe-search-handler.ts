import type { RecipeService } from "@/lib/recipes/recipe-service";
import {
  recipeSearchRequestSchema,
  type RecipeSearchParse,
  type RecipeSearchPreference,
} from "@/lib/validation/recipe-search";
import { buildRecipeSearchQuery } from "@/lib/recipes/recipe-search-parser";
import type { RateLimiter } from "./rate-limit";
import { defaultRateLimiter, recipeSearchLimit } from "./rate-limit";
import { logApiEvent, requestId } from "./observability";

type ApiDependencies = {
  getUser: () => Promise<{ id: string } | null>;
  getService: () => Promise<RecipeService>;
  parseSearch: (prompt: string) => Promise<RecipeSearchParse>;
  limiter?: RateLimiter;
};

function responseError(status: number, code: string, message: string, id: string) {
  return Response.json(
    { error: { code, message, requestId: id } },
    { status, headers: { "cache-control": "private, no-store" } },
  );
}

function unexpected(id: string, event: string) {
  logApiEvent({ level: "error", requestId: id, event });
  return responseError(500, "internal_error", "Unable to search recipes.", id);
}

function searchPreference(
  preferences: RecipeSearchParse["preferences"],
): RecipeSearchPreference | undefined {
  switch (preferences.join("-")) {
    case "easy":
      return "easy";
    case "quick":
      return "quick";
    case "easy-quick":
      return "easy-quick";
    case "quick-easy":
      return "quick-easy";
    default:
      return undefined;
  }
}

export function createRecipeSearchApi(deps: ApiDependencies) {
  return {
    async post(request: Request) {
      const id = requestId(request);
      let user: { id: string } | null;
      try {
        user = await deps.getUser();
      } catch {
        return unexpected(id, "recipe_search_auth_failed");
      }
      if (!user) return responseError(401, "unauthenticated", "Authentication is required.", id);

      const limited = (deps.limiter ?? defaultRateLimiter).check(
        `${user.id}:recipe-search`,
        recipeSearchLimit,
      );
      if (!limited.allowed) {
        return Response.json(
          { error: { code: "rate_limited", message: "Too many requests.", requestId: id } },
          {
            status: 429,
            headers: {
              "cache-control": "private, no-store",
              "retry-after": String(limited.retryAfterSeconds),
            },
          },
        );
      }

      let input: unknown;
      try {
        input = await request.json();
      } catch {
        return responseError(400, "invalid_json", "Request body must be valid JSON.", id);
      }
      const requestBody = recipeSearchRequestSchema.safeParse(input);
      if (!requestBody.success) {
        return responseError(422, "invalid_request", "Enter a recipe or ingredient to search.", id);
      }

      let search: string | undefined;
      let preference: RecipeSearchPreference | undefined;
      try {
        const parsed = await deps.parseSearch(requestBody.data.prompt);
        search = buildRecipeSearchQuery(parsed.matchAny);
        preference = searchPreference(parsed.preferences);
      } catch {
        logApiEvent({ level: "error", requestId: id, event: "recipe_search_parse_failed" });
        return responseError(
          503,
          "search_unavailable",
          "Recipe search is temporarily unavailable. Please try again.",
          id,
        );
      }

      if (!search && !preference) {
        return Response.json(
          { data: [], meta: { page: 1, pageSize: 25, total: 0, requestId: id } },
          { headers: { "cache-control": "private, no-store" } },
        );
      }

      try {
        const service = await deps.getService();
        const page = await service.listRecipes(user.id, {
          search,
          preference,
          tags: [],
          page: 1,
          pageSize: 25,
        });
        return Response.json(
          {
            data: page.items,
            meta: { page: 1, pageSize: 25, total: page.total, requestId: id },
          },
          { headers: { "cache-control": "private, no-store" } },
        );
      } catch {
        return unexpected(id, "recipe_search_failed");
      }
    },
  };
}
