import type { TagCursorPosition, TagInventoryItem } from "@/lib/db/tag-repository";
import { tagNameSchema } from "@/lib/validation/recipe";

export const TAG_CATALOG_PAGE_SIZE = 25;

type TagCursorToken = TagCursorPosition & { version: 1 };
type CursorSearchParams = { after?: unknown; before?: unknown };

const cursorIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toBase64Url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
}

export function encodeTagCursor(tag: TagInventoryItem): string {
  const cursor: TagCursorToken = {
    version: 1,
    usageCount: tag.usageCount,
    name: tag.name,
    id: tag.id,
  };
  return toBase64Url(JSON.stringify(cursor));
}

function decodeTagCursor(value: unknown): TagCursorPosition | null {
  if (typeof value !== "string" || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value))
    return null;

  try {
    const json = fromBase64Url(value);
    if (toBase64Url(json) !== value) return null;
    const cursor: unknown = JSON.parse(json);
    if (typeof cursor !== "object" || cursor === null || Array.isArray(cursor)) return null;

    const fields = cursor as Record<string, unknown>;
    if (
      fields.version !== 1 ||
      !Number.isSafeInteger(fields.usageCount) ||
      (fields.usageCount as number) < 0 ||
      typeof fields.name !== "string" ||
      typeof fields.id !== "string" ||
      !cursorIdPattern.test(fields.id)
    ) {
      return null;
    }
    const name = tagNameSchema.safeParse(fields.name);
    if (!name.success || name.data !== fields.name) return null;

    return {
      usageCount: fields.usageCount as number,
      name: fields.name,
      id: fields.id,
    };
  } catch {
    return null;
  }
}

/** Invalid or conflicting cursors deliberately restart the catalog at page one. */
export function parseTagPageCursors(searchParams: CursorSearchParams): {
  after?: TagCursorPosition;
  before?: TagCursorPosition;
} {
  const hasAfter = searchParams.after !== undefined;
  const hasBefore = searchParams.before !== undefined;
  if (hasAfter === hasBefore) return {};

  const cursor = decodeTagCursor(hasAfter ? searchParams.after : searchParams.before);
  if (!cursor) return {};
  return hasAfter ? { after: cursor } : { before: cursor };
}

export function tagPageHref(direction: "after" | "before", tag: TagInventoryItem): string {
  return `/tags?${direction}=${encodeURIComponent(encodeTagCursor(tag))}`;
}
