import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { RecipePagination } from "./recipe-pagination";

const meta = {
  title: "App/Recipes/RecipePagination",
  component: RecipePagination,
  args: {
    page: 2,
    pageCount: 4,
    total: 87,
    previousHref: "/recipes?q=soup&page=1",
    nextHref: "/recipes?q=soup&page=3",
  },
} satisfies Meta<typeof RecipePagination>;

export default meta;

type Story = StoryObj<typeof meta>;

export const MiddlePage: Story = {
  play: async ({ canvas }) => {
    const navigation = canvas.getByRole("navigation", { name: "Recipe pages" });
    await expect(navigation).toHaveTextContent("Page 2 of 4 · 87 recipes");
    await expect(canvas.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/recipes?q=soup&page=1",
    );
    await expect(canvas.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/recipes?q=soup&page=3",
    );
  },
};

export const FirstPage: Story = {
  args: { page: 1, previousHref: undefined, nextHref: "/recipes?page=2" },
};

export const LastPage: Story = {
  args: { page: 4, previousHref: "/recipes?page=3", nextHref: undefined },
};

export const SinglePage: Story = {
  args: { page: 1, pageCount: 1, total: 13, previousHref: undefined, nextHref: undefined },
};
