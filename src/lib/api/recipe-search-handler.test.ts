import assert from "node:assert/strict";
import test from "node:test";
import type { RecipeService } from "@/lib/recipes/recipe-service";
import { createRecipeSearchApi } from "./recipe-search-handler";

const recipe = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Japanese chicken curry",
  description: "Chicken curry with ginger and rice.",
  time: { totalMinutes: 35 },
  tags: ["japanese", "dinner"],
  revision: 1,
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
};

function makeApi(
  options: {
    user?: string | null;
    matchAny?: string[];
    preferences?: Array<"easy" | "quick">;
    parseFailure?: boolean;
    listFailure?: boolean;
    limited?: boolean;
  } = {},
) {
  const parsedPrompts: string[] = [];
  const listCalls: unknown[][] = [];
  let serviceRequests = 0;
  const service = {
    async listRecipes(...args: unknown[]) {
      listCalls.push(args);
      if (options.listFailure) throw new Error("database error");
      return { items: [recipe], total: 1 };
    },
  } as unknown as RecipeService;

  const api = createRecipeSearchApi({
    getUser: async () =>
      options.user === undefined ? { id: "owner-1" } : options.user ? { id: options.user } : null,
    getService: async () => {
      serviceRequests++;
      return service;
    },
    parseSearch: async (prompt) => {
      parsedPrompts.push(prompt);
      if (options.parseFailure) throw new Error("provider error");
      return {
        matchAny: options.matchAny ?? ["Japanese", "beef"],
        preferences: options.preferences ?? [],
      };
    },
    limiter: {
      check: () => ({ allowed: !options.limited, retryAfterSeconds: 3 }),
    },
  });

  return {
    api,
    parsedPrompts,
    listCalls,
    get serviceRequests() {
      return serviceRequests;
    },
  };
}

function request(body: string | unknown) {
  return new Request("http://localhost/api/v1/recipes/search", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-request-id": "recipe-search-test",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("parses one prompt and searches the authenticated owner's recipes with OR", async () => {
  const context = makeApi();
  const response = await context.api.post(request({ prompt: "I want Japanese beef" }));

  assert.equal(response.status, 200);
  assert.deepEqual(context.parsedPrompts, ["I want Japanese beef"]);
  assert.deepEqual(context.listCalls, [
    [
      "owner-1",
      {
        search: '"Japanese" OR "beef"',
        preference: undefined,
        tags: [],
        page: 1,
        pageSize: 25,
      },
    ],
  ]);
  assert.deepEqual((await response.json()).data, [recipe]);
});

test("does not call the parser or recipe service for unauthenticated requests", async () => {
  const context = makeApi({ user: null });
  const response = await context.api.post(request({ prompt: "Japanese" }));

  assert.equal(response.status, 401);
  assert.equal(context.parsedPrompts.length, 0);
  assert.equal(context.serviceRequests, 0);
});

test("rejects invalid JSON and extra request fields before parsing", async () => {
  const context = makeApi();
  assert.equal((await context.api.post(request("{"))).status, 400);
  assert.equal(
    (await context.api.post(request({ prompt: "Japanese", ownerId: "another-owner" }))).status,
    422,
  );
  assert.equal(context.parsedPrompts.length, 0);
});

test("does not query the recipe service when the parser finds no supported terms", async () => {
  const context = makeApi({ matchAny: [] });
  const response = await context.api.post(request({ prompt: "What should I make?" }));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    data: [],
    meta: { page: 1, pageSize: 25, total: 0, requestId: "recipe-search-test" },
  });
  assert.equal(context.serviceRequests, 0);
});

test("preference-only requests query owned recipes without a text term", async () => {
  const context = makeApi({ matchAny: [], preferences: ["easy"] });
  const response = await context.api.post(request({ prompt: "I want something easy" }));

  assert.equal(response.status, 200);
  assert.deepEqual(context.listCalls, [
    ["owner-1", { search: undefined, preference: "easy", tags: [], page: 1, pageSize: 25 }],
  ]);
  assert.deepEqual((await response.json()).data, [recipe]);
});

test("combined text and preferences preserve first-mentioned ranking priority", async () => {
  const context = makeApi({ matchAny: ["chicken"], preferences: ["quick", "easy"] });
  const response = await context.api.post(request({ prompt: "quick and easy chicken" }));

  assert.equal(response.status, 200);
  assert.deepEqual(context.listCalls, [
    ["owner-1", { search: '"chicken"', preference: "quick-easy", tags: [], page: 1, pageSize: 25 }],
  ]);
});

test("rate limits before making an OpenAI request", async () => {
  const context = makeApi({ limited: true });
  const response = await context.api.post(request({ prompt: "Japanese" }));

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "3");
  assert.equal(context.parsedPrompts.length, 0);
});

test("returns a safe unavailable response when parsing fails", async () => {
  const context = makeApi({ parseFailure: true });
  const response = await context.api.post(request({ prompt: "private prompt" }));
  const body = await response.json();

  assert.equal(response.status, 503);
  assert.equal(body.error.code, "search_unavailable");
  assert.equal(JSON.stringify(body).includes("private prompt"), false);
  assert.equal(context.serviceRequests, 0);
});

test("returns a safe server error when recipe retrieval fails", async () => {
  const context = makeApi({ listFailure: true });
  const response = await context.api.post(request({ prompt: "Japanese" }));
  const body = await response.json();

  assert.equal(response.status, 500);
  assert.equal(body.error.code, "internal_error");
  assert.equal(JSON.stringify(body).includes("database error"), false);
});
