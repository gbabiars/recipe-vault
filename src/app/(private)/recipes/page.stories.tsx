import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, mocked } from "storybook/test";
import { requireUser } from "@/lib/auth/require-user";
import { getRecipeService } from "@/lib/recipes";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
import RecipesPage from "./page";

const listRecipes = fn();
const recipes: RecipeSummary[] = Array.from({ length: 53 }, (_, index) => ({
  id: `recipe-${index + 1}`,
  title: ["Lemon garlic chicken", "Green goddess salad", "Brown butter banana bread"][index % 3],
  description: "A reliable favorite for the week.",
  time: { prepMinutes: 10, cookMinutes: 25, totalMinutes: 35 },
  yield: { amount: 4, unit: "servings" },
  tags: ["Dinner", "Quick", "Family favorite"],
  revision: 1,
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
}));

const originalFetch = globalThis.fetch;

const meta = {
  title: "App/Recipes/RecipesPage",
  component: RecipesPage,
  parameters: { react: { rsc: true }, nextjs: { appDirectory: true } },
  args: { searchParams: Promise.resolve({}) },
  render: (args) => <RecipesPage {...args} />,
  beforeEach: () => {
    listRecipes.mockReset();
    mocked(requireUser).mockResolvedValue({ id: "storybook-owner" });
    mocked(getRecipeService).mockResolvedValue({
      listRecipes,
    } as unknown as Awaited<ReturnType<typeof getRecipeService>>);
    globalThis.fetch = async () =>
      Response.json({ data: [{ name: "quick" }, { name: "vegetarian" }] });

    return () => {
      globalThis.fetch = originalFetch;
    };
  },
} satisfies Meta<typeof RecipesPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {
  beforeEach: () => {
    listRecipes.mockResolvedValue({ items: recipes.slice(0, 3), total: 3 });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "Your recipes" })).toBeVisible();
    await expect(await canvas.findByRole("list", { name: "Recipes" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Lemon garlic chicken" })).toHaveAttribute(
      "href",
      "/recipes/recipe-1",
    );
    await expect(canvas.getByRole("button", { name: "Add a recipe" })).toBeVisible();
    await expect(
      canvas.queryByRole("navigation", { name: "Recipe pages" }),
    ).not.toBeInTheDocument();
    await expect(listRecipes).toHaveBeenCalledWith("storybook-owner", {
      search: undefined,
      tags: [],
      page: 1,
      pageSize: 25,
    });
  },
};

export const MultiplePages: Story = {
  beforeEach: () => {
    listRecipes.mockImplementation(async (_ownerId, { page, pageSize }) => ({
      items: recipes.slice((page - 1) * pageSize, page * pageSize),
      total: recipes.length,
    }));
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("navigation", { name: "Recipe pages" })).toBeVisible();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(25);
    await expect(canvas.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/recipes?page=2",
    );
    await expect(canvas.queryByRole("link", { name: "Previous" })).not.toBeInTheDocument();
  },
};

export const FilteredPage: Story = {
  args: {
    searchParams: Promise.resolve({ q: "soup", tag: ["quick", "vegetarian"], page: "2" }),
  },
  beforeEach: () => {
    listRecipes.mockResolvedValue({ items: recipes.slice(25, 50), total: recipes.length });
  },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole("navigation", { name: "Recipe pages" })).toBeVisible();
    await expect(canvas.getByRole("searchbox", { name: "Search" })).toHaveValue("soup");
    await expect(new FormData(canvasElement.querySelector("form")!).getAll("tag")).toEqual([
      "quick",
      "vegetarian",
    ]);
    await expect(canvas.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/recipes?q=soup&tag=quick&tag=vegetarian",
    );
    await expect(canvas.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/recipes?q=soup&tag=quick&tag=vegetarian&page=3",
    );
    await expect(listRecipes).toHaveBeenCalledWith("storybook-owner", {
      search: "soup",
      tags: ["quick", "vegetarian"],
      page: 2,
      pageSize: 25,
    });
  },
};

export const Empty: Story = {
  args: { searchParams: Promise.resolve({ q: "no matches" }) },
  beforeEach: () => {
    listRecipes.mockResolvedValue({ items: [], total: 0 });
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "No recipes found" })).toBeVisible();
    await expect(canvas.getByText("Try a different search or filter.")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Create a recipe" })).toHaveAttribute(
      "href",
      "/recipes/new",
    );
    await expect(
      canvas.queryByRole("navigation", { name: "Recipe pages" }),
    ).not.toBeInTheDocument();
  },
};

export const Error: Story = {
  beforeEach: () => {
    listRecipes.mockRejectedValue(new globalThis.Error("Recipe collection unavailable"));
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent("Recipes could not be loaded");
    await expect(canvas.getByText("Refresh the page to try again.")).toBeVisible();
    await expect(
      canvas.queryByRole("navigation", { name: "Recipe pages" }),
    ).not.toBeInTheDocument();
  },
};

export const Loading: Story = {
  beforeEach: () => {
    listRecipes.mockImplementation(() => new Promise(() => {}));
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status", { name: "Loading recipes" })).toBeVisible();
  },
};
