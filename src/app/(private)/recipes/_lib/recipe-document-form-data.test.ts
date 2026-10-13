import assert from "node:assert/strict";
import { test } from "node:test";
import { parseRecipeDocumentFormData } from "./recipe-document-form-data";

function validForm() {
  const form = new FormData();
  for (const [name, value] of Object.entries({
    title: " Garlic Fried Rice ",
    description: " A quick meal ",
    yieldAmount: "",
    yieldUnit: "",
    prepMinutes: "15",
    cookMinutes: "12",
    totalMinutes: "27",
    sourceUrl: "https://example.com/rice",
    tags: " Weeknight, rice\nweeknight ",
    ingredientCount: "2",
    "ingredient.0.name": " cooked white rice ",
    "ingredient.0.amount": "6 cups",
    "ingredient.0.note": "cooled",
    "ingredient.1.name": "garlic",
    "ingredient.1.amount": "3 cloves",
    "ingredient.1.note": "minced",
    equipmentCount: "1",
    "equipment.0.name": "wok",
    "equipment.0.note": "large skillet also works",
    instructionCount: "2",
    "instruction.0": "Break up any clumps of rice.",
    "instruction.1": "Stir-fry until hot.",
    noteCount: "1",
    "note.0": "Work in two batches if crowded.",
  })) {
    form.set(name, value);
  }
  return form;
}

test("parses ordered document content, free-text amounts, and omitted yield", () => {
  const result = parseRecipeDocumentFormData(validForm());

  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(result.data, {
    title: "Garlic Fried Rice",
    description: " A quick meal ",
    time: { prepMinutes: 15, cookMinutes: 12, totalMinutes: 27 },
    ingredients: [
      { name: "cooked white rice", amount: "6 cups", note: "cooled" },
      { name: "garlic", amount: "3 cloves", note: "minced" },
    ],
    equipment: [{ name: "wok", note: "large skillet also works" }],
    instructions: ["Break up any clumps of rice.", "Stir-fry until hot."],
    notes: ["Work in two batches if crowded."],
    tags: ["weeknight", "rice"],
    sourceUrl: "https://example.com/rice",
  });
});

test("parses repeated tag values from the combobox", () => {
  const form = validForm();
  form.delete("tags");
  form.append("tags", " Soup ");
  form.append("tags", "Weeknight");
  form.append("tags", "soup");

  const result = parseRecipeDocumentFormData(form);

  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(result.data.tags, ["soup", "weeknight"]);
});

test("reports incomplete yield and invalid times instead of coercing them", () => {
  const form = validForm();
  form.set("yieldAmount", "3");
  form.set("prepMinutes", "-4");

  const result = parseRecipeDocumentFormData(form);

  assert.equal(result.success, false);
  if (result.success) return;
  assert.ok(result.errors["yield.unit"]);
  assert.ok(result.errors["time.prepMinutes"]);
});

test("rejects malformed row counts", () => {
  const form = validForm();
  form.set("ingredientCount", "999999");

  assert.deepEqual(parseRecipeDocumentFormData(form), {
    success: false,
    errors: { form: "The recipe form contains an invalid number of items. Reload and try again." },
  });
});

test("accepts more than 100 recipe rows when the submitted fields contain them", () => {
  const form = validForm();
  form.set("ingredientCount", "101");
  for (let index = 2; index < 101; index += 1) {
    form.set(`ingredient.${index}.name`, `ingredient ${index + 1}`);
  }

  const result = parseRecipeDocumentFormData(form);

  assert.equal(result.success, true);
  if (result.success) assert.equal(result.data.ingredients.length, 101);
});
