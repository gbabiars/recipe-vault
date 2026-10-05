import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { ToastProvider } from "@/components/ui/toast";
import { RecipePageActionsView } from "./recipe-page-actions";

const meta = {
  title: "Recipes/Recipe page actions",
  component: RecipePageActionsView,
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
  args: {
    recipeId: "recipe-1",
    recipeTitle: "Tomato soup",
    editHref: "/recipes/recipe-1/edit",
    deleteAction: fn(async () => ({ errors: {}, message: "Unable to delete this recipe." })),
    navigate: fn(),
  },
} satisfies Meta<typeof RecipePageActionsView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
