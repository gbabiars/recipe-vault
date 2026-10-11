import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { RecipeDocumentContent } from "@/lib/validation/recipe-document";

import { RecipeDetailsCard } from "./recipe-detail-cards";

const recipe: RecipeDocumentContent = {
  title: "Tomato soup",
  description: "A simple soup with fresh basil.",
  yield: { amount: 4, unit: "servings" },
  time: { prepMinutes: 10, cookMinutes: 25, totalMinutes: 35 },
  sourceUrl: "https://example.com/recipes/tomato-soup",
  tags: ["weeknight", "soup"],
  ingredients: [],
  equipment: [],
  instructions: ["Simmer the soup."],
  notes: [],
};

const meta = {
  title: "App/Recipes/Detail/RecipeDetailsCard",
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
      yield: undefined,
      time: {},
      sourceUrl: undefined,
      tags: [],
    },
  },
};
