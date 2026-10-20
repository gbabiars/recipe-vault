import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import { expect, userEvent } from "storybook/test";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
import type { RecipeChatMessage } from "@/lib/recipes/recipe-chat-message";
import SearchPage from "./page";

const recipe: RecipeSummary = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Japanese chicken tacos",
  description: "Quick tacos with seasoned chicken, miso, and lime.",
  time: { totalMinutes: 25 },
  tags: ["weeknight", "dinner"],
  revision: 1,
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
};

const originalFetch = globalThis.fetch;
let requestedSearchUrl: string | undefined;
let requestedSearchInit: RequestInit | undefined;

const meta = {
  title: "App/Search/SearchPage",
  component: SearchPage,
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    requestedSearchUrl = undefined;
    requestedSearchInit = undefined;
    globalThis.fetch = async (input, init) => {
      requestedSearchUrl = String(input);
      requestedSearchInit = init;
      return createUIMessageStreamResponse({
        stream: createUIMessageStream<RecipeChatMessage>({
          execute({ writer }) {
            writer.write({ type: "start" });
            writer.write({
              type: "data-recipe-search-results",
              data: { recipes: [recipe], total: 1 },
            });
          },
        }),
      });
    };
    return () => {
      globalThis.fetch = originalFetch;
    };
  },
} satisfies Meta<typeof SearchPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initial: Story = {};

export const SearchResults: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "What sounds good tonight?" })).toBeVisible();
    const input = canvas.getByRole("textbox", { name: "Search your recipes" });
    await expect(input).toHaveAttribute("placeholder", "Try “easy chicken” or “quick dinner”...");
    await userEvent.type(input, "quick Japanese chicken");
    await userEvent.keyboard("{Meta>}{Enter}{/Meta}");
    await expect(
      await canvas.findByRole("link", { name: "View Japanese chicken tacos" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("heading", { name: "What sounds good tonight?" }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByText("quick Japanese chicken")).toBeVisible();
    await expect(input).toHaveValue("");
    await expect(requestedSearchUrl).toBe("/api/v1/recipes/chat");
    await expect(requestedSearchInit?.method).toBe("POST");
    const requestBody = JSON.parse(String(requestedSearchInit?.body));
    const submittedMessage = requestBody.messages.at(-1);
    await expect(submittedMessage.role).toBe("user");
    await expect(submittedMessage.parts).toEqual([
      { type: "text", text: "quick Japanese chicken" },
    ]);
  },
};
