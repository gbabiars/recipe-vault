import assert from "node:assert/strict";
import test from "node:test";
import { createRecipeApi } from "./document-recipe-handlers";
import type { RecipeContent } from "../validation/recipe";
import { DocumentReadError, MAX_PDF_BYTES } from "../recipes/read-document";
import { SourceReadError } from "../recipes/read-source";

const id = "8c0fb550-686a-4a0c-bf8f-690c1359c877";
const recipe = {
  id,
  title: "Quick pickled onions",
  description: "Tangy onions for tacos.",
  time: { prepMinutes: 10 },
  ingredients: [{ name: "red onion", amount: "1", note: "thinly sliced" }],
  equipment: [{ name: "jar" }],
  instructions: ["Put the onion in a jar."],
  notes: [],
  tags: ["condiments"],
};
const content: RecipeContent = (({ id: _id, ...rest }) => rest)(recipe);

function makeApi(
  options: {
    user?: string | null;
    limited?: boolean;
    importContent?: (url: string) => Promise<RecipeContent>;
    readDocument?: (bytes: Uint8Array, signal: AbortSignal) => Promise<string>;
    extractDocument?: (
      text: string,
      sourceUrl: string | undefined,
      signal: AbortSignal,
    ) => Promise<RecipeContent>;
  } = {},
) {
  const calls: Array<{ name: string; args: unknown[] }> = [];
  const service = {
    listRecipes: async (...args: unknown[]) => {
      calls.push({ name: "listRecipes", args });
      return {
        items: [
          {
            id,
            title: recipe.title,
            description: recipe.description,
            time: recipe.time,
            tags: recipe.tags,
            revision: 2,
            createdAt: "a",
            updatedAt: "b",
          },
        ],
        total: 1,
      };
    },
    getRecipe: async (...args: unknown[]) => {
      calls.push({ name: "getRecipe", args });
      return { recipe, revision: 2 };
    },
    createRecipe: async (...args: unknown[]) => {
      calls.push({ name: "createRecipe", args });
      if (args[1] && typeof args[1] === "object" && "id" in args[1])
        return { status: "invalid", issues: [{ path: ["id"], message: "Unrecognized key." }] };
      return { status: "saved", recipe, revision: 1 };
    },
    replaceRecipe: async (...args: unknown[]) => {
      calls.push({ name: "replaceRecipe", args });
      return { status: "conflict", revision: 3 };
    },
    deleteRecipe: async (...args: unknown[]) => {
      calls.push({ name: "deleteRecipe", args });
      return { status: "deleted", recipeId: id, revision: 2 };
    },
  };
  const api = createRecipeApi({
    getUser: async () =>
      options.user === undefined ? { id: "owner-1" } : options.user ? { id: options.user } : null,
    getService: async () => service as never,
    limiter: options.limited
      ? { check: () => ({ allowed: false, retryAfterSeconds: 4 }) }
      : undefined,
    importContent: options.importContent,
    readDocument: options.readDocument,
    extractDocument: options.extractDocument,
  });
  return { api, calls };
}

