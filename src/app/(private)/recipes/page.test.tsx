import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { RecipeFilters } from "./_components/recipe-filters";
import { RecipesHeaderActions } from "./_components/recipes-header-actions";
import RecipesPage from "./page";

const { replaceMock, listDocumentPageMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  listDocumentPageMock: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock("@/lib/auth/require-user", () => ({ requireUser: async () => ({ id: "owner-ada" }) }));
vi.mock("@/lib/recipes", () => ({
  getRecipeService: async () => ({ listDocumentPage: listDocumentPageMock }),
}));

const allRecipes = Array.from({ length: 53 }, (_, index) => ({
  id: `recipe-${index + 1}`,
  title: `Recipe ${index + 1}`,
  description: "",
  time: {},
  tags: [],
  revision: 1,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.000Z",
}));

type SearchParams = { q?: string; tag?: string | string[]; page?: string | string[] };

async function renderPage(searchParams: SearchParams = {}) {
  render(await RecipesPage({ searchParams: Promise.resolve(searchParams) }));
  await screen.findByRole("list", { name: "Recipes" });
}

function listedRecipes() {
  return within(screen.getByRole("list", { name: "Recipes" })).getAllByRole("link");
}

beforeEach(() => {
  listDocumentPageMock.mockReset();
  replaceMock.mockReset();
});
afterEach(() => cleanup());

test("ignores a saved dietary filter and preserves search and repeated tag values", async () => {
  const { container } = render(<RecipeFilters q="soup" tag={["quick", "vegetarian"]} />);
  expect(screen.getByRole("searchbox", { name: "Search" })).toBeTruthy();
  expect(screen.getByRole("combobox", { name: "Tags" })).toBeTruthy();
  expect(screen.queryByRole("textbox", { name: "Dietary flag" })).toBeNull();
  expect(container.querySelector("form")!.getAttribute("action")).toBeNull();
  const formData = new FormData(container.querySelector("form")!);
  expect(formData.get("q")).toBe("soup");
  expect(formData.getAll("tag")).toEqual(["quick", "vegetarian"]);
  await userEvent.click(screen.getByRole("searchbox", { name: "Search" }));
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

test("limits results to 25 and moves through pages in recipe order", async () => {
  listDocumentPageMock.mockImplementation(async (_ownerId, { page, pageSize }) => ({
    items: allRecipes.slice((page - 1) * pageSize, page * pageSize),
    total: allRecipes.length,
  }));

  await renderPage();
  expect(listedRecipes()).toHaveLength(25);
  expect(listedRecipes()[0]).toHaveTextContent("Recipe 1");
  expect(screen.getByText("Page 1 of 3 · 53 recipes")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/recipes?page=2");
  expect(listDocumentPageMock).toHaveBeenCalledWith("owner-ada", {
    search: undefined,
    tags: [],
    page: 1,
    pageSize: 25,
  });

  cleanup();
  await renderPage({ page: "2" });
  expect(listedRecipes()).toHaveLength(25);
  expect(listedRecipes()[0]).toHaveTextContent("Recipe 26");
  expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/recipes");
  expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/recipes?page=3");

  cleanup();
  await renderPage({ page: "3" });
  expect(listedRecipes()).toHaveLength(3);
  expect(listedRecipes()[0]).toHaveTextContent("Recipe 51");
  expect(screen.getByText("Page 3 of 3 · 53 recipes")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Next" })).not.toBeInTheDocument();
});

test("keeps search and repeated tags in page links", async () => {
  listDocumentPageMock.mockResolvedValue({ items: allRecipes.slice(25, 50), total: 53 });
  await renderPage({ q: "soup", tag: ["quick", "vegetarian"], page: "2" });

  expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
    "href",
    "/recipes?q=soup&tag=quick&tag=vegetarian",
  );
  expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
    "href",
    "/recipes?q=soup&tag=quick&tag=vegetarian&page=3",
  );
  expect(listDocumentPageMock).toHaveBeenCalledWith("owner-ada", {
    search: "soup",
    tags: ["quick", "vegetarian"],
    page: 2,
    pageSize: 25,
  });
});

test("shows all matches without navigation when they fit on one page", async () => {
  listDocumentPageMock.mockResolvedValue({ items: allRecipes.slice(0, 25), total: 25 });
  await renderPage();

  expect(listedRecipes()).toHaveLength(25);
  expect(screen.queryByRole("navigation", { name: "Recipe pages" })).not.toBeInTheDocument();
});

test("invalid pages start at page 1 and stale pages show the last page", async () => {
  listDocumentPageMock.mockImplementation(async (_ownerId, { page, pageSize }) => ({
    items: allRecipes.slice((page - 1) * pageSize, page * pageSize),
    total: allRecipes.length,
  }));

  await renderPage({ page: ["2", "3"] });
  expect(listedRecipes()[0]).toHaveTextContent("Recipe 1");
  expect(listDocumentPageMock).toHaveBeenLastCalledWith("owner-ada", {
    search: undefined,
    tags: [],
    page: 1,
    pageSize: 25,
  });

  cleanup();
  await renderPage({ page: "999" });
  expect(listedRecipes()).toHaveLength(3);
  expect(listedRecipes()[0]).toHaveTextContent("Recipe 51");
  expect(screen.getByText("Page 3 of 3 · 53 recipes")).toBeInTheDocument();
  expect(listDocumentPageMock).toHaveBeenLastCalledWith("owner-ada", {
    search: undefined,
    tags: [],
    page: 3,
    pageSize: 25,
  });
});

test("large valid pages never send an out-of-range database offset", async () => {
  listDocumentPageMock.mockImplementation(async (_ownerId, { page, pageSize }) => {
    expect((page - 1) * pageSize).toBeLessThanOrEqual(2_147_483_647);
    return {
      items: allRecipes.slice((page - 1) * pageSize, page * pageSize),
      total: allRecipes.length,
    };
  });

  await renderPage({ page: "85899346" });
  expect(listDocumentPageMock).toHaveBeenNthCalledWith(
    1,
    "owner-ada",
    expect.objectContaining({ page: 85_899_346, pageSize: 25 }),
  );
  expect(listDocumentPageMock).toHaveBeenNthCalledWith(
    2,
    "owner-ada",
    expect.objectContaining({ page: 3, pageSize: 25 }),
  );
  cleanup();
  listDocumentPageMock.mockClear();

  await renderPage({ page: "9007199254740991" });
  expect(listDocumentPageMock).toHaveBeenNthCalledWith(
    1,
    "owner-ada",
    expect.objectContaining({ page: 1, pageSize: 25 }),
  );
  expect(listDocumentPageMock).toHaveBeenNthCalledWith(
    2,
    "owner-ada",
    expect.objectContaining({ page: 3, pageSize: 25 }),
  );
  expect(listedRecipes()[0]).toHaveTextContent("Recipe 51");
});

test("keeps the empty and error states without page navigation", async () => {
  listDocumentPageMock.mockResolvedValue({ items: [], total: 0 });
  render(await RecipesPage({ searchParams: Promise.resolve({ q: "absent", page: "8" }) }));
  expect(await screen.findByRole("heading", { name: "No recipes found" })).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "Recipe pages" })).not.toBeInTheDocument();

  cleanup();
  listDocumentPageMock.mockRejectedValue(new Error("unavailable"));
  render(await RecipesPage({ searchParams: Promise.resolve({}) }));
  expect(await screen.findByText("Recipes could not be loaded")).toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "Recipe pages" })).not.toBeInTheDocument();
});
