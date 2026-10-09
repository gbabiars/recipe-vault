import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { RecipesHeaderActions } from "./recipes-header-actions";

const meta = {
  title: "App/Recipes/RecipesHeaderActions",
  component: RecipesHeaderActions,
} satisfies Meta<typeof RecipesHeaderActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Add a recipe" });
    await expect(trigger).toHaveTextContent("Add a recipe");
    await userEvent.click(trigger);
    const menu = within(document.body);
    await expect(await menu.findByRole("menuitem", { name: "Create manually" })).toHaveAttribute(
      "href",
      "/recipes/new",
    );
    await expect(
      await menu.findByRole("menuitem", { name: "Import from website or PDF" }),
    ).toHaveAttribute("href", "/recipes/import");
  },
};
