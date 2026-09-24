import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { RecipeSummary } from "@/lib/db/recipe-repository";

import { RecipeListCard } from "./recipe-list-card";

const recipe: RecipeSummary = {
  id: "tomato-soup",
  ownerId: "story-owner",
  title: "Tomato soup",
  summary: "A simple soup with fresh basil.",
  totalTimeMinutes: 35,
  tags: ["weeknight", "soup"],
  dietaryFlags: ["vegetarian"],
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
};

const meta = {
  title: "Recipes/RecipeListCard",
  component: RecipeListCard,
  args: { recipe },
  decorators: [
    (Story) => (
      <ul style={{ listStyle: "none", margin: 0, maxWidth: "40rem", padding: 0 }}>
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof RecipeListCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithDetails: Story = {};

export const Minimal: Story = {
  args: {
    recipe: {
      ...recipe,
      id: "plain-rice",
      title: "Plain rice",
      summary: undefined,
      totalTimeMinutes: undefined,
      tags: [],
      dietaryFlags: [],
    },
  },
};
