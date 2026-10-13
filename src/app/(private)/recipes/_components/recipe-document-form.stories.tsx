import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import type { RecipeContent } from "@/lib/validation/recipe-document";
import { RecipeDocumentForm } from "./recipe-document-form";

const content: RecipeContent = {
  title: "Tomato soup",
  description: "A simple tomato soup.",
  yield: { amount: 4, unit: "servings" },
  time: { prepMinutes: 10, cookMinutes: 25 },
  ingredients: [{ name: "Tomatoes", amount: "1 can", note: "Diced" }],
  equipment: [{ name: "Saucepan" }],
  instructions: ["Simmer the tomatoes."],
  notes: ["Serve warm."],
  tags: ["soup", "weeknight"],
};

const meta = {
  title: "App/Recipes/RecipeDocumentForm",
  component: RecipeDocumentForm,
  args: { saveRecipe: async () => ({ status: "saved" as const }) },
} satisfies Meta<typeof RecipeDocumentForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("group", { name: "Ingredient 1" })).toBeVisible();
    await expect(canvas.getByLabelText(/^Title/)).toBeRequired();
    await expect(canvas.getByLabelText("Yield amount")).not.toBeRequired();
    await expect(canvas.getByLabelText("Source URL")).not.toBeRequired();
    await userEvent.type(canvas.getByLabelText("Yield amount"), "4");
    await expect(canvas.getByLabelText(/^Yield unit/)).toBeRequired();
    await userEvent.click(canvas.getByRole("button", { name: "Add ingredient" }));
    await expect(canvas.getByRole("group", { name: "Ingredient 2" })).toBeVisible();
    await userEvent.type(canvas.getByRole("combobox", { name: "Tags" }), "condiments");
    await userEvent.click(
      await within(document.body).findByRole("option", { name: /Create “condiments”/ }),
    );
    await expect(canvas.getByRole("button", { name: "Remove condiments" })).toBeVisible();
  },
};

export const Edit: Story = {
  args: { recipe: { id: "recipe-1", revision: 3, content } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("group", { name: "Ingredient 1" })).toBeVisible();
    await expect(canvas.getByLabelText(/^Yield amount/)).toBeRequired();
    await expect(canvas.getByLabelText(/^Yield unit/)).toBeRequired();
    await expect(canvas.getByLabelText(/^Recipe note/)).toBeRequired();
    await expect(canvas.getByRole("button", { name: "Remove soup" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Save changes" })).toBeVisible();
  },
};
