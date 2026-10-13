import assert from "node:assert/strict";
import test from "node:test";
import type { LegacyRecipe } from "@/lib/db/recipe-repository";
import { convertLegacyRecipeToDocument } from "./legacy-document-converter";

function legacyRecipe(overrides: Partial<LegacyRecipe> = {}): LegacyRecipe {
  return {
    id: "8c0fb550-686a-4a0c-bf8f-690c1359c877",
    ownerId: "user_123",
    title: "Fried rice",
    summary: "Use cooled rice.",
    prepTimeMinutes: 10,
    cookTimeMinutes: 12,
    totalTimeMinutes: 22,
    servings: 4,
    tags: ["weeknight"],
    sourceUrl: "https://example.com/fried-rice",
    notes: "Use a hot wok.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ingredients: [
      { displayOrder: 2, ingredientName: "garlic", amount: "3 cloves", notes: "minced" },
      { displayOrder: 1, ingredientName: "rice", amount: "6 cups", notes: "cooled" },
    ],
    steps: [
      { stepOrder: 2, instruction: "Fry the rice.", durationMinutes: 0 },
      { stepOrder: 1, instruction: "Heat the wok.", durationMinutes: 2 },
    ],
    ...overrides,
  };
}

test("converts legacy fields, preserves child order, and appends every duration", () => {
  const source = legacyRecipe();
  const originalIngredients = structuredClone(source.ingredients);
  const originalSteps = structuredClone(source.steps);

  const document = convertLegacyRecipeToDocument(source);

  assert.deepEqual(document, {
    id: source.id,
    title: "Fried rice",
    description: "Use cooled rice.",
    yield: { amount: 4, unit: "servings" },
    time: { prepMinutes: 10, cookMinutes: 12, totalMinutes: 22 },
    ingredients: [
      { name: "rice", amount: "6 cups", note: "cooled" },
      { name: "garlic", amount: "3 cloves", note: "minced" },
    ],
    equipment: [],
    instructions: ["Heat the wok. (Duration: 2 minutes)", "Fry the rice. (Duration: 0 minutes)"],
    notes: ["Use a hot wok."],
    tags: ["weeknight"],
    sourceUrl: "https://example.com/fried-rice",
  });
  assert.deepEqual(source.ingredients, originalIngredients);
  assert.deepEqual(source.steps, originalSteps);
});

test("omits unknown yield and optional legacy fields, and maps absent notes to an empty array", () => {
  const document = convertLegacyRecipeToDocument(
    legacyRecipe({
      summary: undefined,
      servings: undefined,
      prepTimeMinutes: undefined,
      cookTimeMinutes: undefined,
      totalTimeMinutes: undefined,
      notes: undefined,
      sourceUrl: undefined,
      tags: [],
      ingredients: [{ displayOrder: 1, ingredientName: "onion" }],
      steps: [{ stepOrder: 1, instruction: "Slice the onion." }],
    }),
  );

  assert.equal("yield" in document, false);
  assert.equal("sourceUrl" in document, false);
  assert.deepEqual(document, {
    id: "8c0fb550-686a-4a0c-bf8f-690c1359c877",
    title: "Fried rice",
    description: "",
    time: {},
    ingredients: [{ name: "onion" }],
    equipment: [],
    instructions: ["Slice the onion."],
    notes: [],
    tags: [],
  });
});

test("conversion is deterministic and rejects nonpositive legacy servings for inventory review", () => {
  const source = legacyRecipe();
  assert.deepEqual(convertLegacyRecipeToDocument(source), convertLegacyRecipeToDocument(source));
  assert.throws(
    () => convertLegacyRecipeToDocument(legacyRecipe({ servings: 0 })),
    /nonpositive legacy servings/,
  );
});

test("preserves a maximum-length legacy instruction when appending the longest integer duration", () => {
  const instruction = "x".repeat(5_000);
  const document = convertLegacyRecipeToDocument(
    legacyRecipe({
      ingredients: [{ displayOrder: 1, ingredientName: "salt" }],
      steps: [{ stepOrder: 1, instruction, durationMinutes: 2_147_483_647 }],
    }),
  );

  assert.equal(document.instructions[0], `${instruction} (Duration: 2147483647 minutes)`);
});
