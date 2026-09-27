import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Avatar } from "./avatar";

const meta = {
  title: "UI/Avatar",
  component: Avatar,
  args: {
    name: "Ada Lovelace",
  },
  argTypes: {
    size: {
      control: "select",
      options: ["small", "medium", "large"],
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SizeScale: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <Avatar name="Ada Lovelace" size="small" />
      <Avatar name="Ada Lovelace" size="medium" />
      <Avatar name="Ada Lovelace" size="large" />
    </div>
  ),
};

export const BlankName: Story = {
  args: {
    name: "  ",
  },
};
