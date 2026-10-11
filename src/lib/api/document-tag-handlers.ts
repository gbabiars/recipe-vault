import { z } from "zod";
import type { TagService } from "@/lib/recipes/tag-service";
import type { RateLimiter } from "./rate-limit";
import { defaultRateLimiter, recipeReadLimit } from "./rate-limit";
import { logApiEvent, requestId } from "./observability";

type ApiDependencies = {
  getUser: () => Promise<{ id: string } | null>;
  getService: () => Promise<TagService>;
  limiter?: RateLimiter;
};

const sortSchema = z.enum(["name_asc", "usage_desc", "usage_asc"]).default("name_asc");
const cursorSchema = z
  .object({
    name: z.string().min(1).max(64),
    usageCount: z.number().int().positive().optional(),
    ownerId: z.string().min(1).max(256),
    search: z.string().max(200),
    sort: sortSchema,
  })
  .strict();
const querySchema = z
  .object({
    search: z.string().trim().max(200).default(""),
    sort: sortSchema,
    limit: z.coerce.number().int().min(1).max(100).default(25),
    cursor: z.string().min(1).max(512).optional(),
  })
  .strict();

function responseError(status: number, code: string, message: string, id: string) {
  return Response.json(
    { error: { code, message, requestId: id } },
    { status, headers: { "cache-control": "private, no-store" } },
  );
}

function decodeCursor(
  value: string | undefined,
  expected: { ownerId: string; search: string; sort: z.output<typeof sortSchema> },
) {
  if (!value) return undefined;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    // Require canonical encoding to reject permissive Buffer decoding of malformed input.
    if (Buffer.from(decoded, "utf8").toString("base64url") !== value) return null;
    const parsed = cursorSchema.safeParse(JSON.parse(decoded));
    if (!parsed.success) return null;
    if (
      parsed.data.ownerId !== expected.ownerId ||
      parsed.data.search !== expected.search ||
      parsed.data.sort !== expected.sort ||
      (expected.sort === "name_asc" && parsed.data.usageCount !== undefined) ||
      (expected.sort !== "name_asc" && parsed.data.usageCount === undefined)
    ) {
      return null;
    }
    return {
      name: parsed.data.name,
      ...(parsed.data.usageCount === undefined ? {} : { usageCount: parsed.data.usageCount }),
    };
  } catch {
    return null;
  }
}

function encodeCursor(
  value: { name: string; usageCount: number },
  context: { ownerId: string; search: string; sort: z.output<typeof sortSchema> },
) {
  const cursor = {
    ...(context.sort === "name_asc" ? { name: value.name } : value),
    ownerId: context.ownerId,
    search: context.search,
    sort: context.sort,
  };
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

/** GET /api/v1/tags reads only the authenticated owner's document-derived inventory. */
export function createDocumentTagApi(deps: ApiDependencies) {
  return {
    async list(request: Request) {
      const id = requestId(request);
      const user = await deps.getUser();
      if (!user) return responseError(401, "unauthenticated", "Authentication is required.", id);
      const limited = (deps.limiter ?? defaultRateLimiter).check(
        `${user.id}:read`,
        recipeReadLimit,
      );
      if (!limited.allowed) {
        return new Response(
          JSON.stringify({
            error: { code: "rate_limited", message: "Too many requests.", requestId: id },
          }),
          {
            status: 429,
            headers: {
              "content-type": "application/json",
              "cache-control": "private, no-store",
              "retry-after": String(limited.retryAfterSeconds),
            },
          },
        );
      }

      const params = new URL(request.url).searchParams;
      const entries = [...params.entries()];
      if (
        entries.some(([key]) => !["search", "sort", "limit", "cursor"].includes(key)) ||
        new Set(entries.map(([key]) => key)).size !== entries.length
      ) {
        return responseError(422, "invalid_request", "Invalid query parameters.", id);
      }
      const query = querySchema.safeParse(Object.fromEntries(entries));
      if (!query.success)
        return responseError(422, "invalid_request", "Invalid query parameters.", id);
      const search = query.data.search.replace(/\s+/g, " ").toLowerCase();
      const cursorContext = { ownerId: user.id, search, sort: query.data.sort };
      const after = decodeCursor(query.data.cursor, cursorContext);
      if (after === null)
        return responseError(422, "invalid_request", "Invalid query parameters.", id);

      try {
        const page = await (
          await deps.getService()
        ).listFromRecipes(user.id, {
          search,
          sort: query.data.sort,
          limit: query.data.limit,
          ...(after ? { after } : {}),
        });
        const last = page.tags.at(-1);
        return Response.json(
          {
            data: page.tags.map(({ name, usageCount }) => ({ name, usageCount })),
            meta: {
              requestId: id,
              hasMore: page.hasMore,
              nextCursor: page.hasMore && last ? encodeCursor(last, cursorContext) : null,
            },
          },
          { headers: { "cache-control": "private, no-store" } },
        );
      } catch {
        logApiEvent({ level: "error", requestId: id, event: "request_failed" });
        return responseError(500, "internal_error", "Unable to process this request.", id);
      }
    },
  };
}
