import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent } from "storybook/test";

import { Chip } from "./chip";

const meta = {
  title: "UI/Chip",
  component: Chip,
  args: {
    children: "main course",
  },
} satisfies Meta<typeof Chip>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongLabel: Story = {
  args: {
    children: "vegetarian and dairy-free",
  },
};

export const Removable: Story = {
  args: {
    children: "vegetarian",
    onRemove: fn(),
    removeLabel: "Remove vegetarian",
  },
  play: async ({ args, canvas }) => {
    const removeButton = canvas.getByRole("button", { name: "Remove vegetarian" });

    await expect(removeButton.querySelector("svg")).toHaveAttribute("aria-hidden", "true");

    await userEvent.click(removeButton);
    await expect(args.onRemove).toHaveBeenCalledTimes(1);
    await expect(canvas.getByText("vegetarian")).toBeVisible();

    removeButton.focus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onRemove).toHaveBeenCalledTimes(2);
    await expect(canvas.getByText("vegetarian")).toBeVisible();
  },
};
