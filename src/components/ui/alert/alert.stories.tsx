import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Alert } from "./alert";

const meta = {
  title: "UI/Alert",
  component: Alert,
  args: {
    title: "Recipe needs attention",
    description: "Check the ingredient amounts before sharing this recipe.",
  },
} satisfies Meta<typeof Alert>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Danger: Story = {
  args: {
    variant: "danger",
    title: "Could not save recipe",
    description: "Check your connection and try saving again.",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    title: "Check ingredients",
    description: (
      <>
        Review the <a href="https://example.com/recipes/1/edit">recipe details</a> before you
        continue.
      </>
    ),
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    title: "Recipe saved",
    description: "Your changes are ready to view.",
  },
};
