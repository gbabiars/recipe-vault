import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import NewRecipePage from "./page";

vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "user-1" }) }));
vi.mock("@/features/recipes/actions", () => ({ saveRecipeAction: async () => ({ errors: {} }) }));

test("shows the recipe form with a recipes breadcrumb", async () => {
  render(await NewRecipePage());

  expect(screen.getByRole("heading", { level: 1, name: "Create recipe" })).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Title" })).toBeTruthy();

  const breadcrumbs = screen.getByRole("navigation", { name: "Breadcrumbs" });
  expect(within(breadcrumbs).getByRole("link", { name: "Recipes" }).getAttribute("href")).toBe(
    "/recipes",
  );
});
