import assert from "node:assert/strict";
import test from "node:test";
import { mapExtractedDocumentContent } from "./import-recipe";

const extractedDocument = {
  title: "Quick pickled onions",
  ingredients: [{ name: "red onion", amount: "1", note: "thinly sliced" }],
  instructions: ["Put the onion in a jar."],
};

test("document extraction omits unstated yield and defaults absent collections", () => {
  const recipe = mapExtractedDocumentContent(extractedDocument);

  assert.deepEqual(recipe, {
    title: "Quick pickled onions",
    description: "",
    time: {},
    ingredients: [{ name: "red onion", amount: "1", note: "thinly sliced" }],
    equipment: [],
    instructions: ["Put the onion in a jar."],
    notes: [],
    tags: [],
  });
  assert.equal("yield" in recipe, false);
  assert.equal("sourceUrl" in recipe, false);
});

test("document extraction preserves a non-serving yield and supplied source URL", () => {
  const recipe = mapExtractedDocumentContent(
    {
      ...extractedDocument,
      description: "Tangy onions for tacos.",
      yield: { amount: 1, unit: "jar" },
      time: { prepMinutes: 10 },
      equipment: [{ name: "jar" }],
      notes: ["Chill before serving."],
      tags: ["condiments"],
    },
    "https://example.com/pickled-onions",
  );

  assert.deepEqual(recipe.yield, { amount: 1, unit: "jar" });
  assert.deepEqual(recipe.time, { prepMinutes: 10 });
  assert.deepEqual(recipe.equipment, [{ name: "jar" }]);
  assert.deepEqual(recipe.notes, ["Chill before serving."]);
  assert.deepEqual(recipe.tags, ["condiments"]);
  assert.equal(recipe.sourceUrl, "https://example.com/pickled-onions");
});

test("document extraction rejects invalid model output and invalid source URLs", () => {
  assert.throws(
    () => mapExtractedDocumentContent({ ...extractedDocument, ingredients: [] }),
    /no_recipe/,
  );
  assert.throws(
    () => mapExtractedDocumentContent({ ...extractedDocument, instructions: [] }),
    /no_recipe/,
  );
  assert.throws(
    () =>
      mapExtractedDocumentContent({ ...extractedDocument, yield: { amount: 0, unit: "servings" } }),
    /no_recipe/,
  );
  assert.throws(
    () => mapExtractedDocumentContent(extractedDocument, "file:///tmp/recipe.pdf"),
    /no_recipe/,
  );
});
