import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "@/components/ui/button";
import { CheckboxInput } from "@/components/ui/checkbox";
import { Inline } from "@/components/ui/inline";

import { RecipeDeleteCard } from "./recipe-detail-cards";

const meta = {
  title: "Recipes/RecipeDeleteCard",
  component: RecipeDeleteCard,
  args: {
    children: (
      <form className="delete-form" onSubmit={(event) => event.preventDefault()}>
        <CheckboxInput
          name="confirmDelete"
          value="delete"
          label="I understand this permanently deletes the recipe."
        />
        <Inline>
          <Button type="submit" variant="danger">
            Delete recipe
          </Button>
        </Inline>
      </form>
    ),
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
