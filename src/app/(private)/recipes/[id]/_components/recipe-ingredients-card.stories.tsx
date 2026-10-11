import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RecipeIngredientsCard } from "./recipe-detail-cards";

const meta = {
  title: "App/Recipes/Detail/RecipeIngredientsCard",
  component: RecipeIngredientsCard,
  args: {
    ingredients: [
      { amount: "2 cups", name: "tomatoes", note: "chopped" },
      { amount: "1 tbsp", name: "olive oil" },
      { amount: "4 leaves", name: "fresh basil" },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "40rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecipeIngredientsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
