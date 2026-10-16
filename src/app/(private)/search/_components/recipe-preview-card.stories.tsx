import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { RecipePreviewCard } from "./recipe-preview-card";

const meta = {
  title: "App/Search/RecipePreviewCard",
  component: RecipePreviewCard,
  args: {
    recipe: {
      id: "11111111-1111-4111-8111-111111111111",
      title: "Tomato soup",
      description: "A cozy tomato soup with fresh basil and a little cream.",
      time: { prepMinutes: 15, cookMinutes: 20, totalMinutes: 35 },
      tags: ["weeknight", "vegetarian"],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: "min(100%, 24rem)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecipePreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDetails: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Tomato soup" })).toBeVisible();
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
    await expect(canvas.getByText("weeknight").parentElement).not.toContainElement(
      canvas.getByText("35 min"),
    );
  },
};

export const Minimal: Story = {
  args: {
    recipe: {
      id: "22222222-2222-4222-8222-222222222222",
      title: "Plain rice",
      description: "Steamed white rice for simple weeknight meals.",
      time: {},
      tags: [],
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "View Plain rice" })).toHaveAttribute(
      "href",
      "/recipes/22222222-2222-4222-8222-222222222222",
    );
    await expect(canvas.getByText("Steamed white rice for simple weeknight meals.")).toBeVisible();
    await expect(canvas.queryByText(/Prep:|Cook:|Total time:|Yield:/)).not.toBeInTheDocument();
  },
};

export const ManyTags: Story = {
  args: {
    recipe: {
      id: "33333333-3333-4333-8333-333333333333",
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
    await expect(canvas.getByText("45 min")).toBeVisible();
  },
};

export const LongContent: Story = {
  args: {
    recipe: {
      id: "44444444-4444-4444-8444-444444444444",
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
    recipe: {
      id: "55555555-5555-4555-8555-555555555555",
      title: "Grandma's pickled onions",
      description: "Tangy onions to keep in the fridge for sandwiches and salads.",
      time: {},
      tags: ["condiment", "make ahead"],
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("condiment")).toBeVisible();
    await expect(canvas.queryByText(/Prep:|Cook:|Total time:/)).not.toBeInTheDocument();
  },
};
