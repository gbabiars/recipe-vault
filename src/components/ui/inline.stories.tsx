import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Card } from "./card";
import { Inline } from "./inline";

const meta = {
  title: "UI/Inline",
  component: Inline,
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
      options: [
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
      ],
    },
    rowGap: {
      control: "select",
      options: [
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
      ],
    },
    align: {
      control: "select",
      options: ["start", "center", "end", "stretch", "baseline"],
    },
    justify: {
      control: "select",
      options: ["start", "center", "end", "between", "around", "evenly"],
    },
  },
} satisfies Meta<typeof Inline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WrappedRows: Story = {
  args: { gap: "100", rowGap: "050", style: { maxWidth: 240 } },
};

export const SingleRow: Story = {
  args: { gap: "100", wrap: false },
};

export const BaselineAligned: Story = {
  args: {
    align: "baseline",
    gap: "100",
    children: (
      <>
        <span style={{ fontSize: 32 }}>Large text</span>
        <span>Regular text</span>
      </>
    ),
  },
};
