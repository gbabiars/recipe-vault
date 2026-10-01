import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
import { RecipeListCard } from "./recipe-list-card";

const recipe: RecipeSummary = {
  id: "tomato-soup",
  ownerId: "test-owner",
  title: "Tomato soup",
  summary: "A simple soup with fresh basil.",
  totalTimeMinutes: 0,
  tags: ["weeknight", "soup"],
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
};

test("shows recipe details in a linked list item", () => {
  render(
    <ul>
      <RecipeListCard recipe={recipe} />
    </ul>,
  );

  const item = screen.getByRole("listitem");
  const link = within(item).getByRole("link", { name: "View Tomato soup" });

  expect(link.getAttribute("href")).toBe("/recipes/tomato-soup");
  expect(within(item).getByRole("heading", { level: 2, name: "Tomato soup" })).toBeTruthy();
  expect(within(item).getByText("A simple soup with fresh basil.")).toBeTruthy();
  expect(within(item).getByText("0 min")).toBeTruthy();
  expect(within(item).getByText("Updated Sep 15, 2026")).toBeTruthy();
  expect(within(item).getByText("weeknight")).toBeTruthy();
  expect(within(item).getByText("soup")).toBeTruthy();
  expect(within(item).queryByText("vegetarian")).toBeNull();
});

test("omits optional summary, timing, and labels when absent", () => {
  render(
    <ul>
      <RecipeListCard
        recipe={{
          ...recipe,
          id: "plain-rice",
          title: "Plain rice",
          summary: undefined,
          totalTimeMinutes: undefined,
          tags: [],
        }}
      />
    </ul>,
  );

  const item = screen.getByRole("listitem");

  expect(within(item).getByRole("link", { name: "View Plain rice" }).getAttribute("href")).toBe(
    "/recipes/plain-rice",
  );
  expect(within(item).getByText("Updated Sep 15, 2026")).toBeTruthy();
  expect(within(item).queryByText("A simple soup with fresh basil.")).toBeNull();
  expect(within(item).queryByText(/\d+ min/)).toBeNull();
  expect(within(item).queryByText("weeknight")).toBeNull();
  expect(within(item).queryByText("vegetarian")).toBeNull();
});
