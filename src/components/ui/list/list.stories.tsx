import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BookOpen } from "lucide-react";
import { expect, userEvent } from "storybook/test";

import { List, ListItem } from "./list";

const meta = {
  title: "UI/List",
  component: List,
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithIcons: Story = {
  render: () => (
    <List>
      <ListItem
        icon={BookOpen}
        title="Tomato soup"
        description="A family recipe"
        href="#tomato-soup"
      />
      <ListItem
        icon={BookOpen}
        title="Roast vegetables"
        description={
          <>
            A weeknight favorite · <a href="#quick-meals">Quick meals</a>
          </>
        }
        href="#roast-vegetables"
      />
    </List>
  ),
  play: async ({ canvas }) => {
    const recipeLink = canvas.getByRole("link", { name: "Tomato soup" });
    await userEvent.tab();
    await expect(recipeLink).toHaveFocus();
    await expect(canvas.getByRole("link", { name: "Quick meals" })).toHaveAttribute(
      "href",
      "#quick-meals",
    );
  },
};

export const WithoutIcons: Story = {
  render: () => (
    <List>
      <ListItem title="Tomato soup" description="A family recipe" />
      <ListItem title="Roast vegetables" description="A weeknight favorite" />
    </List>
  ),
};
