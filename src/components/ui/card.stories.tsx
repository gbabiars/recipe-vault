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

export const Small: Story = {
  args: {
    padding: "small",
  },
};

export const Medium: Story = {
  args: {
    padding: "medium",
  },
};

export const Large: Story = {
  args: {
    padding: "large",
  },
};

export const None: Story = {
  args: {
    padding: "none",
  },
};

export const Section: Story = {
  args: {
    as: "section",
    children: "A semantic section card",
  },
};
