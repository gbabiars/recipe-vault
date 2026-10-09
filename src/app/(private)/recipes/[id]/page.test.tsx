import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import type { Recipe } from "@/lib/db/recipe-repository";
import RecipePage from "./page";

const recipe: Recipe = {
  id: "recipe-1",
  ownerId: "user-1",
  title: "Tomato soup",
  summary: "Fresh basil soup",
  tags: [],
  notes: "A note",
  ingredients: [{ displayOrder: 1, amount: "2 cups", ingredientName: "tomatoes" }],
  steps: [{ stepOrder: 1, instruction: "Simmer." }],
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
};

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "user-1" }) }));
vi.mock("@/lib/recipes", () => ({
  getRecipeService: async () => ({ get: async () => recipe }),
}));
vi.mock("@/app/(private)/recipes/_actions/recipe-actions", () => ({
  deleteRecipeAction: async () => ({ errors: {} }),
}));

test("shows cards in order with Notes when present", async () => {
  render(
    <ToastProvider>
      {await RecipePage({ params: Promise.resolve({ id: recipe.id }) })}
    </ToastProvider>,
  );
  expect(
    screen.getByRole("heading", { level: 1, name: "Tomato soup" }).getAttribute("data-level"),
  ).toBe("2");
  expect(screen.getByText("Fresh basil soup").getAttribute("data-size")).toBe("medium");
  expect(
    screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
  ).toEqual(["Details", "Ingredients", "Method", "Notes"]);
  expect(screen.getByRole("button", { name: "Actions" })).toBeTruthy();
});

test("omits Notes when the recipe has none", async () => {
  recipe.notes = undefined;
  render(
    <ToastProvider>
      {await RecipePage({ params: Promise.resolve({ id: recipe.id }) })}
    </ToastProvider>,
  );
  expect(screen.queryByRole("heading", { name: "Notes" })).toBeNull();
  expect(
    screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent),
  ).toEqual(["Details", "Ingredients", "Method"]);
  recipe.notes = "A note";
});
