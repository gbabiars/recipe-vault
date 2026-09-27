import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import type { Recipe } from "@/lib/db/recipe-repository";
import { RecipeForm } from "./recipe-form";

const recipe: Recipe = {
  id: "recipe-1",
  ownerId: "owner-1",
  title: "Tomato soup",
  summary: "A simple tomato soup.",
  servings: 4,
  tags: ["soup", "weeknight"],
  dietaryFlags: ["vegetarian"],
  ingredients: [{ displayOrder: 1, quantity: 1, unit: "can", ingredientName: "Tomatoes" }],
  steps: [{ stepOrder: 1, instruction: "Simmer the tomatoes." }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const meta = {
  title: "Recipes/RecipeForm",
  component: RecipeForm,
} satisfies Meta<typeof RecipeForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {
  play: async ({ canvas }) => {
    const tags = canvas.getByRole("combobox", { name: "Tags" });
    await userEvent.type(tags, "quick");
    await userEvent.click(
      await within(document.body).findByRole("option", { name: /Create “quick”/ }),
    );

    await expect(canvas.getByRole("button", { name: "Remove quick" })).toBeVisible();
    expect(new FormData(tags.closest("form")!).getAll("tags")).toEqual(["quick"]);
  },
};

export const Edit: Story = {
  args: { recipe },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "Remove soup" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Remove weeknight" })).toBeVisible();
  },
};
