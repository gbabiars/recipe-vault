import { readFile } from "node:fs/promises";
import path from "node:path";
import { extractRecipeDocumentContent } from "../src/lib/recipes/import-recipe";
import { readDocumentText } from "../src/lib/recipes/read-document";
import { recipeContentSchema, type RecipeContent } from "../src/lib/validation/recipe";

const projectDirectory = process.cwd();
const fixtures = ["fried-rice-recipe", "smash-burger-recipe"];

async function main() {
  const goldens = await Promise.all(
    fixtures.map(async (fixture) => {
      const goldenPath = path.join(
        projectDirectory,
        `src/lib/recipes/__fixtures__/${fixture}.expected.json`,
      );
      const rawGolden: unknown = JSON.parse(await readFile(goldenPath, "utf8"));
      const parsedGolden = recipeContentSchema.safeParse(rawGolden);
      if (!parsedGolden.success) {
        console.error(`${fixture} golden failed recipeContentSchema validation:`);
        for (const issue of parsedGolden.error.issues) {
          console.error(`- ${issue.path.join(".") || "<root>"}: ${issue.message}`);
        }
        process.exitCode = 1;
        return null;
      }
      return { fixture, recipe: parsedGolden.data };
    }),
  );
  if (goldens.some((golden) => golden === null)) return;

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error(
      "Golden recipes are valid. PDF recipe extraction evaluation requires OPENAI_API_KEY.",
    );
    process.exitCode = 1;
    return;
  }

  for (const { fixture, recipe } of goldens) {
    if (!recipe) continue;
    const fixturePath = path.join(projectDirectory, `src/lib/recipes/__fixtures__/${fixture}.pdf`);
    const pdfBytes = new Uint8Array(await readFile(fixturePath));
    const documentText = await readDocumentText(pdfBytes);
    const extracted = await extractRecipeDocumentContent(documentText);
    const mismatches = compareRecipeContent(recipe, extracted);

    if (mismatches.length > 0) {
      console.error(`${fixture} extraction differs in ${mismatches.length} field(s):`);
      for (const mismatch of mismatches) console.error(`- ${mismatch}`);
      process.exitCode = 1;
    } else {
      console.log(`${fixture} extraction matches the golden set.`);
    }
  }
}

void main().catch((error: unknown) => {
  console.error("PDF recipe extraction evaluation failed.");
  if (error instanceof Error) console.error(error.message);
  process.exitCode = 1;
});

function compareRecipeContent(expected: RecipeContent, actual: RecipeContent): string[] {
  const mismatches: string[] = [];
  compareValue(expected, actual, "", mismatches);
  return mismatches;
}

function compareValue(expected: unknown, actual: unknown, field: string, mismatches: string[]) {
  if (typeof expected === "string" && typeof actual === "string") {
    if (normalize(expected) !== normalize(actual)) {
      mismatches.push(
        `${field || "<root>"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      );
    }
    return;
  }

  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      mismatches.push(
        `${field}.length: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      );
    }
    const commonLength = Math.min(expected.length, actual.length);
    for (let index = 0; index < commonLength; index++) {
      compareValue(expected[index], actual[index], `${field}[${index}]`, mismatches);
    }
    return;
  }

  if (isRecord(expected) && isRecord(actual)) {
    const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
    for (const key of keys) {
      const childField = field ? `${field}.${key}` : key;
      if (!(key in expected) || !(key in actual)) {
        mismatches.push(
          `${childField}: expected ${key in expected ? JSON.stringify(expected[key]) : "<missing>"}, got ${key in actual ? JSON.stringify(actual[key]) : "<missing>"}`,
        );
      } else compareValue(expected[key], actual[key], childField, mismatches);
    }
    return;
  }

  if (expected !== actual) {
    mismatches.push(
      `${field || "<root>"}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
    );
  }
}

function normalize(value: string): string {
  return value
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201F]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
