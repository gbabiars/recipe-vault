import assert from "node:assert/strict";
import test from "node:test";
import { createRecipeApi } from "./recipe-handlers";
import { mapExtractedRecipe } from "../recipes/import-recipe";
import { DocumentReadError, MAX_PDF_BYTES } from "../recipes/read-document";
import type { RecipeCreateInput } from "../validation/recipe";

const pdfBytes = new TextEncoder().encode("%PDF-1.7 mock");
const extracted = {
  title: "First soup",
  summary: null,
  prepTimeMinutes: null,
  cookTimeMinutes: null,
  totalTimeMinutes: null,
  servings: null,
  ingredients: [{ ingredientName: "tomatoes", amount: null, notes: null }],
  steps: [{ instruction: "Simmer.", durationMinutes: null }],
};

function request(file = new File([pdfBytes], "private.pdf", { type: "application/pdf" })) {
  const form = new FormData();
  form.set("file", file);
  return new Request("http://test/api/v1/recipes/import/document", {
    method: "POST",
    headers: { "x-request-id": "document-test" },
    body: form,
  });
}

function api(
  options: {
    user?: string | null;
    readDocument?: (bytes: Uint8Array, signal: AbortSignal) => Promise<string>;
    limited?: boolean;
  } = {},
) {
  const saved: Array<{ ownerId: string; input: RecipeCreateInput }> = [];
  const handler = createRecipeApi({
    getUser: async () =>
      options.user === undefined ? { id: "owner-1" } : options.user ? { id: options.user } : null,
    getService: async () =>
      ({
        create: async (ownerId: string, input: RecipeCreateInput) => {
          saved.push({ ownerId, input });
          return { id: "recipe-1" };
        },
      }) as never,
    readDocument: options.readDocument ?? (async () => "First soup. Tomatoes. Simmer."),
    extractDocument: async () => mapExtractedRecipe(extracted),
    limiter: options.limited
      ? { check: () => ({ allowed: false as const, retryAfterSeconds: 10 }) }
      : undefined,
  }).importDocument;
  return { handler, saved };
}

test("authenticates before reading the upload body", async () => {
  const { handler } = api({ user: null });
  const response = (await handler(
    new Request("http://test/api/v1/recipes/import/document", {
      method: "POST",
      body: new ReadableStream({
        pull() {
          throw new Error("read");
        },
      }),
      duplex: "half",
    } as RequestInit),
  ))!;
  assert.equal(response.status, 401);
});

test("rate limits before reading the upload body", async () => {
  const { handler } = api({ limited: true });
  const response = (await handler(
    new Request("http://test/api/v1/recipes/import/document", {
      method: "POST",
      body: new ReadableStream({
        pull() {
          throw new Error("read");
        },
      }),
      duplex: "half",
    } as RequestInit),
  ))!;
  assert.equal(response.status, 429);
});

test("rejects oversized multipart bodies and PDFs", async () => {
  const { handler } = api();
  const large = new File([new Uint8Array(MAX_PDF_BYTES + 1)], "large.pdf", {
    type: "application/pdf",
  });
  const response = (await handler(request(large)))!;
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error.code, "too_large");
  const declared = request();
  const declaredResponse = (await handler(
    new Request(declared, {
      headers: {
        "content-type": declared.headers.get("content-type")!,
        "content-length": "3200001",
      },
    }),
  ))!;
  assert.equal((await declaredResponse.json()).error.code, "too_large");
});

test("saves only an owned recipe with no fabricated source URL", async () => {
  const { handler, saved } = api();
  const response = (await handler(request()))!;
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {
    data: { id: "recipe-1" },
    meta: { requestId: "document-test" },
  });
  assert.equal(saved[0].ownerId, "owner-1");
  assert.equal(saved[0].input.sourceUrl, undefined);
});

test("returns safe document errors without saving", async () => {
  for (const code of [
    "not_pdf",
    "damaged_pdf",
    "encrypted_pdf",
    "too_many_pages",
    "too_much_text",
    "no_text",
    "parse_timeout",
    "parser_unavailable",
    "parse_failed",
  ] as const) {
    const { handler, saved } = api({
      readDocument: async () => {
        throw new DocumentReadError(code);
      },
    });
    const response = (await handler(request()))!;
    const body = await response.json();
    assert.equal(response.status, code === "parser_unavailable" ? 503 : 422);
    assert.equal(body.error.code, code);
    assert.equal(body.error.requestId, "document-test");
    if (code === "parser_unavailable")
      assert.match(body.error.message, /server could not start its PDF reader/i);
    assert.doesNotMatch(JSON.stringify(body), /private\.pdf|First soup/);
    assert.equal(saved.length, 0);
  }
});
