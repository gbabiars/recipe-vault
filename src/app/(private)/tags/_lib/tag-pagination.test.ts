import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeTagCursor, parseTagCursor, tagPageHref } from "./tag-pagination";

const tag = { name: "rice beans", usageCount: 4 };

test("encodes and parses a name cursor for tag pages", () => {
  const cursor = encodeTagCursor(tag);

  assert.equal(cursor.includes("="), false, "base64url cursors omit padding");
  assert.deepEqual(parseTagCursor({ after: cursor }), { after: { name: tag.name } });
  assert.equal(tagPageHref(tag), `/tags?after=${encodeURIComponent(cursor)}`);
});

test("parses reverse cursors and rejects malformed or conflicting cursors", () => {
  assert.deepEqual(parseTagCursor({ after: "bad" }), {});
  assert.deepEqual(parseTagCursor({ after: encodeTagCursor({ name: " Rice " }) }), {});
  const cursor = encodeTagCursor(tag);
  assert.deepEqual(parseTagCursor({ before: cursor }), { before: { name: tag.name } });
  assert.equal(tagPageHref(tag, "before"), `/tags?before=${encodeURIComponent(cursor)}`);
  assert.deepEqual(parseTagCursor({ after: cursor, before: cursor }), {});
  assert.deepEqual(parseTagCursor({ after: [encodeTagCursor(tag)] }), {});
});
