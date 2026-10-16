import assert from "node:assert/strict";
import test from "node:test";
import { buildRecipeSearchQuery } from "./recipe-search-parser";

test("joins multiple search alternatives with OR", () => {
  assert.equal(buildRecipeSearchQuery(["Japanese", "beef"]), '"Japanese" OR "beef"');
});

test("keeps a multiword alternative together as a quoted phrase", () => {
  assert.equal(buildRecipeSearchQuery(["smash burger"]), '"smash burger"');
});

test("deduplicates alternatives without changing their display casing", () => {
  assert.equal(
    buildRecipeSearchQuery(["Japanese", "japanese", "beef stew"]),
    '"Japanese" OR "beef stew"',
  );
});

test("keeps returned text inside a phrase instead of accepting search operators", () => {
  assert.equal(buildRecipeSearchQuery(['chicken" OR "beef']), '"chicken OR beef"');
});

test("returns no database query when there are no valid alternatives", () => {
  assert.equal(buildRecipeSearchQuery([]), undefined);
  assert.equal(buildRecipeSearchQuery(["  ", '"\\']), undefined);
});
