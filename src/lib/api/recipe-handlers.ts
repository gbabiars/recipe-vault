import { z } from "zod";
import { recipeCreateInputSchema, recipeUpdateInputSchema } from "@/lib/validation/recipe";
import type { RecipeService } from "@/lib/recipes/recipe-service";
import type { RateLimiter } from "./rate-limit";
import { defaultRateLimiter, recipeReadLimit, recipeWriteLimit } from "./rate-limit";
import { logApiEvent, requestId } from "./observability";

type ApiDependencies = {
  getUser: () => Promise<{ id: string } | null>;
  getService: () => Promise<RecipeService>;
  limiter?: RateLimiter;
};

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(200).optional(),
  tag: z.string().trim().min(1).max(64).optional(),
  dietaryFlag: z.string().trim().min(1).max(64).optional(),
});

function responseError(
  status: number,
  code: string,
  message: string,
  id: string,
  details?: unknown,
) {
  return Response.json(
    { error: { code, message, requestId: id, ...(details ? { details } : {}) } },
    { status },
  );
}

async function body(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new SyntaxError("Invalid JSON");
  }
}

export function createRecipeApi(deps: ApiDependencies) {
  async function context(request: Request, write: boolean) {
    const id = requestId(request);
    const user = await deps.getUser();
    if (!user)
      return { error: responseError(401, "unauthenticated", "Authentication is required.", id) };
    const limited = (deps.limiter ?? defaultRateLimiter).check(
      `${user.id}:${write ? "write" : "read"}`,
      write ? recipeWriteLimit : recipeReadLimit,
    );
    if (!limited.allowed) {
      return {
        error: new Response(
          JSON.stringify({
            error: { code: "rate_limited", message: "Too many requests.", requestId: id },
          }),
          {
            status: 429,
            headers: {
              "content-type": "application/json",
              "retry-after": String(limited.retryAfterSeconds),
            },
          },
        ),
      };
    }
    return { id, user, service: await deps.getService() };
  }
  function audit(request: Request, id: string) {
    return { requestId: id, method: request.method };
  }

  return {
    async list(request: Request) {
      const current = await context(request, false);
      if ("error" in current) return current.error;
      const query = listQuerySchema.safeParse(
        Object.fromEntries(new URL(request.url).searchParams),
      );
      if (!query.success)
        return responseError(
          422,
          "invalid_request",
          "Invalid query parameters.",
          current.id,
          query.error.flatten(),
        );
      try {
        const page = await current.service.listPage(current.user.id, {
          ...query.data,
          tags: query.data.tag ? [query.data.tag.toLowerCase()] : [],
          dietaryFlags: query.data.dietaryFlag ? [query.data.dietaryFlag.toLowerCase()] : [],
        });
        return Response.json({
          data: page.items,
          meta: {
            page: query.data.page,
            pageSize: query.data.pageSize,
            total: page.total,
            requestId: current.id,
          },
        });
      } catch {
        return unexpected(current.id);
      }
    },
    async create(request: Request) {
      const current = await context(request, true);
      if ("error" in current) return current.error;
      let input: unknown;
      try {
        input = await body(request);
      } catch {
        return responseError(400, "invalid_json", "Request body must be valid JSON.", current.id);
      }
      const parsed = recipeCreateInputSchema.safeParse(input);
      if (!parsed.success)
        return responseError(
          422,
          "invalid_request",
          "Recipe validation failed.",
          current.id,
          parsed.error.flatten(),
        );
      try {
        const recipe = await current.service.create(
          current.user.id,
          parsed.data,
          audit(request, current.id),
        );
        return Response.json({ data: recipe, meta: { requestId: current.id } }, { status: 201 });
      } catch {
        return unexpected(current.id);
      }
    },
    async get(request: Request, recipeId: string) {
      const current = await context(request, false);
      if ("error" in current) return current.error;
      try {
        const recipe = await current.service.get(current.user.id, recipeId);
        return recipe
          ? Response.json({ data: recipe, meta: { requestId: current.id } })
          : notFound(current.id);
      } catch {
        return unexpected(current.id);
      }
    },
    async update(request: Request, recipeId: string) {
      const current = await context(request, true);
      if ("error" in current) return current.error;
      let input: unknown;
      try {
        input = await body(request);
      } catch {
        return responseError(400, "invalid_json", "Request body must be valid JSON.", current.id);
      }
      const parsed = recipeUpdateInputSchema.safeParse(input);
      if (!parsed.success)
        return responseError(
          422,
          "invalid_request",
          "Recipe validation failed.",
          current.id,
          parsed.error.flatten(),
        );
      try {
        const recipe = await current.service.update(
          current.user.id,
          recipeId,
          parsed.data,
          audit(request, current.id),
        );
        return recipe
          ? Response.json({ data: recipe, meta: { requestId: current.id } })
          : notFound(current.id);
      } catch (error) {
        if (error instanceof z.ZodError)
          return responseError(
            422,
            "invalid_request",
            "Recipe validation failed.",
            current.id,
            error.flatten(),
          );
        return unexpected(current.id);
      }
    },
    async remove(request: Request, recipeId: string) {
      const current = await context(request, true);
      if ("error" in current) return current.error;
      try {
        return (await current.service.delete(current.user.id, recipeId, audit(request, current.id)))
          ? new Response(null, { status: 204 })
          : notFound(current.id);
      } catch {
        return unexpected(current.id);
      }
    },
  };
}

function notFound(id: string) {
  return responseError(404, "not_found", "Recipe not found.", id);
}
function unexpected(id: string) {
  logApiEvent({ level: "error", requestId: id, event: "request_failed" });
  return responseError(500, "internal_error", "Unable to process this request.", id);
}
