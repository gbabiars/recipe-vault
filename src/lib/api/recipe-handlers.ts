import { z } from "zod";
import { recipeCreateInputSchema, recipeUpdateInputSchema } from "@/lib/validation/recipe";
import type { RecipeService } from "@/lib/recipes/recipe-service";
import { extractRecipeInput, importRecipeInput } from "@/lib/recipes/import-recipe";
import { DocumentReadError, MAX_PDF_BYTES, readDocumentText } from "@/lib/recipes/read-document";
import { SourceReadError, validateSourceUrl } from "@/lib/recipes/read-source";
import type { RecipeCreateInput } from "@/lib/validation/recipe";
import type { RateLimiter } from "./rate-limit";
import { defaultRateLimiter, recipeReadLimit, recipeWriteLimit } from "./rate-limit";
import { logApiEvent, requestId } from "./observability";

type ApiDependencies = {
  getUser: () => Promise<{ id: string } | null>;
  getService: () => Promise<RecipeService>;
  limiter?: RateLimiter;
  importInput?: (url: string) => Promise<RecipeCreateInput>;
  readDocument?: (bytes: Uint8Array, signal: AbortSignal) => Promise<string>;
  extractDocument?: (text: string, signal: AbortSignal) => Promise<RecipeCreateInput>;
};

const MAX_MULTIPART_BYTES = 3_200_000;

