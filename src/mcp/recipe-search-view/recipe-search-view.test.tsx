import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import "../../app/globals.css";
import { RecipeSearchView } from "./recipe-search-view-component";
import { getRecipeSearchViewState } from "./recipe-search-view-state";

const recipeId = "00000000-0000-4000-8000-000000000201";

test("renders display-only recipe cards with optional recipe details", () => {
  render(
    <RecipeSearchView
      state="recipes"
      recipes={[
        {
          id: recipeId,
          title: "Tomato soup",
          summary: "A simple soup with basil.",
          prepTimeMinutes: 10,
          cookTimeMinutes: 20,
          totalTimeMinutes: 30,
          servings: 4,
          tags: ["soup", "vegetarian"],
        },
      ]}
    />,
  );

  expect(screen.getByRole("heading", { name: "Search results", level: 1 })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Tomato soup", level: 2 })).toBeInTheDocument();
  expect(screen.getByText("A simple soup with basil.")).toBeInTheDocument();
  expect(
    screen.getByText("Prep: 10 min · Cook: 20 min · Total: 30 min · Serves: 4"),
  ).toBeInTheDocument();
  expect(screen.getByText("soup")).toBeInTheDocument();
  expect(screen.getByText("vegetarian")).toBeInTheDocument();
  expect(screen.queryByText(recipeId)).toBeNull();
  expect(screen.getByRole("list", { name: "Recipe search results" })).toBeInTheDocument();
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});

test("renders a minimal result without blank metadata or tags", () => {
  render(
    <RecipeSearchView
      state="recipes"
      recipes={[{ id: recipeId, title: "Plain rice", tags: [] }]}
    />,
  );

  expect(screen.getByRole("heading", { name: "Plain rice", level: 2 })).toBeInTheDocument();
  expect(screen.queryByText(/Prep:|Cook:|Total:|Serves:/u)).toBeNull();
  expect(screen.queryByRole("list", { name: "Tags for Plain rice" })).toBeNull();
});

test("shows loading, empty, and error states with status semantics", () => {
  const loading = render(<RecipeSearchView state="loading" />);
  expect(screen.getByRole("status")).toHaveTextContent("Loading search results…");
  expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");

  loading.rerender(<RecipeSearchView state="empty" />);
  expect(screen.getByRole("status")).toHaveTextContent("No recipes matched this search.");

  loading.rerender(<RecipeSearchView state="error" />);
  expect(screen.getByRole("alert")).toHaveTextContent("Search results could not be displayed.");
});

test("maps malformed or private fields in a tool payload to the error view", () => {
  const state = getRecipeSearchViewState({
    recipes: [
      {
        id: recipeId,
        title: "Tomato soup",
        tags: [],
        ownerId: "private-owner",
        createdAt: "2026-10-01T12:00:00.000Z",
      },
    ],
  });

  expect(state).toEqual({ state: "error" });
  render(<RecipeSearchView {...state} />);
  expect(screen.getByRole("alert")).toHaveTextContent("Search results could not be displayed.");
  expect(screen.queryByText("private-owner")).toBeNull();
});

test("uses different canvas tokens for light and dark host themes", () => {
  const root = document.documentElement;
  const previousTheme = root.getAttribute("data-theme");

  root.setAttribute("data-theme", "light");
  const lightCanvas = getComputedStyle(root).getPropertyValue("--color-background-canvas");
  render(
    <RecipeSearchView
      state="recipes"
      recipes={[{ id: recipeId, title: "Plain rice", tags: [] }]}
    />,
  );
  const card = screen.getByRole("listitem");
  const lightCardBackground = getComputedStyle(card).backgroundColor;

  root.setAttribute("data-theme", "dark");
  const darkCanvas = getComputedStyle(root).getPropertyValue("--color-background-canvas");
  const darkCardBackground = getComputedStyle(card).backgroundColor;
  expect(screen.getByRole("heading", { name: "Plain rice", level: 2 })).toBeInTheDocument();

  if (previousTheme) {
    root.setAttribute("data-theme", previousTheme);
  } else {
    root.removeAttribute("data-theme");
  }

  expect(lightCanvas).not.toBe("");
  expect(darkCanvas).not.toBe("");
  expect(darkCanvas).not.toBe(lightCanvas);
  expect(lightCardBackground).not.toBe(darkCardBackground);
});
