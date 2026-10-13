import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
import { RecipeList } from "./recipe-list";

test("renders document summaries in a stable semantic list", () => {
  const summaries: RecipeSummary[] = [
    {
      id: "orange-shortbread",
      title: "Orange shortbread",
      description: "Crisp cookies.",
      yield: { amount: 24, unit: "cookies" },
      time: { cookMinutes: 18 },
      tags: ["baking"],
      revision: 1,
      createdAt: "2026-09-01T12:00:00.000Z",
      updatedAt: "2026-09-15T12:00:00.000Z",
    },
    {
      id: "pickled-onions",
      title: "Quick pickled onions",
      description: "",
      time: {},
      tags: [],
      revision: 3,
      createdAt: "2026-09-01T12:00:00.000Z",
      updatedAt: "2026-09-15T12:00:00.000Z",
    },
  ];

  render(<RecipeList documentSummaries={summaries} />);

  const list = screen.getByRole("list", { name: "Recipes" });
  const items = within(list).getAllByRole("listitem");
  expect(items.map((item) => within(item).getByRole("link").textContent)).toEqual([
    "Orange shortbread",
    "Quick pickled onions",
  ]);
  expect(within(items[0]).getByText("Yield: 24 cookies")).toBeTruthy();
  expect(within(items[1]).queryByText(/Yield:/)).toBeNull();
});
