import assert from "node:assert/strict";
import test from "node:test";
import type { TagInventoryItem } from "@/lib/db/tag-repository";
import { encodeTagCursor, parseTagPageCursors, tagPageHref } from "./tag-pagination";

const tag: TagInventoryItem = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "weeknight meals",
  usageCount: 3,
};

test("tag page cursors encode and decode stable tag positions", () => {
  const token = encodeTagCursor(tag);

  assert.deepEqual(parseTagPageCursors({ after: token }), {
    after: { id: tag.id, name: tag.name, usageCount: tag.usageCount },
  });
  assert.deepEqual(parseTagPageCursors({ before: token }), {
    before: { id: tag.id, name: tag.name, usageCount: tag.usageCount },
  });
  assert.equal(tagPageHref("before", tag), `/tags?before=${encodeURIComponent(token)}`);
});

test("invalid, repeated, and conflicting cursor parameters restart at the first page", () => {
  const valid = encodeTagCursor(tag);

  assert.deepEqual(parseTagPageCursors({ after: "not-a-cursor" }), {});
  assert.deepEqual(parseTagPageCursors({ before: [valid, valid] }), {});
  assert.deepEqual(parseTagPageCursors({ after: valid, before: valid }), {});
  assert.deepEqual(parseTagPageCursors({ after: undefined, before: undefined }), {});
});

test("cursor payloads must contain a valid count, canonical name, and UUID", () => {
  for (const payload of [
    { version: 1, usageCount: -1, name: tag.name, id: tag.id },
    { version: 1, usageCount: 1.5, name: tag.name, id: tag.id },
    { version: 1, usageCount: 1, name: "Weeknight Meals", id: tag.id },
    { version: 1, usageCount: 1, name: tag.name, id: "not-a-uuid" },
  ]) {
    const token = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    assert.deepEqual(parseTagPageCursors({ after: token }), {});
  }
});
