import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { expect, test, vi } from "vitest";
import { RecipeFilters } from "./_components/recipe-filters";
import { RecipesHeaderActions } from "./_components/recipes-header-actions";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));

test("ignores a saved dietary filter and preserves search and repeated tag values", async () => {
  const { container } = render(<RecipeFilters q="soup" tag={["quick", "vegetarian"]} />);
  expect(screen.getByRole("searchbox", { name: "Search title" })).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "Tags" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Dietary flag" })).toBeNull();
  expect(container.querySelector("form")!.getAttribute("action")).toBeNull();
  const formData = new FormData(container.querySelector("form")!);
  expect(formData.get("q")).toBe("soup");
  expect(formData.getAll("tag")).toEqual(["quick", "vegetarian"]);
  await userEvent.click(screen.getByRole("searchbox", { name: "Search title" }));
  await userEvent.keyboard("{Enter}");
  await waitFor(() =>
    expect(replaceMock).toHaveBeenCalledWith("/recipes?q=soup&tag=quick&tag=vegetarian", {
      scroll: false,
    }),
  );
});

test("keeps website and PDF import available in the recipe menu", async () => {
  render(<RecipesHeaderActions />);

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
