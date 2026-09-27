import { cleanup, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";

let RecipesPage: typeof import("./page").default;

vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "user-1" }) }));
vi.mock("next/form", () => ({
  __esModule: true,
  default: ({
    action,
    scroll: _scroll,
    ...props
  }: React.ComponentProps<"form"> & { scroll?: boolean }) => <form action={action} {...props} />,
}));
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

test("ignores a saved dietary filter and preserves search and tag values", async () => {
  const page = await RecipesPage({
    searchParams: Promise.resolve({ q: "soup", tag: "quick", dietary: "vegetarian" }),
  });
  const { container } = render(page);
  expect(
    screen.getByRole("heading", { level: 1, name: "Your recipes" }).getAttribute("data-level"),
  ).toBe("2");
  expect(screen.getByRole("searchbox", { name: "Search title" })).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "Tag" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Dietary flag" })).toBeNull();
  expect(container.querySelector("form")!.getAttribute("action")).toBe("/recipes");
  expect(Object.fromEntries(new FormData(container.querySelector("form")!))).toEqual({
    q: "soup",
    tag: "quick",
  });
  const loading = screen.getByText("Loading your recipes…");
  expect(
    container.querySelector("form")!.compareDocumentPosition(loading) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});
