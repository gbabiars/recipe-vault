import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, waitFor } from "storybook/test";

import { Avatar } from "./avatar";
import { avatarBrokenImageFixtureUrl, avatarImageFixtureUrl } from "./avatar-image-fixture";

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

export const WithImage: Story = {
  args: {
    imageUrl: avatarImageFixtureUrl,
  },
};

export const ImageFallback: Story = {
  args: {
    imageUrl: avatarBrokenImageFixtureUrl,
  },
  play: async ({ canvas }) => {
    const avatar = canvas.getByRole("img", { name: "Ada Lovelace" });
    const image = avatar.querySelector("img");

    await waitFor(() => expect(image).toHaveAttribute("data-error"));
    await expect(avatar).toHaveTextContent("AL");
  },
};

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
