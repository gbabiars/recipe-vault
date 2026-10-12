import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { TagsPageContent } from "./page-content";

const meta = {
  title: "App/Tags/Page",
  component: TagsPageContent,
  args: {
    tags: [
      { name: "weeknight meals", usageCount: 3 },
      { name: "vegetarian", usageCount: 1 },
    ],
  },
} satisfies Meta<typeof TagsPageContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {};

export const Empty: Story = { args: { tags: [] } };

export const LoadError: Story = { args: { tags: [], error: true } };

export const Paginated: Story = {
  args: { previousHref: "/tags?before=previous", nextHref: "/tags?after=next" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("navigation", { name: "Tag pages" })).toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/tags?after=next",
    );
    await expect(canvas.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/tags?before=previous",
    );
  },
};
