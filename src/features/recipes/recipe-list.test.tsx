import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
import { RecipeList } from "./recipe-list";

const recipe: RecipeSummary = {
  id: "tomato-soup",
  ownerId: "test-owner",
  title: "Tomato soup",
  totalTimeMinutes: 35,
  servings: 4,
  tags: ["weeknight", "soup", "vegetarian"],
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
};

test("composes a padded card with a linked recipe list", () => {
  render(<RecipeList recipes={[recipe]} />);

  const recipeList = screen.getByRole("list", { name: "Recipes" });
  expect(recipeList.closest('[data-padding="none"]')).toBeTruthy();
  const item = within(recipeList).getByRole("listitem");
  expect(within(item).getByRole("link", { name: "Tomato soup" }).getAttribute("href")).toBe(
    "/recipes/tomato-soup",
  );
  expect(within(item).getByText("+1")).toBeTruthy();
});