async function readLimitedBody(request: Request, signal: AbortSignal): Promise<Uint8Array> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_MULTIPART_BYTES)
    throw new DocumentReadError("too_large");
  if (!request.body) throw new DocumentReadError("invalid_upload");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await new Promise<ReadableStreamReadResult<Uint8Array>>(
        (resolve, reject) => {
          if (signal.aborted) return reject(new DocumentReadError("upload_timeout"));
          const onAbort = () => reject(new DocumentReadError("upload_timeout"));
          signal.addEventListener("abort", onAbort, { once: true });
          reader
            .read()
            .then(resolve, reject)
            .finally(() => signal.removeEventListener("abort", onAbort));
        },
      );
      if (done) break;
      length += value.byteLength;
      if (length > MAX_MULTIPART_BYTES) throw new DocumentReadError("too_large");
      chunks.push(value);
    }
  } finally {
    void reader.cancel().catch(() => undefined);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().min(1).max(200).optional(),
  tag: z.string().trim().min(1).max(64).optional(),
});
const tagQuerySchema = z.object({ search: z.string().trim().max(200).default("") });

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
    async importDocument(request: Request) {
      const current = await context(request, true);
      if ("error" in current) return current.error;
      if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data;"))
        return responseError(422, "invalid_request", "Choose one PDF file.", current.id);

      const deadline = AbortSignal.timeout(50_000);
      try {
        const uploadSignal = AbortSignal.any([deadline, AbortSignal.timeout(5_000)]);
        const bytes = await readLimitedBody(request, uploadSignal);
        const multipart = new Request(request.url, {
          method: "POST",
          headers: { "content-type": request.headers.get("content-type")! },
          body: bytes.buffer as ArrayBuffer,
        });
        let form: FormData;
        try {
          form = await multipart.formData();
        } catch {
          return responseError(
            422,
            "invalid_request",
            "The upload could not be read. Select one PDF and try again.",
            current.id,
          );
        }
        const entries = [...form.entries()];
        if (entries.length !== 1 || entries[0][0] !== "file" || !(entries[0][1] instanceof File))
          return responseError(422, "invalid_request", "Choose one PDF file.", current.id);
        const file = entries[0][1];
        if (file.size > MAX_PDF_BYTES) throw new DocumentReadError("too_large");
        const fileBytes = new Uint8Array(await file.arrayBuffer());
        const parseSignal = AbortSignal.any([deadline, AbortSignal.timeout(10_000)]);
        const text = await (deps.readDocument ?? readDocumentText)(fileBytes, parseSignal);
        if (deadline.aborted) throw new DocumentReadError("parse_timeout");
        const extractionSignal = AbortSignal.any([deadline, AbortSignal.timeout(30_000)]);
        const recipeInput = await (
          deps.extractDocument ?? ((value, signal) => extractRecipeInput(value, undefined, signal))
        )(text, extractionSignal);
        if (deadline.aborted || extractionSignal.aborted)
          throw new SourceReadError("extraction_failed");
        const recipe = await current.service.create(
          current.user.id,
          recipeCreateInputSchema.parse(recipeInput),
          audit(request, current.id),
        );
        return Response.json(
          { data: { id: recipe.id }, meta: { requestId: current.id } },
          { status: 201, headers: { "cache-control": "private, no-store" } },
        );
      } catch (error) {
        if (error instanceof DocumentReadError) {
          const messages: Record<string, string> = {
            invalid_upload: "The upload was empty. Select one PDF and try again.",
            not_pdf: "This file does not have a PDF header. Export it as a PDF and try again.",
            damaged_pdf: "The PDF structure is damaged or incomplete. Re-export it and try again.",
            encrypted_pdf: "Password-protected PDFs cannot be imported.",
            too_large: "Choose a PDF smaller than 3 MB.",
            too_many_pages: "Choose a PDF with 20 pages or fewer.",
            too_much_text: "This PDF contains too much text to import.",
            no_text: "This PDF has no readable text. Scanned images are not supported.",
            upload_timeout: "The PDF upload took too long. Please try again.",
            parse_timeout: "The PDF took too long to read. Please try another file.",
            parser_unavailable:
              "The server could not start its PDF reader. Please try again later.",
            parse_failed: "The PDF reader could not decode this file. Re-export it and try again.",
          };
          if (error.message === "parser_unavailable")
            logApiEvent({
              level: "error",
              requestId: current.id,
              event: "document_parser_unavailable",
            });
          return responseError(
            error.message === "parser_unavailable" ? 503 : 422,
            error.message,
            messages[error.message],
            current.id,
          );
        }
        if (error instanceof SourceReadError || error instanceof z.ZodError)
          return responseError(
            422,
            error instanceof SourceReadError ? error.message : "no_recipe",
            error instanceof SourceReadError && error.message === "extraction_failed"
              ? "The recipe could not be extracted. Please try again."
              : "No complete recipe was found.",
            current.id,
          );
        return unexpected(current.id);
      }
    },
    async importRecipe(request: Request) {
      const current = await context(request, true);
      if ("error" in current) return current.error;
      let input: unknown;
      try {
        input = await body(request);
      } catch {
        return responseError(400, "invalid_json", "Request body must be valid JSON.", current.id);
      }
      const parsed = z.object({ url: z.string() }).strict().safeParse(input);
      if (!parsed.success)
        return responseError(422, "invalid_request", "Enter a valid website URL.", current.id);
      try {
        validateSourceUrl(parsed.data.url);
      } catch {
        return responseError(422, "invalid_request", "Enter a valid website URL.", current.id);
      }
      try {
        const recipeInput = await (deps.importInput ?? importRecipeInput)(parsed.data.url);
        const recipe = await current.service.create(
          current.user.id,
          recipeCreateInputSchema.parse(recipeInput),
          audit(request, current.id),
        );
        return Response.json(
          { data: { id: recipe.id }, meta: { requestId: current.id } },
          { status: 201, headers: { "cache-control": "private, no-store" } },
        );
      } catch (error) {
        if (error instanceof SourceReadError) {
          const code = error.message;
          const message =
            code === "blocked_destination"
              ? "This website address cannot be imported."
              : code === "access_denied"
                ? "This website blocked automated access. Try another source or create the recipe manually."
                : code === "no_recipe"
                  ? "No complete recipe was found."
                  : code === "extraction_failed"
                    ? "The recipe could not be extracted. Please try again."
                    : "The page could not be reached.";
          return responseError(422, code, message, current.id);
        }
        if (error instanceof z.ZodError)
          return responseError(422, "no_recipe", "No complete recipe was found.", current.id);
        return unexpected(current.id);
      }
    },
    async listTags(request: Request) {
      const current = await context(request, false);
      if ("error" in current) return current.error;
      const query = tagQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
      if (!query.success)
        return responseError(
          422,
          "invalid_request",
          "Invalid query parameters.",
          current.id,
          query.error.flatten(),
        );
      try {
        const tags = await current.service.listTags(current.user.id, query.data.search);
        return Response.json(
          { data: tags, meta: { requestId: current.id } },
          { headers: { "cache-control": "private, no-store" } },
        );
      } catch {
        return unexpected(current.id);
      }
    },
    async list(request: Request) {
      const current = await context(request, false);
      if ("error" in current) return current.error;
      const params = new URL(request.url).searchParams;
      if (params.has("dietaryFlag"))
        return responseError(422, "invalid_request", "Invalid query parameters.", current.id);
      const query = listQuerySchema.safeParse(Object.fromEntries(params));
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
          tags: query.data.tag ? [query.data.tag.replace(/ +/g, " ").toLowerCase()] : [],
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
