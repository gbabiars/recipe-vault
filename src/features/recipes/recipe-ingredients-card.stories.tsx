import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RecipeIngredientsCard } from "./recipe-detail-cards";

const meta = {
  title: "App/Recipes/RecipeIngredientsCard",
  component: RecipeIngredientsCard,
  args: {
    ingredients: [
      { displayOrder: 1, amount: "2 cups", ingredientName: "tomatoes", notes: "chopped" },
      { displayOrder: 2, amount: "1 tbsp", ingredientName: "olive oil" },
      { displayOrder: 3, amount: "4 leaves", ingredientName: "fresh basil" },
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
