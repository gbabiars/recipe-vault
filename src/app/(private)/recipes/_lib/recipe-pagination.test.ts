import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_RECIPE_PAGE_WITH_DB_OFFSET,
  parseRecipePage,
  recipePageHref,
  RECIPE_PAGE_SIZE,
} from "./recipe-pagination";

test("uses 25 recipes per page and caps offsets at the database integer limit", () => {
  assert.equal(RECIPE_PAGE_SIZE, 25);
  assert.equal(MAX_RECIPE_PAGE_WITH_DB_OFFSET, 85_899_346);
  assert.ok((MAX_RECIPE_PAGE_WITH_DB_OFFSET - 1) * RECIPE_PAGE_SIZE <= 2_147_483_647);
  assert.ok(MAX_RECIPE_PAGE_WITH_DB_OFFSET * RECIPE_PAGE_SIZE > 2_147_483_647);
});

for (const [value, expected] of [
  [undefined, 1],
  ["", 1],
  ["abc", 1],
  ["1.5", 1],
  ["-2", 1],
  ["0", 1],
  ["9007199254740992", 1],
  [["2", "3"], 1],
  ["1", 1],
  ["25", 25],
] as const) {
  test(`parses ${JSON.stringify(value)} as page ${expected}`, () => {
    assert.equal(parseRecipePage(value), expected);
  });
}

test("omits page 1 and preserves the raw search in the first-page URL", () => {
  assert.equal(recipePageHref({ tags: [], page: 1 }), "/recipes");
  assert.equal(
    recipePageHref({ q: "  curry night ", tags: [], page: 1 }),
    "/recipes?q=++curry+night+",
  );
});

test("preserves raw search text and repeated tags on later pages", () => {
  assert.equal(
    recipePageHref({ q: "  curry night ", tags: ["Dinner", "Quick & easy"], page: 3 }),
    "/recipes?q=++curry+night+&tag=Dinner&tag=Quick+%26+easy&page=3",
  );
});
