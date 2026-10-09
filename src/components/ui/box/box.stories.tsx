import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Box } from "./box";

const spacingOptions = [
  "0",
  "025",
  "050",
  "075",
  "100",
  "150",
  "200",
  "250",
  "300",
  "400",
  "500",
  "600",
  "800",
  "1000",
  "1200",
];

const meta = {
  title: "UI/Box",
  component: Box,
  args: {
    children: "Content inside a padded container",
  },
  argTypes: {
    padding: { control: "select", options: spacingOptions },
    paddingInline: { control: "select", options: spacingOptions },
    paddingBlock: { control: "select", options: spacingOptions },
    paddingInlineStart: { control: "select", options: spacingOptions },
    paddingInlineEnd: { control: "select", options: spacingOptions },
    paddingBlockStart: { control: "select", options: spacingOptions },
    paddingBlockEnd: { control: "select", options: spacingOptions },
  },
} satisfies Meta<typeof Box>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { padding: "200" },
};

export const Padded: Story = {
  args: {
    as: "section",
    paddingInline: "300",
    paddingBlock: "200",
    style: {
      backgroundColor: "var(--color-background-surface-subtle)",
      border: "1px dashed var(--color-border-default)",
      borderRadius: "var(--radius-200)",
    },
    children: <p>Content inside a padded section</p>,
  },
};
