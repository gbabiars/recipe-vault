import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Stack } from "./stack";
import { Text, type TextAppearance } from "./text";

const appearances: TextAppearance[] = [
  "primary",
  "secondary",
  "disabled",
  "success",
  "warning",
  "error",
];

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
    appearance: {
      control: "select",
      options: appearances,
    },
  },
} satisfies Meta<typeof Text>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Appearances: Story = {
  render: () => (
    <Stack gap="100">
      <Text appearance="primary">primary</Text>
      <Text appearance="secondary">secondary</Text>
      <Text appearance="disabled" aria-disabled="true">
        disabled
      </Text>
      <Text appearance="success">success</Text>
      <Text appearance="warning">warning</Text>
      <Text appearance="error">error</Text>
    </Stack>
  ),
};

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
