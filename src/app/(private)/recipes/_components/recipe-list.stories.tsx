import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card } from "@/components/ui/card";
import { Stack } from "@/components/ui/stack";
import type { RecipeDocumentListSummary } from "@/lib/db/recipe-repository";

import { RecipeList, RecipeListSkeleton } from "./recipe-list";

const documentSummaries: RecipeDocumentListSummary[] = [
  {
    id: "lemon-garlic-chicken",
    title: "Lemon garlic chicken",
    description: "A bright weeknight chicken dinner.",
    time: { prepMinutes: 10, cookMinutes: 25, totalMinutes: 35 },
    yield: { amount: 4, unit: "servings" },
    tags: ["Dinner", "High protein"],
    revision: 1,
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
  },
  {
    id: "green-goddess-salad",
    title: "Green goddess salad",
    description: "A fresh herb salad.",
    time: { totalMinutes: 15 },
    yield: { amount: 2, unit: "servings" },
    tags: ["Vegetarian", "Lunch", "Quick"],
    revision: 2,
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
  },
  {
    id: "brown-butter-banana-bread",
    title: "Brown butter banana bread",
    description: "Tender banana bread with nutty brown butter.",
    time: { totalMinutes: 70 },
    yield: { amount: 8, unit: "slices" },
    tags: ["Dessert", "Baking"],
    revision: 1,
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
  },
];

const meta = {
  title: "App/Recipes/RecipeList",
  component: RecipeList,
  args: { documentSummaries },
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
    documentSummaries: [
      {
        ...documentSummaries[0],
        id: "plain-rice",
        title: "Plain rice",
        time: {},
        yield: undefined,
        tags: [],
      },
    ],
  },
};

export const Loading: Story = {
  render: () => (
    <Card padding="none">
      <Stack gap="200" paddingBlock="200" paddingInline="200">
        <RecipeListSkeleton />
      </Stack>
    </Card>
  ),
};
