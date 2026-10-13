import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import type { RecipeContent } from "@/lib/validation/recipe-document";
import {
  RecipeDetailsCard,
  RecipeDocumentDetailCards,
  RecipeIngredientsCard,
  RecipeMethodCard,
  RecipeNotesCard,
} from "./recipe-detail-cards";

const recipe: RecipeContent = {
  title: "Tomato soup",
  description: "Fresh basil soup",
  yield: { amount: 4, unit: "servings" },
  time: { prepMinutes: 10, cookMinutes: 20, totalMinutes: 30 },
  sourceUrl: "https://example.com/soup",
  tags: ["soup"],
  ingredients: [{ amount: "2 cups", name: "tomatoes", note: "chopped" }],
  equipment: [],
  instructions: ["Simmer tomatoes. (Duration: 0 minutes)"],
  notes: ["First note", "Second note"],
};

test("details render document metadata, source, and labels including tags", () => {
  render(<RecipeDetailsCard recipe={recipe} />);
  const details = screen.getByRole("heading", { level: 2, name: "Details" }).closest("section")!;
  expect(within(details).getByText("Yield").tagName).toBe("DT");
  expect(within(details).getByText("4 servings").tagName).toBe("DD");
  expect(within(details).getByText("10 minutes")).toBeTruthy();
  expect(within(details).getByText("20 minutes")).toBeTruthy();
  expect(within(details).getByText("30 minutes")).toBeTruthy();
  expect(
    within(details).getByRole("link", { name: "View original source" }).getAttribute("href"),
  ).toBe(recipe.sourceUrl);
  expect(within(details).getByText("soup")).toBeTruthy();
});

test("ingredient and method cards keep semantic lists and document annotations", () => {
  render(
    <>
      <RecipeIngredientsCard ingredients={recipe.ingredients} />
      <RecipeMethodCard instructions={recipe.instructions} />
    </>,
  );
  expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
    "2 cups tomatoes — chopped",
    "Simmer tomatoes. (Duration: 0 minutes)",
  ]);
  expect(screen.getAllByRole("list").map((list) => list.tagName)).toEqual(["UL", "OL"]);
});

test("notes render as a semantic list", () => {
  render(<RecipeNotesCard notes={recipe.notes} />);
  expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(recipe.notes);
});

test("document detail composition renders each shared card and optional equipment", () => {
  render(
    <RecipeDocumentDetailCards
      recipe={{
        ...recipe,
        yield: undefined,
        time: {},
        equipment: [{ name: "baking sheet" }, { name: "parchment paper", note: "optional" }],
      }}
    />,
  );

  expect(screen.getByText("baking sheet")).toBeTruthy();
  expect(screen.getByText("parchment paper — optional")).toBeTruthy();
  expect(screen.getByText("2 cups tomatoes — chopped")).toBeTruthy();
  expect(screen.getByText("First note")).toBeTruthy();
  expect(screen.queryByText("Yield")).toBeNull();
  expect(screen.getAllByRole("list").map((list) => list.tagName)).toEqual(["UL", "UL", "OL", "UL"]);
});

test("document detail composition omits empty optional sections", () => {
  const { container } = render(
    <RecipeDocumentDetailCards
      recipe={{ ...recipe, equipment: [], notes: [], tags: [], sourceUrl: undefined }}
    />,
  );

  expect(screen.queryByText("Equipment")).toBeNull();
  expect(screen.queryByText("Notes")).toBeNull();
  expect(screen.queryByRole("link", { name: "View original source" })).toBeNull();
  expect(container.querySelectorAll("section")).toHaveLength(3);
});
