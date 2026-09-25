import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { Recipe } from "@/lib/db/recipe-repository";
import {
  RecipeDeleteCard,
  RecipeDetailsCard,
  RecipeIngredientsCard,
  RecipeMethodCard,
  RecipeNotesCard,
} from "./recipe-detail-cards";

const recipe: Recipe = {
  id: "recipe-1",
  ownerId: "user-1",
  title: "Tomato soup",
  summary: "Fresh basil soup",
  servings: 0,
  prepTimeMinutes: 10,
  cookTimeMinutes: 20,
  totalTimeMinutes: 30,
  sourceUrl: "https://example.com/soup",
  tags: ["soup"],
  dietaryFlags: ["vegetarian"],
  notes: "First line\nSecond line",
  ingredients: [
    { displayOrder: 1, quantity: 2, unit: "cups", ingredientName: "tomatoes", notes: "chopped" },
  ],
  steps: [{ stepOrder: 1, instruction: "Simmer tomatoes.", durationMinutes: 0 }],
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
};

afterEach(cleanup);

test("details render metadata, source, and labels, including zero servings", () => {
  const { container } = render(<RecipeDetailsCard recipe={recipe} />);
  const details = container.querySelector("section")!;
  expect(within(details).getByText("Servings").tagName).toBe("DT");
  expect(within(details).getByText("0").tagName).toBe("DD");
  expect(within(details).getByText("10 minutes")).toBeTruthy();
  expect(within(details).getByText("20 minutes")).toBeTruthy();
  expect(within(details).getByText("30 minutes")).toBeTruthy();
  expect(
    within(details).getByRole("link", { name: "View original source" }).getAttribute("href"),
  ).toBe(recipe.sourceUrl);
  expect(within(details).getByText("soup")).toBeTruthy();
  expect(within(details).getByText("vegetarian")).toBeTruthy();
});

test("details omit optional metadata and source", () => {
  render(
    <RecipeDetailsCard
      recipe={{
        ...recipe,
        servings: undefined,
        prepTimeMinutes: undefined,
        cookTimeMinutes: undefined,
        totalTimeMinutes: undefined,
        sourceUrl: undefined,
        tags: [],
        dietaryFlags: [],
      }}
    />,
  );
  expect(screen.queryByText("Servings")).toBeNull();
  expect(screen.queryByText("Prep")).toBeNull();
  expect(screen.queryByText("Cook")).toBeNull();
  expect(screen.queryByText("Total")).toBeNull();
  expect(screen.queryByRole("link", { name: "View original source" })).toBeNull();
});

test("ingredient and method cards keep semantic lists and optional annotations", () => {
  render(
    <>
      <RecipeIngredientsCard ingredients={recipe.ingredients} />
      <RecipeMethodCard steps={recipe.steps} />
    </>,
  );
  expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
    "2 cups tomatoes — chopped",
    "Simmer tomatoes.0 minutes",
  ]);
  expect(screen.getAllByRole("list").map((list) => list.tagName)).toEqual(["UL", "OL"]);
});

test("notes preserve line breaks and delete card renders the shared form", () => {
  render(
    <>
      <RecipeNotesCard notes={recipe.notes!} />
      <RecipeDeleteCard recipeId={recipe.id} deleteAction={async () => ({ errors: {} })} />
    </>,
  );
  expect(screen.getByText("First line Second line").textContent).toBe(recipe.notes);
  expect(screen.getByText("This cannot be undone.")).toBeTruthy();
  expect(
    screen.getByRole("checkbox", { name: "I understand this permanently deletes the recipe." }),
  ).toBeTruthy();
  expect(document.querySelector('input[name="recipeId"]')?.getAttribute("value")).toBe(recipe.id);
});
