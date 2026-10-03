export type RecipeSearchResult = {
  id: string;
  title: string;
  summary?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  servings?: number;
  tags: string[];
};

export type RecipeSearchViewState =
  | { state: "loading" }
  | { state: "error" }
  | { state: "empty" }
  | { state: "recipes"; recipes: RecipeSearchResult[] };

const searchPayloadKeys = ["recipes"];
const recipeKeys = [
  "id",
  "title",
  "summary",
  "prepTimeMinutes",
  "cookTimeMinutes",
  "totalTimeMinutes",
  "servings",
  "tags",
];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: string[]) {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function isOptionalNonNegativeInteger(value: unknown) {
  return (
    value === undefined || (typeof value === "number" && Number.isInteger(value) && value >= 0)
  );
}

function isRecipeSearchResult(value: unknown): value is RecipeSearchResult {
  if (!isRecord(value) || !hasOnlyKeys(value, recipeKeys)) return false;

  return (
    typeof value.id === "string" &&
    uuidPattern.test(value.id) &&
    typeof value.title === "string" &&
    (value.summary === undefined || typeof value.summary === "string") &&
    isOptionalNonNegativeInteger(value.prepTimeMinutes) &&
    isOptionalNonNegativeInteger(value.cookTimeMinutes) &&
    isOptionalNonNegativeInteger(value.totalTimeMinutes) &&
    (value.servings === undefined ||
      (typeof value.servings === "number" &&
        Number.isInteger(value.servings) &&
        value.servings > 0)) &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string")
  );
}

export function getRecipeSearchViewState(
  structuredContent: unknown,
  isError = false,
): RecipeSearchViewState {
  if (
    isError ||
    !isRecord(structuredContent) ||
    !hasOnlyKeys(structuredContent, searchPayloadKeys) ||
    !Array.isArray(structuredContent.recipes) ||
    !structuredContent.recipes.every(isRecipeSearchResult)
  ) {
    return { state: "error" };
  }

  if (structuredContent.recipes.length === 0) return { state: "empty" };

  return { state: "recipes", recipes: structuredContent.recipes };
}
