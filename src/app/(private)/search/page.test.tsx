import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
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
  Response.json({ data: [recipe], meta: { total: 1, page: 1, pageSize: 25 } }),
);

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("submits the natural-language prompt to the recipe search API", async () => {
  render(<SearchPage />);

  const input = screen.getByRole("textbox", { name: "Search your recipes" });
  await userEvent.type(input, "Japanese chicken");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(fetchMock).toHaveBeenCalledWith("/api/v1/recipes/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: "Japanese chicken" }),
    cache: "no-store",
  });
  expect(await screen.findByText("Japanese chicken")).toBeVisible();
  expect(await screen.findByRole("link", { name: "View Japanese chicken curry" })).toBeVisible();
  expect(input).toHaveValue("");
});
