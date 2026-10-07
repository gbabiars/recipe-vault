import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { expect, test, vi } from "vitest";
import RecipesPage from "./page";

const { listMock, replaceMock } = vi.hoisted(() => ({
  listMock: vi.fn(async () => []),
  replaceMock: vi.fn(),
}));

vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "user-1" }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock("@/lib/recipes", () => ({
  getRecipeService: async () => ({ list: listMock }),
}));

test("ignores a saved dietary filter and preserves search and repeated tag values", async () => {
  const page = await RecipesPage({
    searchParams: Promise.resolve({
      q: "soup",
      tag: ["quick", "vegetarian"],
      dietary: "gluten-free",
    }),
  });
  const { container } = render(page);
  expect(
    screen.getByRole("heading", { level: 1, name: "Your recipes" }).getAttribute("data-level"),
  ).toBe("2");
  expect(screen.getByRole("searchbox", { name: "Search title" })).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "Tags" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Dietary flag" })).toBeNull();
  expect(container.querySelector("form")!.getAttribute("action")).toBeNull();
  const formData = new FormData(container.querySelector("form")!);
  expect(formData.get("q")).toBe("soup");
  expect(formData.getAll("tag")).toEqual(["quick", "vegetarian"]);
  await waitFor(() =>
    expect(listMock).toHaveBeenCalledWith("user-1", "soup", ["quick", "vegetarian"]),
  );
  const loading = screen.getByText("Loading your recipes…");
  expect(
    container.querySelector("form")!.compareDocumentPosition(loading) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

test("keeps website and PDF import available in the recipe menu", async () => {
  const page = await RecipesPage({ searchParams: Promise.resolve({}) });
  render(page);

  const trigger = screen.getByRole("button", { name: "Add a recipe" });
  expect(screen.queryByRole("menu")).toBeNull();

  await userEvent.click(trigger);

  expect(await screen.findByRole("menu")).toBeTruthy();
  expect(screen.getByRole("menuitem", { name: "Create manually" }).getAttribute("href")).toBe(
    "/recipes/new",
  );
  expect(
    screen.getByRole("menuitem", { name: "Import from website or PDF" }).getAttribute("href"),
  ).toBe("/recipes/import");

  await userEvent.keyboard("{Escape}");

  await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
  expect(document.activeElement).toBe(trigger);
});
