import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent } from "storybook/test";
import SearchPage from "./page";

const meta = {
  title: "App/Search/SearchPage",
  component: SearchPage,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof SearchPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Initial: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "What sounds good tonight?" })).toBeVisible();
    const input = canvas.getByRole("textbox", { name: "Search your recipes" });
    await userEvent.type(input, "I want chicken");
    await userEvent.click(canvas.getByRole("button", { name: "Search" }));
    await expect(input).toHaveValue("I want chicken");
  },
};
