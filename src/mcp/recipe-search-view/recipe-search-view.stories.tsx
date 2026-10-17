import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { RecipeSearchView } from "./recipe-search-view-component";
import { getRecipeSearchViewState } from "./recipe-search-view-state";

const meta = {
  title: "MCP/Recipe Search View",
  component: RecipeSearchView,
} satisfies Meta<typeof RecipeSearchView>;

export default meta;

type Story = StoryObj<typeof meta>;

const tomatoSoup = {
  id: "00000000-0000-4000-8000-000000000101",
  title: "Sunday tomato soup",
  description: "A simple soup with fresh basil and a little cream.",
  time: { prepMinutes: 15, cookMinutes: 30, totalMinutes: 45 },
  yield: { amount: 4, unit: "servings" },
  tags: ["soup", "vegetarian", "weeknight"],
  revision: 2,
};

const lentilCurry = {
  id: "00000000-0000-4000-8000-000000000103",
  title: "Red lentil curry",
  description: "A cozy weeknight curry with coconut milk and warming spices.",
  time: { prepMinutes: 10, cookMinutes: 25, totalMinutes: 35 },
  yield: { amount: 4, unit: "servings" },
  tags: ["dinner", "vegetarian"],
  revision: 1,
};

const chickenTacos = {
  id: "00000000-0000-4000-8000-000000000104",
  title: "Japanese chicken tacos",
  description: "Quick tacos with seasoned chicken, miso, and lime.",
  time: { prepMinutes: 10, cookMinutes: 15, totalMinutes: 25 },
  yield: { amount: 4, unit: "servings" },
  tags: ["weeknight", "dinner"],
  revision: 3,
};

function setDocumentTheme(theme: "light" | "dark") {
  const root = document.documentElement;
  const previousTheme = root.getAttribute("data-theme");
  root.setAttribute("data-theme", theme);

  return () => {
    if (previousTheme) {
      root.setAttribute("data-theme", previousTheme);
    } else {
      root.removeAttribute("data-theme");
    }
  };
}

export const Populated: Story = {
  args: {
    state: "recipes",
    recipes: [tomatoSoup],
  },
  beforeEach: () => setDocumentTheme("light"),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Sunday tomato soup" })).toBeVisible();
    await expect(canvas.getByText("45 min")).toBeVisible();
    await expect(canvas.getByText("soup")).toBeVisible();
    await expect(canvas.getByText("vegetarian")).toBeVisible();
    await expect(canvas.getByText("+1")).toBeVisible();
    await expect(canvas.queryByText(/Prep:|Cook:|Yield:/)).not.toBeInTheDocument();
    await expect(canvas.queryByRole("link")).not.toBeInTheDocument();
  },
};

export const MultipleResults: Story = {
  args: {
    state: "recipes",
    recipes: [tomatoSoup, lentilCurry, chickenTacos],
  },
  beforeEach: () => setDocumentTheme("light"),
  play: async ({ canvas }) => {
    const results = canvas.getByRole("list", { name: "Recipe search results" });

    await expect(results.querySelectorAll(":scope > li")).toHaveLength(3);
    await expect(canvas.getByRole("heading", { name: "Sunday tomato soup" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Red lentil curry" })).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Japanese chicken tacos" })).toBeVisible();
    await expect(canvas.queryByRole("link")).not.toBeInTheDocument();
  },
};

export const Minimal: Story = {
  args: {
    state: "recipes",
    recipes: [
      {
        id: "00000000-0000-4000-8000-000000000102",
        title: "Plain rice",
        description: "",
        time: {},
        tags: [],
        revision: 1,
      },
    ],
  },
};

export const Empty: Story = {
  args: {
    state: "empty",
  },
};

export const Loading: Story = {
  args: {
    state: "loading",
  },
};

export const Error/* NOSONAR: intentional Storybook error-state story name. */ : Story = {
  args: {
    state: "error",
  },
};

export const MalformedPayload: Story = {
  args: {
    state: "error",
  },
  render: () => (
    <RecipeSearchView
      {...getRecipeSearchViewState({
        recipes: [
          {
            id: "invalid-id",
            title: "Unexpected owner data",
            tags: [],
            ownerId: "private-owner",
          },
        ],
      })}
    />
  ),
};

export const PopulatedDarkTheme: Story = {
  args: {
    state: "recipes",
    recipes: [tomatoSoup],
  },
  beforeEach: () => setDocumentTheme("dark"),
};
