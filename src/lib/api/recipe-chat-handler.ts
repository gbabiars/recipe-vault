import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
import { recipeChatMessageSchema, recipeChatRequestSchema } from "@/lib/validation/recipe-chat";
import { recipeSearchRequestSchema } from "@/lib/validation/recipe-search";
import type { RecipeChatMessage } from "@/lib/recipes/recipe-chat-message";
import { createRecipeSearchApi } from "./recipe-search-handler";
import { requestId } from "./observability";

type Dependencies = Parameters<typeof createRecipeSearchApi>[0];
type SearchResponse = {
  data: RecipeSummary[];
  meta: { total: number };
};

function responseError(status: number, code: string, message: string, id: string) {
  return Response.json(
    { error: { code, message, requestId: id } },
    { status, headers: { "cache-control": "private, no-store" } },
  );
}

export function createRecipeChatApi(deps: Dependencies) {
  const searchApi = createRecipeSearchApi(deps);

  return {
    async post(request: Request) {
      const id = requestId(request);
      let input: unknown;
      try {
        input = await request.json();
      } catch {
        return responseError(400, "invalid_json", "Request body must be valid JSON.", id);
      }

      const chatBody = recipeChatRequestSchema.safeParse(input);
      if (!chatBody.success) {
        return responseError(422, "invalid_request", "Enter a recipe or ingredient to search.", id);
      }

      const message = recipeChatMessageSchema.safeParse(chatBody.data.messages.at(-1));
      if (!message.success) {
        return responseError(422, "invalid_request", "Enter a recipe or ingredient to search.", id);
      }

      const prompt = message.data.parts.map((part) => part.text).join(" ");
      const searchRequestBody = recipeSearchRequestSchema.safeParse({ prompt });
      if (!searchRequestBody.success) {
        return responseError(422, "invalid_request", "Enter a recipe or ingredient to search.", id);
      }

      const searchRequest = new Request(request.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": id,
        },
        body: JSON.stringify(searchRequestBody.data),
      });
      const searchResponse = await searchApi.post(searchRequest);
      if (!searchResponse.ok) return searchResponse;

      const result = (await searchResponse.json()) as SearchResponse;
      const stream = createUIMessageStream<RecipeChatMessage>({
        execute({ writer }) {
          writer.write({ type: "start" });
          writer.write({
            type: "data-recipe-search-results",
            data: { recipes: result.data, total: result.meta.total },
          });
        },
      });

      return createUIMessageStreamResponse({
        stream,
        headers: { "cache-control": "private, no-store" },
      });
    },
  };
}
