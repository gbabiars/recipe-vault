import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { RecipeNotesCard } from "./recipe-detail-cards";

const meta = {
  title: "Recipes/RecipeNotesCard",
  component: RecipeNotesCard,
  args: {
    notes: "Use ripe tomatoes for the best flavor.\nAdd fresh basil just before serving.",
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "40rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecipeNotesCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
