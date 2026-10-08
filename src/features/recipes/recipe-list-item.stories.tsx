import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
import { List } from "@/components/ui/list";

import { RecipeListItem } from "./recipe-list-item";

const recipe: RecipeSummary = {
  id: "tomato-soup",
  ownerId: "story-owner",
  title: "Tomato soup",
  summary: "A simple soup with fresh basil.",
  totalTimeMinutes: 35,
  servings: 4,
  tags: ["weeknight", "soup", "vegetarian", "high-protein", "quick"],
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
};

const meta = {
  title: "App/Recipes/RecipeListItem",
  component: RecipeListItem,
  args: { recipe },
  decorators: [
    (Story) => (
      <List>
        <Story />
      </List>
    ),
  ],
} satisfies Meta<typeof RecipeListItem>;

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
      servings: undefined,
      tags: [],
    },
  },
};
