import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
import { List } from "@/components/ui/list";

import { RecipeListItem } from "./recipe-list-item";

const documentSummary: RecipeSummary = {
  id: "tomato-soup",
  title: "Tomato soup",
  description: "A simple soup with fresh basil.",
  time: { prepMinutes: 15, cookMinutes: 20, totalMinutes: 35 },
  yield: { amount: 4, unit: "servings" },
  tags: ["weeknight", "soup", "vegetarian", "high-protein", "quick"],
  revision: 1,
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
};

const meta = {
  title: "App/Recipes/RecipeListItem",
  component: RecipeListItem,
  args: { documentSummary },
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
    documentSummary: {
      ...documentSummary,
      id: "plain-rice",
      title: "Plain rice",
      time: {},
      yield: undefined,
      tags: [],
    },
  },
};
