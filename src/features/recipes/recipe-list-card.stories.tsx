import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { RecipeSummary } from "@/lib/db/recipe-repository";
import { Stack } from "@/components/ui/stack";

import { RecipeListCard } from "./recipe-list-card";

const recipe: RecipeSummary = {
  id: "tomato-soup",
  ownerId: "story-owner",
  title: "Tomato soup",
  summary: "A simple soup with fresh basil.",
  totalTimeMinutes: 35,
  tags: ["weeknight", "soup"],
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-15T12:00:00.000Z",
};

const meta = {
  title: "Recipes/RecipeListCard",
  component: RecipeListCard,
  args: { recipe },
  decorators: [
    (Story) => (
      <Stack as="ul" gap="200" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        <Story />
      </Stack>
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
    },
  },
};
