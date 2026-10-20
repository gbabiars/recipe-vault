import { render, screen, waitFor } from "@testing-library/react";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { userEvent } from "vitest/browser";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
import type { RecipeChatMessage } from "@/lib/recipes/recipe-chat-message";
import SearchPage from "./page";

const recipe: RecipeSummary = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Japanese chicken curry",
  description: "A curry with chicken, ginger, and rice.",
  time: { totalMinutes: 35 },
  tags: ["japanese", "dinner"],
  revision: 1,
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
};

const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
  createUIMessageStreamResponse({
    stream: createUIMessageStream<RecipeChatMessage>({
      execute({ writer }) {
        writer.write({ type: "start" });
        writer.write({
          type: "data-recipe-search-results",
          data: { recipes: [recipe], total: 1 },
        });
      },
    }),
  }),
);

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("submits the natural-language prompt to the recipe chat API", async () => {
  render(<SearchPage />);

  const input = screen.getByRole("textbox", { name: "Search your recipes" });
  expect(input).toHaveAttribute("placeholder", "Try “easy chicken” or “quick dinner”...");
  await userEvent.type(input, "quick Japanese chicken");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/v1/recipes/chat",
    expect.objectContaining({ method: "POST", headers: { "content-type": "application/json" } }),
  );
  const requestInit = fetchMock.mock.calls[0]?.[1];
  const requestBody = JSON.parse(String(requestInit?.body));
  const submittedMessage = requestBody.messages.at(-1);
  expect(submittedMessage.role).toBe("user");
  expect(submittedMessage.parts).toEqual([{ type: "text", text: "quick Japanese chicken" }]);
  expect(await screen.findByText("quick Japanese chicken")).toBeVisible();
  expect(await screen.findByRole("link", { name: "View Japanese chicken curry" })).toBeVisible();
  expect(input).toHaveValue("");
});