function request(url: string, method = "GET", bodyValue?: unknown) {
  return new Request(url, {
    method,
    headers: {
      "x-request-id": "doc-api-test",
      ...(bodyValue === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(bodyValue === undefined ? {} : { body: JSON.stringify(bodyValue) }),
  });
}

test("lists document summaries with search, normalized tag filter, and authenticated owner", async () => {
  const { api, calls } = makeApi();
  const response = await api.list(
    request("http://test/api/v1/recipes?search=butter&tag=  Weeknight%20%20Meals&page=2"),
  );
  assert.equal(response!.status, 200);
  assert.deepEqual(calls[0], {
    name: "listRecipes",
    args: [
      "owner-1",
      {
        page: 2,
        pageSize: 25,
        search: "butter",
        tag: "Weeknight  Meals",
        tags: ["weeknight meals"],
      },
    ],
  });
});

test("returns a recipe and revision envelope, preserving recipes without yield", async () => {
  const { api } = makeApi();
  const response = await api.get(request(`http://test/api/v1/recipes/${id}`), id);
  assert.equal(response!.status, 200);
  assert.deepEqual((await response!.json()).data, { recipe, revision: 2 });
  assert.equal("yield" in recipe, false);
});

test("creates a document content object without accepting an ID from the client", async () => {
  const { api, calls } = makeApi();
  const response = await api.create(request("http://test/api/v1/recipes", "POST", content));
  assert.equal(response!.status, 201);
  assert.equal(calls[0]!.name, "createRecipe");
  assert.deepEqual(calls[0]!.args.slice(0, 2), ["owner-1", content]);
  assert.deepEqual((await response!.json()).data, { recipe, revision: 1 });
});

test("replaces the full document using an expected revision and returns stale edits as 409", async () => {
  const { api, calls } = makeApi();
  const response = await api.replace(
    request(`http://test/api/v1/recipes/${id}`, "PUT", { recipe, expectedRevision: 2 }),
    id,
  );
  assert.equal(response!.status, 409);
  assert.deepEqual(calls[0]!.args.slice(0, 3), ["owner-1", recipe, 2]);
  assert.deepEqual((await response!.json()).error.details, { currentRevision: 3 });
});

test("deletes with a revision precondition", async () => {
  const { api, calls } = makeApi();
  const response = await api.remove(
    request(`http://test/api/v1/recipes/${id}`, "DELETE", { expectedRevision: 2 }),
    id,
  );
  assert.equal(response!.status, 204);
  assert.deepEqual(calls[0]!.args.slice(0, 3), ["owner-1", id, 2]);
});

test("authenticates and rate limits before calling document services", async () => {
  const unauthenticated = makeApi({ user: null });
  assert.equal(
    (await unauthenticated.api.list(request("http://test/api/v1/recipes")))!.status,
    401,
  );
  assert.equal(unauthenticated.calls.length, 0);
  const limited = makeApi({ limited: true });
  assert.equal(
    (await limited.api.create(request("http://test/api/v1/recipes", "POST", content)))!.status,
    429,
  );
  assert.equal(limited.calls.length, 0);
});

test("rejects an ID in create content and a path/body ID mismatch", async () => {
  const { api, calls } = makeApi();
  assert.equal(
    (await api.create(request("http://test/api/v1/recipes", "POST", recipe)))!.status,
    422,
  );
  assert.equal(
    (await api.replace(
      request(`http://test/api/v1/recipes/${id}`, "PUT", {
        recipe: { ...recipe, id: "a75a85ad-7881-48a8-bd79-322087325b3c" },
        expectedRevision: 1,
      }),
      id,
    ))!.status,
    422,
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0]!.name, "createRecipe");
});

test("rejects invalid website URLs and safely reports blocked destinations", async () => {
  let importCalls = 0;
  const invalid = makeApi({
    importContent: async () => {
      importCalls++;
      return content;
    },
  });
  const invalidResponse = await invalid.api.importRecipe(
    request("http://test/api/v1/recipes/import", "POST", { url: "file:///etc/passwd" }),
  );
  assert.equal(invalidResponse!.status, 422);
  assert.equal((await invalidResponse!.json()).error.code, "invalid_url");
  assert.equal(importCalls, 0);

  const blockedUrl = "http://127.0.0.1/private";
  const blocked = makeApi({
    importContent: async () => {
      throw new SourceReadError("blocked_destination");
    },
  });
  const blockedResponse = await blocked.api.importRecipe(
    request("http://test/api/v1/recipes/import", "POST", { url: blockedUrl }),
  );
  const blockedBody = await blockedResponse!.json();
  assert.equal(blockedResponse!.status, 422);
  assert.equal(blockedBody.error.code, "blocked_destination");
  assert.doesNotMatch(JSON.stringify(blockedBody), /127\.0\.0\.1|private/);
});

test("preserves website source URL and allows omitted yield", async () => {
  const websiteUrl = "https://recipes.example/pickled-onions";
  const importedContent: RecipeContent = { ...content, sourceUrl: websiteUrl };
  const { api, calls } = makeApi({
    importContent: async (url) => {
      assert.equal(url, websiteUrl);
      return importedContent;
    },
  });
  const response = await api.importRecipe(
    request("http://test/api/v1/recipes/import", "POST", { url: websiteUrl }),
  );
  assert.equal(response!.status, 201);
  const createdContent = calls.find((call) => call.name === "createRecipe")!
    .args[1] as RecipeContent;
  assert.equal(createdContent.sourceUrl, websiteUrl);
  assert.equal("yield" in createdContent, false);
});

function pdfRequest(file: File) {
  const form = new FormData();
  form.set("file", file);
  return new Request("http://test/api/v1/recipes/import/document", {
    method: "POST",
    headers: { "x-request-id": "doc-pdf-test" },
    body: form,
  });
}

test("imports PDF content without fabricating yield or source URL", async () => {
  const pdfBytes = new TextEncoder().encode("%PDF-1.7 test");
  const { api, calls } = makeApi({
    readDocument: async (bytes) => {
      assert.deepEqual(bytes, pdfBytes);
      return "Pickled onions. Combine onion, vinegar, and salt.";
    },
    extractDocument: async (text, sourceUrl) => {
      assert.match(text, /Pickled onions/);
      assert.equal(sourceUrl, undefined);
      return content;
    },
  });
  const response = await api.importDocument(
    pdfRequest(new File([pdfBytes], "recipe.pdf", { type: "application/pdf" })),
  );
  assert.equal(response!.status, 201);
  const createdContent = calls.find((call) => call.name === "createRecipe")!
    .args[1] as RecipeContent;
  assert.equal("yield" in createdContent, false);
  assert.equal("sourceUrl" in createdContent, false);
});

test("rejects malformed and oversized PDF multipart uploads", async () => {
  const { api } = makeApi();
  const malformedForm = new FormData();
  malformedForm.set("other", new Blob(["x"]), "other.pdf");
  const malformed = await api.importDocument(
    new Request("http://test/api/v1/recipes/import/document", {
      method: "POST",
      body: malformedForm,
    }),
  );
  assert.equal(malformed!.status, 422);
  assert.equal((await malformed!.json()).error.code, "invalid_request");

  const oversizedFile = new File([new Uint8Array(MAX_PDF_BYTES + 1)], "large.pdf", {
    type: "application/pdf",
  });
  const oversized = await api.importDocument(pdfRequest(oversizedFile));
  assert.equal(oversized!.status, 422);
  assert.equal((await oversized!.json()).error.code, "too_large");
});

test("returns safe PDF timeout and extraction errors", async () => {
  const pdfBytes = new TextEncoder().encode("%PDF-1.7 test");
  const file = new File([pdfBytes], "confidential-name.pdf", { type: "application/pdf" });
  const timedOut = makeApi({
    readDocument: async () => {
      throw new DocumentReadError("parse_timeout");
    },
  });
  const timeoutResponse = await timedOut.api.importDocument(pdfRequest(file));
  assert.equal(timeoutResponse!.status, 422);
  assert.equal((await timeoutResponse!.json()).error.code, "parse_timeout");
  assert.equal(
    timedOut.calls.some((call) => call.name === "createRecipe"),
    false,
  );

  const extractionFailed = makeApi({
    readDocument: async () => "private recipe source text",
    extractDocument: async () => {
      throw new SourceReadError("extraction_failed");
    },
  });
  const failureResponse = await extractionFailed.api.importDocument(pdfRequest(file));
  const failureBody = await failureResponse!.json();
  assert.equal(failureResponse!.status, 422);
  assert.equal(failureBody.error.code, "extraction_failed");
  assert.doesNotMatch(JSON.stringify(failureBody), /confidential-name|private recipe source text/);
  assert.equal(
    extractionFailed.calls.some((call) => call.name === "createRecipe"),
    false,
  );
});
