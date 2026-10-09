import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card } from "@/components/ui/card";
import { Stack } from "@/components/ui/stack";
import type { RecipeSummary } from "@/lib/db/recipe-repository";

import { RecipeList } from "./recipe-list";

const recipes: RecipeSummary[] = [
  {
    id: "lemon-garlic-chicken",
    ownerId: "story-owner",
    title: "Lemon garlic chicken",
    totalTimeMinutes: 35,
    servings: 4,
    tags: ["Dinner", "High protein"],
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
  },
  {
    id: "green-goddess-salad",
    ownerId: "story-owner",
    title: "Green goddess salad",
    totalTimeMinutes: 15,
    servings: 2,
    tags: ["Vegetarian", "Lunch", "Quick"],
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
  },
  {
    id: "brown-butter-banana-bread",
    ownerId: "story-owner",
    title: "Brown butter banana bread",
    totalTimeMinutes: 70,
    servings: 8,
    tags: ["Dessert", "Baking"],
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
  },
];

const meta = {
  title: "App/Recipes/RecipeList",
  component: RecipeList,
  args: { recipes },
  render: (args) => (
    <Card padding="none">
      <Stack gap="200" paddingBlock="200" paddingInline="200">
        <RecipeList {...args} />
      </Stack>
    </Card>
  ),
} satisfies Meta<typeof RecipeList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithRecipes: Story = {};

export const Minimal: Story = {
  args: {
    recipes: [
      {
        ...recipes[0],
        id: "plain-rice",
        title: "Plain rice",
        totalTimeMinutes: undefined,
        servings: undefined,
        tags: [],
      },
    ],
  },
};
