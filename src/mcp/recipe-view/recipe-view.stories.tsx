import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RecipeView } from "./recipe-view-component";

const fullRecipe = {
  title: "Sunday tomato soup",
  summary: "A simple soup with fresh basil and a little cream.",
  prepTimeMinutes: 15,
  cookTimeMinutes: 30,
  totalTimeMinutes: 45,
  servings: 4,
  tags: ["soup", "vegetarian", "weeknight"],
  ingredients: [
    { amount: "2 tbsp", ingredientName: "olive oil" },
    { amount: "1 large", ingredientName: "yellow onion", notes: "diced" },
    { amount: "800 g", ingredientName: "whole peeled tomatoes" },
    { amount: "250 ml", ingredientName: "vegetable stock" },
    { amount: "to taste", ingredientName: "salt and black pepper" },
  ],
  steps: [
    { instruction: "Soften the onion in olive oil over medium heat.", durationMinutes: 8 },
    { instruction: "Add tomatoes and stock, then simmer until tender.", durationMinutes: 20 },
    { instruction: "Blend until smooth and season before serving." },
  ],
  notes: "For a richer soup, stir in a splash of cream just before serving.",
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
      title: "Simple toast",
      tags: [],
      ingredients: [{ ingredientName: "bread" }],
      steps: [{ instruction: "Toast the bread." }],
    },
  },
};

export const Loading: Story = {
  args: {
    state: "loading",
  },
};

export const Error: Story = {
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
