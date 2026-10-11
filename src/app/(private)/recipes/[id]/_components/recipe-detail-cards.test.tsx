import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import type { Recipe } from "@/lib/db/recipe-repository";
import type { RecipeDocumentContent } from "@/lib/validation/recipe-document";
import {
  RecipeDocumentDetailCards,
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
  notes: "First line\nSecond line",
  ingredients: [
    { displayOrder: 1, amount: "2 cups", ingredientName: "tomatoes", notes: "chopped" },
  ],
  steps: [{ stepOrder: 1, instruction: "Simmer tomatoes.", durationMinutes: 0 }],
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
};

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
  expect(within(details).queryByText("vegetarian")).toBeNull();
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

test("ingredient displays omit amount cleanly when it is absent", () => {
  render(<RecipeIngredientsCard ingredients={[{ displayOrder: 1, ingredientName: "salt" }]} />);
  expect(screen.getByRole("listitem")).toHaveTextContent("salt");
});

test("notes preserve line breaks", () => {
  render(<RecipeNotesCard notes={recipe.notes!} />);
  expect(screen.getByText("First line Second line").textContent).toBe(recipe.notes);
});

const recipeDocument: RecipeDocumentContent = {
  title: "Orange shortbread",
  description: "Crisp cookies with orange zest.",
  yield: { amount: 24, unit: "cookies" },
  time: { cookMinutes: 18 },
  ingredients: [
    { name: "unsalted butter", amount: "1 cup", note: "softened" },
    { name: "flour", amount: "2 cups" },
    { name: "orange zest", amount: "zest of 1 orange" },
  ],
  equipment: [{ name: "baking sheet" }, { name: "parchment paper", note: "optional" }],
  instructions: ["Cream the butter.", "Shape and chill the dough.", "Bake until golden."],
  notes: ["The dough can be chilled overnight.", "Cool before storing."],
  tags: ["baking", "cookies"],
  sourceUrl: "https://example.com/orange-shortbread",
};

test("document detail composition renders yield, textual ingredient notes, equipment, and ordered arrays", () => {
  render(<RecipeDocumentDetailCards recipe={recipeDocument} />);

  expect(screen.getByText("24 cookies")).toBeTruthy();
  expect(screen.getByText("18 minutes")).toBeTruthy();
  expect(screen.getByRole("link", { name: "View original source" }).getAttribute("href")).toBe(
    recipeDocument.sourceUrl,
  );
  expect(screen.getByText("baking")).toBeTruthy();
  expect(screen.getByText("cookies")).toBeTruthy();
  expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
    "1 cup unsalted butter — softened",
    "2 cups flour",
    "zest of 1 orange orange zest",
    "baking sheet",
    "parchment paper — optional",
    "Cream the butter.",
    "Shape and chill the dough.",
    "Bake until golden.",
    "The dough can be chilled overnight.",
    "Cool before storing.",
  ]);
  expect(screen.getAllByRole("list").map((list) => list.tagName)).toEqual(["UL", "UL", "OL", "UL"]);
});

test("document details omit unknown yield, source, equipment, notes, and tags", () => {
  const { container } = render(
    <RecipeDocumentDetailCards
      recipe={{
        title: "Quick pickled onions",
        description: "",
        time: { prepMinutes: 10 },
        ingredients: [{ name: "red onion", amount: "1", note: "thinly sliced" }],
        equipment: [],
        instructions: ["Put the onion in a jar."],
        notes: [],
        tags: [],
      }}
    />,
  );

  expect(screen.getByText("10 minutes")).toBeTruthy();
  expect(screen.queryByText("Yield")).toBeNull();
  expect(screen.queryByRole("link", { name: "View original source" })).toBeNull();
  expect(screen.queryByText("Equipment")).toBeNull();
  expect(screen.queryByText("Notes")).toBeNull();
  expect(screen.queryByText("baking")).toBeNull();
  expect(container.querySelectorAll("section")).toHaveLength(3);
});
