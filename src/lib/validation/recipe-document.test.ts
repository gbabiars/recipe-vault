import assert from "node:assert/strict";
import test from "node:test";
import { recipeDocumentContentSchema, recipeDocumentSchema } from "./recipe-document";

const validDocument = {
  id: "8c0fb550-686a-4a0c-bf8f-690c1359c877",
  title: "Orange shortbread",
  description: "Crisp cookies with orange zest.",
  yield: { amount: 24, unit: "cookies" },
  time: { cookMinutes: 18 },
  ingredients: [{ name: "unsalted butter", amount: "1 cup", note: "softened" }],
  equipment: [{ name: "baking sheet" }],
  instructions: ["Cream the butter and sugar."],
  notes: ["The dough can be chilled overnight."],
  tags: ["baking", "cookies"],
  sourceUrl: "https://example.com/shortbread",
};

test("accepts a full document with a non-serving yield and optional time fields", () => {
  assert.deepEqual(recipeDocumentSchema.parse(validDocument), validDocument);
});

test("allows yield to be omitted and canonicalizes duplicate tags", () => {
  const { yield: _yield, ...documentWithoutYield } = validDocument;
  void _yield;
  const result = recipeDocumentSchema.parse({
    ...documentWithoutYield,
    tags: [" Weeknight  Meals ", "weeknight meals"],
  });

  assert.equal("yield" in result, false);
  assert.deepEqual(result.tags, ["weeknight meals"]);
});

test("rejects null yield, invalid IDs, incomplete arrays, and unknown fields", () => {
  const invalidDocuments = [
    { ...validDocument, yield: null },
    { ...validDocument, id: "recipe-1" },
    { ...validDocument, ingredients: [] },
    { ...validDocument, instructions: [] },
    { ...validDocument, equipment: [{ name: "sheet pan", extra: true }] },
    { ...validDocument, time: { prepMinutes: -1 } },
    { ...validDocument, tags: ["needs uppercase!"] },
    { ...validDocument, sourceUrl: "file:///tmp/recipe" },
    { ...validDocument, unexpected: "field" },
  ];

  for (const value of invalidDocuments) {
    assert.equal(recipeDocumentSchema.safeParse(value).success, false);
  }
});

test("validates create content without a server-assigned ID", () => {
  const { id: _id, ...content } = validDocument;
  void _id;

  assert.deepEqual(recipeDocumentContentSchema.parse(content), content);
  assert.equal(recipeDocumentContentSchema.safeParse(validDocument).success, false);
  assert.equal(
    recipeDocumentContentSchema.safeParse({ ...content, ownerId: "user_123" }).success,
    false,
  );
});
