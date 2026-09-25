import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RecipeIngredientsCard } from "./recipe-detail-cards";

const meta = {
  title: "Recipes/RecipeIngredientsCard",
  component: RecipeIngredientsCard,
  args: {
    ingredients: [
      { displayOrder: 1, quantity: 2, unit: "cups", ingredientName: "tomatoes", notes: "chopped" },
      { displayOrder: 2, quantity: 1, unit: "tbsp", ingredientName: "olive oil" },
      { displayOrder: 3, quantity: 4, unit: "leaves", ingredientName: "fresh basil" },
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
