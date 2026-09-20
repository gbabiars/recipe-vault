import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Text } from "./text";

const meta = {
  title: "UI/Text",
  component: Text,
  args: {
    children: "Recipe description",
  },
  argTypes: {
    as: {
      control: "select",
      options: ["span", "p", "strong"],
    },
    size: {
      control: "select",
      options: ["small", "medium", "large"],
    },
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: {
    size: "small",
  },
};

export const Large: Story = {
  args: {
    size: "large",
  },
};

export const Paragraph: Story = {
  args: {
    as: "p",
    children: "This text is rendered as a paragraph.",
  },
};

export const WithNativePropsAndClassName: Story = {
  args: {
    className: "recipe-copy",
    id: "recipe-description",
  },
};
