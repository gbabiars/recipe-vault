import type { Meta, StoryObj } from "@storybook/nextjs-vite";

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
