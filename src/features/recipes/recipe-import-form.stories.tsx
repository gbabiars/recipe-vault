import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, userEvent } from "storybook/test";
import { RecipeImportForm, type RecipeImporter } from "./recipe-import-form";
import { RecipeImportError } from "./import-recipe-from-api";

const success: RecipeImporter = async () => ({ id: "new-recipe" });
const pendingControl: { finish: (result: { id: string }) => void } = { finish: () => undefined };
const pending: RecipeImporter = () =>
  new Promise((resolve) => {
    pendingControl.finish = resolve;
  });

const meta = {
  title: "Recipes/RecipeImportForm",
  component: RecipeImportForm,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
  args: { importRecipe: success },
} satisfies Meta<typeof RecipeImportForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {
  args: { importRecipe: fn(success) },
  play: async ({ canvas, args }) => {
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Recipe website URL" }),
      "https://example.com/recipes/soup",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Import recipe" }));
    await expect(args.importRecipe).toHaveBeenCalledWith("https://example.com/recipes/soup");
    await expect(getRouter().push).toHaveBeenCalledWith("/recipes/new-recipe");
  },
};

export const Error: Story = {
  args: {
    importRecipe: async () => {
      throw new RecipeImportError(
        "This website blocked automated access. Try another source or create the recipe manually.",
      );
    },
  },
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "Recipe website URL" });
    await userEvent.type(input, "https://example.com/recipes/soup");
    await userEvent.click(canvas.getByRole("button", { name: "Import recipe" }));
    await expect(
      await canvas.findByText(
        "This website blocked automated access. Try another source or create the recipe manually.",
      ),
    ).toBeVisible();
    await expect(input).toHaveValue("https://example.com/recipes/soup");
  },
};

export const Pending: Story = {
  args: { importRecipe: pending },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Recipe website URL" }),
      "https://example.com/recipes/soup",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Import recipe" }));
    await expect(canvas.getByRole("button", { name: "Importing…" })).toBeDisabled();
    pendingControl.finish({ id: "new-recipe" });
  },
};
