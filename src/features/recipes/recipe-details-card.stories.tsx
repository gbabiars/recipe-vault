import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { Recipe } from "@/lib/db/recipe-repository";

import { RecipeDetailsCard } from "./recipe-detail-cards";

const recipe: Recipe = {
  id: "tomato-soup",
  ownerId: "story-owner",
  title: "Tomato soup",
  summary: "A simple soup with fresh basil.",
  servings: 4,
  prepTimeMinutes: 10,
  cookTimeMinutes: 25,
  totalTimeMinutes: 35,
  sourceUrl: "https://example.com/recipes/tomato-soup",
  tags: ["weeknight", "soup"],
  dietaryFlags: ["vegetarian"],
  ingredients: [],
  steps: [],
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
};

const meta = {
  title: "Recipes/RecipeDetailsCard",
  component: RecipeDetailsCard,
  args: { recipe },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "40rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecipeDetailsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithDetails: Story = {};

export const Minimal: Story = {
  args: {
    recipe: {
      ...recipe,
      servings: undefined,
      prepTimeMinutes: undefined,
      cookTimeMinutes: undefined,
      totalTimeMinutes: undefined,
      sourceUrl: undefined,
      tags: [],
      dietaryFlags: [],
    },
  },
};
