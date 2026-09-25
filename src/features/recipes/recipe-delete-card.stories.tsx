import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { RecipeFormState } from "./recipe-form-state";
import { RecipeDeleteCard } from "./recipe-detail-cards";

const meta = {
  title: "Recipes/RecipeDeleteCard",
  component: RecipeDeleteCard,
  args: {
    recipeId: "story-recipe",
    deleteAction: async (_state, formData): Promise<RecipeFormState> => {
      if (formData.get("confirmDelete") === "delete") return { errors: {} };
      return { errors: { confirmDelete: "Confirm deletion before continuing." } };
    },
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "40rem" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecipeDeleteCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
