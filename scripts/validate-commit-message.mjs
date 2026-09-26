import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const messageFile = process.argv[2];

if (!messageFile) {
  console.error("Expected a commit message file path.");
  process.exit(1);
}

const message = execFileSync("git", ["stripspace", "--strip-comments"], {
  input: readFileSync(messageFile, "utf8"),
  encoding: "utf8",
});
const lines = message.split("\n");
const subject = lines[0] ?? "";
const subjectPattern =
  /^(feat|fix|docs|refactor|test|perf|style|chore|build|ci|revert)(?:\([a-z0-9]+(?:-[a-z0-9]+)*\))?!?: (\S.*)$/u;
const errors = [];

if (!subjectPattern.test(subject)) {
  errors.push("Use <type>[(scope)][!]: <description> for the subject.");
}

if ([...subject].length > 72) {
  errors.push("Keep the subject at 72 characters or fewer.");
}

if (subject.endsWith(".")) {
  errors.push("Omit the trailing period from the subject.");
}

if (lines[1] !== "") {
  errors.push("Put a blank line between the subject and body.");
}

if (!lines.slice(2).join("\n").trim()) {
  errors.push("Add a body explaining why and what changed.");
}

if (errors.length > 0) {
  console.error("Commit message does not follow AGENTS.md:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}
