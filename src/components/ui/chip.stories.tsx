import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Chip } from "./chip";

const meta = {
  title: "UI/Chip",
  component: Chip,
  args: {
    children: "main course",
  },
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongLabel: Story = {
  args: {
    children: "vegetarian and dairy-free",
  },
};
