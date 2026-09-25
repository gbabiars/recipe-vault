import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Card } from "../card";
import { Grid, GridItem } from "./grid";

const meta = {
  title: "UI/Grid",
  component: Grid,
  args: {
    gap: "200",
  },
} satisfies Meta<typeof Grid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CardGallery: Story = {
  args: {
    columns: { minWidth: 240, max: 4 },
    children: (
      <>
        <Card>Tomato soup</Card>
        <Card>Vegetable curry</Card>
        <Card>Apple pie</Card>
        <Card>Rice bowl</Card>
      </>
    ),
  },
};

export const StretchRemainingCards: Story = {
  args: {
    columns: { minWidth: 240, max: 4, repeat: "fit" },
    children: (
      <>
        <Card>Tomato soup</Card>
        <Card>Vegetable curry</Card>
      </>
    ),
  },
};

export const ResponsiveSpans: Story = {
  args: {
    columns: 12,
    children: (
      <>
        <GridItem span={{ base: "full", sm: 6, md: 4 }}>
          <Card>Summary</Card>
        </GridItem>
        <GridItem span={{ base: "full", sm: 6, md: 8 }}>
          <Card>Details</Card>
        </GridItem>
      </>
    ),
  },
};
