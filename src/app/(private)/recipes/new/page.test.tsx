import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import NewRecipePage from "./page";

vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "user-1" }) }));
vi.mock("@/app/(private)/recipes/_actions/recipe-document-actions", () => ({
  saveRecipeDocumentAction: async () => ({ status: "saved" }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

test("shows the recipe form with a recipes breadcrumb", async () => {
  render(await NewRecipePage());

  expect(screen.getByRole("heading", { level: 1, name: "Create recipe" })).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Title" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Create recipe" })).toBeTruthy();
  expect(screen.getByLabelText("Yield amount")).toBeTruthy();

  const breadcrumbs = screen.getByRole("navigation", { name: "Breadcrumbs" });
  expect(within(breadcrumbs).getByRole("link", { name: "Recipes" }).getAttribute("href")).toBe(
    "/recipes",
  );
});
