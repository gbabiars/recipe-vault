import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RecipeView } from "./recipe-view-component";

const fullRecipe = {
  id: "00000000-0000-4000-8000-000000000301",
  title: "Sunday tomato soup",
  description: "A simple soup with fresh basil and a little cream.",
  yield: { amount: 4, unit: "servings" },
  time: { prepMinutes: 15, cookMinutes: 30, totalMinutes: 45 },
  tags: ["soup", "vegetarian", "weeknight"],
  ingredients: [
    { amount: "2 tbsp", name: "olive oil" },
    { amount: "1 large", name: "yellow onion", note: "diced" },
    { amount: "800 g", name: "whole peeled tomatoes" },
    { amount: "250 ml", name: "vegetable stock" },
    { amount: "to taste", name: "salt and black pepper" },
  ],
  equipment: [{ name: "Large pot" }, { name: "Immersion blender", note: "or countertop blender" }],
  instructions: [
    "Soften the onion in olive oil over medium heat. (Duration: 8 minutes)",
    "Add tomatoes and stock, then simmer until tender. (Duration: 20 minutes)",
    "Blend until smooth and season before serving.",
  ],
  notes: ["For a richer soup, stir in a splash of cream just before serving."],
  sourceUrl: "https://example.com/recipes/sunday-tomato-soup",
};

const meta = {
  title: "MCP/Recipe View",
  component: RecipeView,
} satisfies Meta<typeof RecipeView>;

export default meta;

type Story = StoryObj<typeof meta>;

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

export const FullRecipe: Story = {
  args: {
    state: "recipe",
    recipe: fullRecipe,
  },
  beforeEach: () => setDocumentTheme("light"),
};

export const MinimalRecipe: Story = {
  args: {
    state: "recipe",
    recipe: {
      id: "00000000-0000-4000-8000-000000000302",
      title: "Simple toast",
      description: "",
      time: {},
      tags: [],
      ingredients: [{ name: "bread" }],
      equipment: [],
      instructions: ["Toast the bread."],
      notes: [],
    },
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

export const FullRecipeDarkTheme: Story = {
  args: {
    state: "recipe",
    recipe: fullRecipe,
  },
  beforeEach: () => setDocumentTheme("dark"),
};
