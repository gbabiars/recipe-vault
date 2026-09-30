import { cleanup, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "user-1" }) }));

let ImportRecipePage: typeof import("./page").default;

beforeAll(async () => {
  vi.stubGlobal("process", { env: {} });
  ImportRecipePage = (await import("./page")).default;
});

afterEach(cleanup);

afterAll(() => {
  vi.unstubAllGlobals();
});

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
