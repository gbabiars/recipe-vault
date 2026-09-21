import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Card } from "./card";

const meta = {
  title: "UI/Card",
  component: Card,
  args: {
    children: "Recipe details",
  },
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Section: Story = {
  args: {
    as: "section",
    children: "A semantic section card",
  },
};
