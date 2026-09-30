import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useGateValue } from "@statsig/react-bindings";
import { expect, mocked, userEvent, within } from "storybook/test";
import { RecipesHeaderActions } from "./recipes-header-actions";

const meta = {
  title: "Recipes/RecipesHeaderActions",
  component: RecipesHeaderActions,
  beforeEach: () => {
    mocked(useGateValue).mockReturnValue(true);
  },
} satisfies Meta<typeof RecipesHeaderActions>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WebsiteImportEnabled: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add a recipe" }));
    const menu = within(document.body);
    await expect(await menu.findByRole("menuitem", { name: "Create manually" })).toHaveAttribute(
      "href",
      "/recipes/new",
    );
    await expect(
      await menu.findByRole("menuitem", { name: "Import from a website" }),
    ).toHaveAttribute("href", "/recipes/import");
  },
};

export const WebsiteImportDisabled: Story = {
  beforeEach: () => {
    mocked(useGateValue).mockReturnValue(false);
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Add a recipe" }));
    const menu = within(document.body);
    await expect(await menu.findByRole("menuitem", { name: "Create manually" })).toHaveAttribute(
      "href",
      "/recipes/new",
    );
    await expect(menu.queryByRole("menuitem", { name: "Import from a website" })).toBeNull();
  },
};
