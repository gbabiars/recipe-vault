import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import type { Recipe } from "@/lib/db/recipe-repository";

let RecipePage: typeof import("./page").default;

const recipe: Recipe = {
  id: "recipe-1",
  ownerId: "user-1",
  title: "Tomato soup",
  summary: "Fresh basil soup",
  tags: [],
  dietaryFlags: [],
  notes: "A note",
  ingredients: [{ displayOrder: 1, quantity: 2, unit: "cups", ingredientName: "tomatoes" }],
  steps: [{ stepOrder: 1, instruction: "Simmer." }],
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
};

vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "user-1" }) }));
vi.mock("@/lib/recipes", () => ({
  getRecipeService: async () => ({ get: async () => recipe }),
}));
vi.mock("@/features/recipes/actions", () => ({
  deleteRecipeAction: async () => ({ errors: {} }),
}));

beforeAll(async () => {
  vi.stubGlobal("process", { env: {} });
  RecipePage = (await import("./page")).default;
});

afterEach(cleanup);

afterAll(() => {
  vi.unstubAllGlobals();
});

test("shows cards in order with Notes when present", async () => {
  render(await RecipePage({ params: Promise.resolve({ id: recipe.id }) }));
  expect(
    screen.getByRole("heading", { level: 1, name: "Tomato soup" }).getAttribute("data-level"),
  ).toBe("2");
  expect(screen.getByText("Fresh basil soup").getAttribute("data-size")).toBe("medium");
  expect(
    screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
  ).toEqual(["Details", "Ingredients", "Method", "Notes", "Delete recipe"]);
});

test("omits Notes when the recipe has none", async () => {
  recipe.notes = undefined;
  render(await RecipePage({ params: Promise.resolve({ id: recipe.id }) }));
  expect(screen.queryByRole("heading", { name: "Notes" })).toBeNull();
  expect(
    screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
  ).toEqual(["Details", "Ingredients", "Method", "Delete recipe"]);
  recipe.notes = "A note";
});
