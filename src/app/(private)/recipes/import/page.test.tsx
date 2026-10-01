import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ImportRecipePage from "./page";

vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "user-1" }) }));

test("shows the import form with a recipes breadcrumb", async () => {
  render(await ImportRecipePage());

  expect(screen.getByRole("heading", { level: 1, name: "Import from a website" })).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Recipe website URL" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Import recipe" })).toBeTruthy();

  const breadcrumbs = screen.getByRole("navigation", { name: "Breadcrumbs" });
  expect(within(breadcrumbs).getByRole("link", { name: "Recipes" }).getAttribute("href")).toBe(
    "/recipes",
  );
  expect(screen.queryByRole("link", { name: "Create manually" })).toBeNull();
});
