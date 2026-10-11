export type RecipeSearchResult = {
  id: string;
  title: string;
  description: string;
  yield?: { amount: number; unit: string };
  time: { prepMinutes?: number; cookMinutes?: number; totalMinutes?: number };
  tags: string[];
  revision: number;
};

export type RecipeSearchViewState =
  | { state: "loading" }
  | { state: "error" }
  | { state: "empty" }
  | { state: "recipes"; recipes: RecipeSearchResult[] };

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
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["id", "title", "description", "yield", "time", "tags", "revision"])
  )
    return false;

  const recipeYield = value.yield;
  const time = value.time;
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
  return (
    typeof value.id === "string" &&
    uuidPattern.test(value.id) &&
    typeof value.title === "string" &&
    typeof value.description === "string" &&
    (recipeYield === undefined ||
      (isRecord(recipeYield) &&
        hasOnlyKeys(recipeYield, ["amount", "unit"]) &&
        typeof recipeYield.amount === "number" &&
        recipeYield.amount > 0 &&
        typeof recipeYield.unit === "string" &&
        recipeYield.unit.length > 0)) &&
    isRecord(time) &&
    hasOnlyKeys(time, ["prepMinutes", "cookMinutes", "totalMinutes"]) &&
    isOptionalNonNegativeInteger(time.prepMinutes) &&
    isOptionalNonNegativeInteger(time.cookMinutes) &&
    isOptionalNonNegativeInteger(time.totalMinutes) &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string") &&
    typeof value.revision === "number" &&
    Number.isInteger(value.revision) &&
    value.revision > 0
  );
}

export function getRecipeSearchViewState(
  structuredContent: unknown,
  isError = false,
): RecipeSearchViewState {
  if (
    isError ||
    !isRecord(structuredContent) ||
    !hasOnlyKeys(structuredContent, ["recipes"]) ||
    !Array.isArray(structuredContent.recipes) ||
    !structuredContent.recipes.every(isRecipeSearchResult)
  ) {
    return { state: "error" };
  }

  if (structuredContent.recipes.length === 0) return { state: "empty" };
  return { state: "recipes", recipes: structuredContent.recipes };
}
