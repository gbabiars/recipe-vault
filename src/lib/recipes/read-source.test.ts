import assert from "node:assert/strict";
import test from "node:test";
import {
  extractSourceText,
  pinnedLookup,
  readSource,
  SourceReadError,
  validateSourceUrl,
} from "./read-source";

test("rejects local and private destinations", async () => {
  for (const url of [
    "http://localhost/",
    "http://127.0.0.1/",
    "http://10.0.0.1/",
    "http://[::1]/",
  ]) {
    await assert.rejects(
      readSource(url),
      (error: unknown) =>
        error instanceof SourceReadError && error.message === "blocked_destination",
    );
  }
  assert.equal(validateSourceUrl("https://example.com/recipe").href, "https://example.com/recipe");
});

test("pinned DNS lookup respects Node's all-address callback contract", () => {
  const address = { address: "93.184.215.14", family: 4 };
  const lookup = pinnedLookup(address);
  lookup("example.com", { all: true }, (error, result) => {
    assert.equal(error, null);
    assert.deepEqual(result, [address]);
  });
  lookup("example.com", { all: false }, (error, result, family) => {
    assert.equal(error, null);
    assert.equal(result, address.address);
    assert.equal(family, address.family);
  });
});

test("collects recipe JSON-LD and visible page text without unrelated scripts", () => {
  const text = extractSourceText(
    `<html><head><script type="application/ld+json">{"@type":"Recipe","recipeIngredient":["tomatoes"]}</script><script>ignoreThis()</script></head><body><h1>Tomato soup</h1><p>Simmer tomatoes.</p></body></html>`,
  );
  assert.match(text, /recipeIngredient/);
  assert.match(text, /Tomato soup Simmer tomatoes/);
  assert.doesNotMatch(text, /ignoreThis/);
});
