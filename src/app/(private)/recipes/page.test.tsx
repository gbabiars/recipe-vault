import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

let RecipesPage: typeof import("./page").default;

vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "user-1" }) }));
vi.mock("@/lib/recipes", () => ({
  getRecipeService: async () => ({ list: async () => [] }),
}));

beforeAll(async () => {
  vi.stubGlobal("process", { env: {} });
  RecipesPage = (await import("./page")).default;
});

afterEach(cleanup);

afterAll(() => {
  vi.unstubAllGlobals();
});

test("labels search filters and preserves their query values", async () => {
  const page = await RecipesPage({
    searchParams: Promise.resolve({ q: "soup", tag: "quick", dietary: "vegetarian" }),
  });
  const { container } = render(page);
  expect(screen.getByRole("searchbox", { name: "Search title" })).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Tag" })).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Dietary flag" })).toBeTruthy();
  expect(Object.fromEntries(new FormData(container.querySelector("form")!))).toEqual({
    q: "soup",
    tag: "quick",
    dietary: "vegetarian",
  });
});
