import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import { RecipePreviewCard } from "./recipe-preview-card";

const meta = {
  title: "Shared/Recipes/RecipePreviewCard",
  component: RecipePreviewCard,
  args: {
    href: "/recipes/11111111-1111-4111-8111-111111111111",
    recipe: {
      title: "Tomato soup",
      description: "A cozy tomato soup with fresh basil and a little cream.",
      time: { totalMinutes: 35 },
      tags: ["weeknight", "vegetarian"],
    },
  },
} satisfies Meta<typeof RecipePreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDetails: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Tomato soup" })).toBeVisible();
    await expect(canvas.getByRole("article")).toHaveStyle({ maxWidth: "384px" });
    await expect(canvas.getByRole("link", { name: "View Tomato soup" })).toHaveAttribute(
      "href",
      "/recipes/11111111-1111-4111-8111-111111111111",
    );
    await expect(canvas.getByText("35 min")).toBeVisible();
    await expect(canvas.queryByText(/Prep:|Cook:|Total time:|Yield:/)).not.toBeInTheDocument();
    await expect(canvas.getByText("35 min").parentElement?.querySelector("svg")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  },
};

export const DisplayOnly: Story = {
  args: { href: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Tomato soup" })).toBeVisible();
    await expect(canvas.queryByRole("link")).not.toBeInTheDocument();
    await expect(canvas.getByText("35 min")).toBeVisible();
  },
};

export const Minimal: Story = {
  args: {
    href: undefined,
    recipe: {
      title: "Plain rice",
      description: "Steamed white rice for simple weeknight meals.",
      time: {},
      tags: [],
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link")).not.toBeInTheDocument();
    await expect(canvas.getByText("Steamed white rice for simple weeknight meals.")).toBeVisible();
    await expect(canvas.queryByText(/Prep:|Cook:|Total time:|Yield:/)).not.toBeInTheDocument();
  },
};

export const ManyTags: Story = {
  args: {
    href: undefined,
    recipe: {
      title: "Chickpea and roasted vegetable bowls",
      description: "A flexible make-ahead lunch with lemon tahini dressing.",
      time: { totalMinutes: 45 },
      tags: [
        "vegetarian",
        "lunch",
        "meal prep",
        "high protein",
        "dairy free",
        "weeknight",
        "make ahead",
        "budget friendly",
      ],
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("vegetarian")).toBeVisible();
    await expect(canvas.getByText("lunch")).toBeVisible();
    await expect(canvas.getByText("+6")).toBeVisible();
    await expect(canvas.queryByText("budget friendly")).not.toBeInTheDocument();
    await expect(canvas.queryByRole("link")).not.toBeInTheDocument();
    await expect(canvas.getByText("45 min")).toBeVisible();
  },
};

export const LongContent: Story = {
  args: {
    href: undefined,
    recipe: {
      title: "Slow-roasted tomato and caramelized onion pasta with basil",
      description:
        "Roast tomatoes until they turn sweet and jammy, then toss them with soft caramelized onions, fresh basil, and pasta water for a rich sauce that needs very little hands-on work.",
      time: { totalMinutes: 90 },
      tags: ["dinner", "vegetarian"],
    },
  },
};

export const TagsWithoutTime: Story = {
  args: {
    href: undefined,
    recipe: {
      title: "Grandma's pickled onions",
      description: "Tangy onions to keep in the fridge for sandwiches and salads.",
      time: {},
      tags: ["condiment", "make ahead"],
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("condiment")).toBeVisible();
    await expect(canvas.queryByText(/Prep:|Cook:|Total time:/)).not.toBeInTheDocument();
    await expect(canvas.queryByRole("link")).not.toBeInTheDocument();
  },
};
