import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseRecipeSearch } from "../src/lib/recipes/recipe-search-parser";

type EvalCase = {
  id: string;
  prompt: string;
  expectedAlternatives: string[];
  expectedPreferences: Array<"easy" | "quick">;
  forbiddenTerms?: string[];
};

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("Recipe search parser evaluation requires OPENAI_API_KEY.");
    process.exitCode = 1;
    return;
  }

  const casesPath = path.join(process.cwd(), "scripts/recipe-search-parser-eval.json");
  const cases = JSON.parse(await readFile(casesPath, "utf8")) as EvalCase[];
  let expectedCount = 0;
  let matchedCount = 0;
  let extraCount = 0;
  let failedCases = 0;

  for (const evalCase of cases) {
    let actualAlternatives: string[];
    let actualPreferences: Array<"easy" | "quick">;
    try {
      const parsed = await parseRecipeSearch(evalCase.prompt);
      actualAlternatives = parsed.matchAny.map(normalize);
      actualPreferences = parsed.preferences;
    } catch (error) {
      failedCases++;
      console.error(`FAIL ${evalCase.id}: parser call failed (${errorName(error)}).`);
      continue;
    }

    const expected = evalCase.expectedAlternatives.map(normalize);
    const expectedSet = new Set(expected);
    const actualSet = new Set(actualAlternatives);
    const missing = expected.filter((alternative) => !actualSet.has(alternative));
    const unexpected = actualAlternatives.filter((alternative) => !expectedSet.has(alternative));
    const preferencesMatch =
      JSON.stringify(actualPreferences) === JSON.stringify(evalCase.expectedPreferences);
    const forbidden = actualAlternatives.filter((alternative) =>
      (evalCase.forbiddenTerms ?? []).some((term) => includesTerm(alternative, normalize(term))),
    );

    expectedCount += expected.length;
    matchedCount += expected.length - missing.length;
    extraCount += unexpected.length;
    if (missing.length > 0 || unexpected.length > 0 || forbidden.length > 0 || !preferencesMatch)
      failedCases++;

    console.log(
      `${missing.length === 0 && unexpected.length === 0 && forbidden.length === 0 && preferencesMatch ? "PASS" : "FAIL"} ${evalCase.id}`,
    );
    console.log(`  expected: ${JSON.stringify(expected)}`);
    console.log(`  received: ${JSON.stringify(actualAlternatives)}`);
    console.log(
      `  preferences: expected ${JSON.stringify(evalCase.expectedPreferences)}, received ${JSON.stringify(actualPreferences)}`,
    );
    if (missing.length > 0) console.log(`  missing: ${JSON.stringify(missing)}`);
    if (unexpected.length > 0) console.log(`  extra: ${JSON.stringify(unexpected)}`);
    if (forbidden.length > 0) console.log(`  filler/unsupported: ${JSON.stringify(forbidden)}`);
  }

  const precision =
    matchedCount + extraCount === 0 ? 1 : matchedCount / (matchedCount + extraCount);
  const recall = expectedCount === 0 ? 1 : matchedCount / expectedCount;
  console.log(
    `Summary: ${cases.length - failedCases}/${cases.length} cases passed; precision=${precision.toFixed(2)}, recall=${recall.toFixed(2)}.`,
  );
  if (failedCases > 0) process.exitCode = 1;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesTerm(alternative: string, term: string) {
  return ` ${alternative.replace(/[^\p{L}\p{N}]+/gu, " ")} `.includes(
    ` ${term.replace(/[^\p{L}\p{N}]+/gu, " ")} `,
  );
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "UnknownError";
}

void main().catch((error: unknown) => {
  console.error("Recipe search parser evaluation failed.");
  if (error instanceof Error) console.error(error.message);
  process.exitCode = 1;
});
