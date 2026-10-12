import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeTagCursor, parseTagCursor } from "./tag-pagination";

const tag = { name: "rice beans", usageCount: 4 };

test("encodes and parses a name cursor for tag pages", () => {
  const cursor = encodeTagCursor(tag);

  assert.equal(cursor.includes("="), false, "base64url cursors omit padding");
  assert.deepEqual(parseTagCursor({ after: cursor }), { after: { name: tag.name } });
});

test("parses reverse cursors and rejects malformed or conflicting cursors", () => {
  assert.deepEqual(parseTagCursor({ after: "bad" }), {});
  assert.deepEqual(parseTagCursor({ after: encodeTagCursor({ name: " Rice " }) }), {});
  const cursor = encodeTagCursor(tag);
  assert.deepEqual(parseTagCursor({ before: cursor }), { before: { name: tag.name } });
  assert.deepEqual(parseTagCursor({ after: cursor, before: cursor }), {});
  assert.deepEqual(parseTagCursor({ after: [encodeTagCursor(tag)] }), {});
});
