import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RecipeMethodCard } from "./recipe-detail-cards";

const meta = {
  title: "Recipes/RecipeMethodCard",
  component: RecipeMethodCard,
  args: {
    steps: [
      { stepOrder: 1, instruction: "Warm the olive oil in a large pot.", durationMinutes: 2 },
      { stepOrder: 2, instruction: "Add tomatoes and simmer until soft.", durationMinutes: 20 },
      { stepOrder: 3, instruction: "Stir in fresh basil and serve." },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "40rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecipeMethodCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
