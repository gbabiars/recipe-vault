import assert from "node:assert/strict";
import test from "node:test";
import type { RecipeService } from "@/lib/recipes/recipe-service";
import { createRecipeChatApi } from "./recipe-chat-handler";

test("chat searches only the latest conversational prompt for the verified owner", async () => {
  const prompts: string[] = [];
  const listCalls: unknown[][] = [];
  const api = createRecipeChatApi({
    getUser: async () => ({ id: "verified-owner" }),
    getService: async () =>
      ({
        listRecipes: async (...args: unknown[]) => {
          listCalls.push(args);
          return { items: [], total: 0 };
        },
      }) as unknown as RecipeService,
    parseSearch: async (prompt) => {
      prompts.push(prompt);
      return { matchAny: ["chicken"], preferences: ["easy", "quick"] };
    },
    limiter: { check: () => ({ allowed: true, retryAfterSeconds: 0 }) },
  });

  const response = await api.post(
    new Request("http://localhost/api/v1/recipes/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "user", parts: [{ type: "text", text: "old request" }] },
          { role: "user", parts: [{ type: "text", text: "easy and quick chicken" }] },
        ],
      }),
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(prompts, ["easy and quick chicken"]);
  assert.deepEqual(listCalls, [
    [
      "verified-owner",
      { search: '"chicken"', preference: "easy-quick", tags: [], page: 1, pageSize: 25 },
    ],
  ]);
  assert.match(await response.text(), /data-recipe-search-results/);
});
