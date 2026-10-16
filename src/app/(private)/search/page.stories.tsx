import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent } from "storybook/test";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
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

const meta = {
  title: "App/Search/SearchPage",
  component: SearchPage,
  parameters: { layout: "fullscreen" },
  beforeEach: () => {
    requestedSearchUrl = undefined;
    globalThis.fetch = async (input) => {
      requestedSearchUrl = String(input);
      return Response.json({ data: [recipe], meta: { total: 1, page: 1, pageSize: 25 } });
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
    await userEvent.type(input, "Japanese chicken");
    await userEvent.keyboard("{Meta>}{Enter}{/Meta}");
    await expect(
      await canvas.findByRole("link", { name: "View Japanese chicken tacos" }),
    ).toBeVisible();
    await expect(
      canvas.queryByRole("heading", { name: "What sounds good tonight?" }),
    ).not.toBeInTheDocument();
    await expect(input).toHaveValue("Japanese chicken");
    const requestUrl = new URL(requestedSearchUrl!, "http://localhost");
    await expect(requestUrl.pathname).toBe("/api/v1/recipes");
    await expect(requestUrl.searchParams.get("search")).toBe("Japanese chicken");
    await expect(requestUrl.searchParams.get("pageSize")).toBe("25");
  },
};
