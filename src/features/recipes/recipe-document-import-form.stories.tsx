import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, userEvent } from "storybook/test";
import {
  RecipeDocumentImportForm,
  type RecipeDocumentImporter,
} from "./recipe-document-import-form";
import { RecipeImportError } from "./import-recipe-from-api";

const pdf = new File(["%PDF-1.7"], "tomato-soup.pdf", { type: "application/pdf" });
const success: RecipeDocumentImporter = async () => ({ id: "new-recipe" });
const pendingControl: { finish: (result: { id: string }) => void } = { finish: () => undefined };
const pending: RecipeDocumentImporter = () =>
  new Promise((resolve) => {
    pendingControl.finish = resolve;
  });

const meta = {
  title: "App/Recipes/RecipeDocumentImportForm",
  component: RecipeDocumentImportForm,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
  args: { importRecipe: success },
} satisfies Meta<typeof RecipeDocumentImportForm>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Selected: Story = {
  play: async ({ canvas }) => {
    await userEvent.upload(canvas.getByLabelText("Recipe PDF"), pdf);
    await expect(canvas.getByRole("button", { name: "Import PDF" })).toBeEnabled();
  },
};

export const Success: Story = {
  args: { importRecipe: fn(success) },
  play: async ({ canvas, args }) => {
    await userEvent.upload(canvas.getByLabelText("Recipe PDF"), pdf);
    await userEvent.click(canvas.getByRole("button", { name: "Import PDF" }));
    await expect(args.importRecipe).toHaveBeenCalledWith(pdf);
    await expect(getRouter().push).toHaveBeenCalledWith("/recipes/new-recipe");
  },
};

export const Error/* NOSONAR: intentional Storybook error-state story name. */ : Story = {
  args: {
    importRecipe: async () => {
      throw new RecipeImportError(
        "This PDF has no readable text. Scanned images are not supported.",
      );
    },
  },
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText("Recipe PDF") as HTMLInputElement;
    await userEvent.upload(input, pdf);
    await userEvent.click(canvas.getByRole("button", { name: "Import PDF" }));
    await expect(await canvas.findByRole("alert")).toBeVisible();
    await expect(canvas.getByRole("alert")).toHaveTextContent(
      "This PDF has no readable text. Scanned images are not supported.",
    );
    await expect(input.files?.[0]?.name).toBe("tomato-soup.pdf");
  },
};

export const Pending: Story = {
  args: { importRecipe: pending },
  play: async ({ canvas }) => {
    await userEvent.upload(canvas.getByLabelText("Recipe PDF"), pdf);
    await userEvent.click(canvas.getByRole("button", { name: "Import PDF" }));
    await expect(canvas.getByRole("button", { name: "Importing PDF…" })).toBeDisabled();
    pendingControl.finish({ id: "new-recipe" });
  },
};
