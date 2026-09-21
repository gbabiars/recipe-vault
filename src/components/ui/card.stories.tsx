import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Link from "next/link";
import type * as React from "react";

import { Card, type CardPadding, type CardRender } from "./card";

type CardStoryArgs = {
  as?: "section";
  children?: React.ReactNode;
  label?: string;
  padding?: CardPadding;
  render?: CardRender;
};

const meta = {
  title: "UI/Card",
  component: Card as unknown as React.ComponentType<CardStoryArgs>,
  args: {
    children: "Recipe details",
  },
} satisfies Meta<CardStoryArgs>;

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

export const NativeAnchor: Story = {
  args: {
    children: "Tomato soup with basil and grilled cheese croutons",
    label: "View Tomato Soup",
    render: <a href="https://example.com/recipes/tomato-soup" />,
  },
};

export const NextLink: Story = {
  args: {
    children: "Tomato soup with basil and grilled cheese croutons",
    label: "View Tomato Soup",
    render: <Link href="/recipes/tomato-soup" />,
  },
};

export const ButtonAction: Story = {
  args: {
    children: "Open the recipe editor",
    label: "Edit Tomato Soup",
    render: <button type="button" />,
  },
};
