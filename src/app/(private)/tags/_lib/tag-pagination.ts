import { tagNameSchema } from "@/lib/validation/tag";

export const TAG_PAGE_SIZE = 25;

type TagPosition = { name: string };
type CursorSearchParams = { after?: unknown; before?: unknown };

function toBase64Url(value: string): string {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replaceAll("=", "");
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4));
}

export function encodeTagCursor(tag: TagPosition): string {
  return toBase64Url(JSON.stringify({ version: 1, name: tag.name }));
}

function decodeTagCursor(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) {
    return null;
  }

  try {
    const json = fromBase64Url(value);
    if (toBase64Url(json) !== value) return null;
    const parsed: unknown = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    const cursor = parsed as Record<string, unknown>;
    if (cursor.version !== 1 || typeof cursor.name !== "string") return null;
    const name = tagNameSchema.safeParse(cursor.name);
    return name.success && name.data === cursor.name ? cursor.name : null;
  } catch {
    return null;
  }
}

/** Invalid or conflicting cursors restart from the first page. */
export function parseTagCursor(searchParams: CursorSearchParams): {
  after?: TagPosition;
  before?: TagPosition;
} {
  if (searchParams.after !== undefined && searchParams.before !== undefined) return {};
  const direction = searchParams.before === undefined ? "after" : "before";
  const value = searchParams[direction];
  if (value === undefined) return {};
  const name = decodeTagCursor(value);
  return name ? { [direction]: { name } } : {};
}
