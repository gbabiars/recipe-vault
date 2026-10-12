import assert from "node:assert/strict";
import { test } from "node:test";
import type { RecipeDocumentPage } from "@/lib/db/recipe-repository";
import type { RecipeService } from "@/lib/recipes/recipe-service";
import { loadRecipePage } from "./load-recipe-page";

function reader(responses: RecipeDocumentPage[]) {
  const calls: Array<{ ownerId: string; page: number; pageSize: number }> = [];
  const service: Pick<RecipeService, "listDocumentPage"> = {
    listDocumentPage: async (ownerId, options) => {
      calls.push({ ownerId, page: options.page, pageSize: options.pageSize });
      const result = responses.shift();
      if (!result) throw new Error("Unexpected page query");
      return result;
    },
  };
  return { calls, service };
}

test("rechecks the last page when recipes disappear between queries", async () => {
  const lastFive = [{ id: "recipe-26" }] as RecipeDocumentPage["items"];
  const { calls, service } = reader([
    { items: [], total: 53 },
    { items: [], total: 30 },
    { items: lastFive, total: 30 },
  ]);

  const result = await loadRecipePage(service, "owner-ada", {
    search: "soup",
    tags: ["quick"],
    requestedPage: 999,
  });

  assert.deepEqual(calls, [
    { ownerId: "owner-ada", page: 999, pageSize: 25 },
    { ownerId: "owner-ada", page: 3, pageSize: 25 },
    { ownerId: "owner-ada", page: 2, pageSize: 25 },
  ]);
  assert.equal(result.page, 2);
  assert.equal(result.pageCount, 2);
  assert.equal(result.total, 30);
  assert.equal(result.items, lastFive);
});

test("falls back to page 1 when counts keep shrinking", async () => {
  const firstTen = [{ id: "recipe-1" }] as RecipeDocumentPage["items"];
  const { calls, service } = reader([
    { items: [], total: 53 },
    { items: [], total: 30 },
    { items: [], total: 10 },
    { items: firstTen, total: 10 },
  ]);

  const result = await loadRecipePage(service, "owner-ada", {
    tags: [],
    requestedPage: 999,
  });

  assert.deepEqual(
    calls.map(({ page }) => page),
    [999, 3, 2, 1],
  );
  assert.equal(result.page, 1);
  assert.equal(result.pageCount, 1);
  assert.equal(result.items, firstTen);
});

test("guards the database offset for a huge valid page", async () => {
  const lastThree = [{ id: "recipe-51" }] as RecipeDocumentPage["items"];
  const { calls, service } = reader([
    { items: [], total: 53 },
    { items: lastThree, total: 53 },
  ]);

  const result = await loadRecipePage(service, "owner-ada", {
    tags: [],
    requestedPage: Number.MAX_SAFE_INTEGER,
  });

  assert.deepEqual(
    calls.map(({ page }) => page),
    [1, 3],
  );
  assert.equal(result.page, 3);
  assert.equal(result.items, lastThree);
});
