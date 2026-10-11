import assert from "node:assert/strict";
import { test } from "node:test";
import type { DocumentTagInventoryItem } from "@/lib/db/tag-repository";
import {
  documentTagPageHref,
  encodeDocumentTagCursor,
  parseDocumentTagCursor,
} from "./document-tag-pagination";

const tag: DocumentTagInventoryItem = { name: "rice beans", usageCount: 4 };

test("encodes and parses a name-only cursor for the repository", () => {
  const cursor = encodeDocumentTagCursor(tag);

  assert.deepEqual(parseDocumentTagCursor({ after: cursor }), { after: { name: tag.name } });
  assert.equal(documentTagPageHref(tag), `/tags?after=${encodeURIComponent(cursor)}`);
});

test("rejects malformed, noncanonical, and reverse cursors", () => {
  assert.deepEqual(parseDocumentTagCursor({ after: "bad" }), {});
  assert.deepEqual(
    parseDocumentTagCursor({ after: encodeDocumentTagCursor({ ...tag, name: " Rice " }) }),
    {},
  );
  assert.deepEqual(
    parseDocumentTagCursor({ after: encodeDocumentTagCursor(tag), before: "ignored" }),
    {},
  );
  assert.deepEqual(parseDocumentTagCursor({ after: [encodeDocumentTagCursor(tag)] }), {});
});
