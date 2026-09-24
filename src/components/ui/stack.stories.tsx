import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Card } from "./card";
import { Stack } from "./stack";

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
  title: "UI/Stack",
  component: Stack,
  args: {
    children: (
      <>
        <Card padding="small">First item</Card>
        <Card padding="small">Second item</Card>
        <Card padding="small">Third item</Card>
      </>
    ),
  },
  argTypes: {
    gap: {
      control: "select",
      options: spacingOptions,
    },
    paddingInline: {
      control: "select",
      options: spacingOptions,
    },
    paddingBlock: {
      control: "select",
      options: spacingOptions,
    },
    paddingInlineStart: {
      control: "select",
      options: spacingOptions,
    },
    paddingInlineEnd: {
      control: "select",
      options: spacingOptions,
    },
    paddingBlockStart: {
      control: "select",
      options: spacingOptions,
    },
    paddingBlockEnd: {
      control: "select",
      options: spacingOptions,
    },
    align: {
      control: "select",
      options: ["start", "center", "end", "stretch"],
    },
    justify: {
      control: "select",
      options: ["start", "center", "end", "between", "around", "evenly"],
    },
  },
} satisfies Meta<typeof Stack>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithGap: Story = {
  args: { gap: "200" },
};

export const Padded: Story = {
  args: {
    gap: "100",
    paddingInline: "300",
    paddingBlock: "200",
    style: {
      backgroundColor: "var(--color-background-surface-subtle)",
      border: "1px dashed var(--color-border-default)",
      borderRadius: "var(--radius-200)",
    },
  },
};

export const CenterAligned: Story = {
  args: { align: "center", gap: "100" },
};

export const SpaceBetween: Story = {
  args: { justify: "between", style: { minHeight: 300 } },
};
