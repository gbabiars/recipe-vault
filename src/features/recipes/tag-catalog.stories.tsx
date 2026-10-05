import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { TagCatalog } from "./tag-catalog";

const meta = {
  title: "App/Recipes/TagCatalog",
  component: TagCatalog,
  args: {
    tags: [
      {
        id: "00000000-0000-4000-8000-000000000001",
        name: "weeknight meals",
        usageCount: 3,
        description: "Easy dinners for busy evenings.",
      },
      {
        id: "00000000-0000-4000-8000-000000000002",
        name: "vegetarian",
        usageCount: 0,
      },
    ],
  },
} satisfies Meta<typeof TagCatalog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {};

export const Empty: Story = { args: { tags: [] } };

export const LoadError: Story = { args: { tags: [], error: true } };

export const Paginated: Story = {
  args: { previousHref: "/tags?before=previous", nextHref: "/tags?after=next" },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("navigation", { name: "Tag pages" })).toBeInTheDocument();
    await expect(canvas.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/tags?before=previous",
    );
    await expect(canvas.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/tags?after=next",
    );
  },
};
