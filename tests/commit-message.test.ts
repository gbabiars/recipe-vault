import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const hook = fileURLToPath(new URL("../.githooks/commit-msg", import.meta.url));
const repoRoot = fileURLToPath(new URL("..", import.meta.url));

function checkMessage(message: string) {
  const directory = mkdtempSync(join(tmpdir(), "recipe-vault-commit-"));
  const messageFile = join(directory, "COMMIT_EDITMSG");

  try {
    writeFileSync(messageFile, message);
    return spawnSync(hook, [messageFile], {
      cwd: repoRoot,
      encoding: "utf8",
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("accepts scoped and unscoped conventional subjects with prose bodies", () => {
  for (const message of [
    "fix(auth): keep expired sessions out of recipe requests\n\nExpired sessions reached the API.\nThe boundary now rejects them.\n",
    "docs: explain recipe ownership\n\nThe ownership rule was unclear.\nThis documents the rule.\n",
    "feat(api)!: require an owner for recipe writes\n\nWrites could lack an owner.\nThe API now requires one.\n\nBREAKING CHANGE: Ownerless writes fail.\n",
  ]) {
    const result = checkMessage(message);
    assert.equal(result.status, 0, result.stderr);
  }
});

test("rejects missing body, missing separator, and malformed subjects", () => {
  for (const message of [
    "fix: correct recipe lookup\n",
    "fix: correct recipe lookup\nThe lookup now uses the recipe ID.\n",
    "Correct recipe lookup\n\nThe lookup now uses the recipe ID.\n",
    "fix(Bad Scope): correct recipe lookup\n\nThe lookup now uses the recipe ID.\n",
  ]) {
    const result = checkMessage(message);
    assert.equal(result.status, 1, message);
  }
});

test("rejects overlong subjects and trailing periods", () => {
  for (const subject of [`fix: ${"a".repeat(68)}`, "fix: correct recipe lookup."]) {
    const result = checkMessage(`${subject}\n\nThe lookup now uses the recipe ID.\n`);
    assert.equal(result.status, 1, subject);
  }
});

test("ignores Git editor comments when checking for a body", () => {
  const result = checkMessage("fix: correct recipe lookup\n\n# Write a body here.\n");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Add a body/);
});

test("rejects default merge and revert messages", () => {
  for (const message of [
    "Merge branch 'feature'\n",
    'Revert "fix: correct recipe lookup"\n\nThis reverts commit abc123.\n',
  ]) {
    const result = checkMessage(message);
    assert.equal(result.status, 1, message);
  }
});
