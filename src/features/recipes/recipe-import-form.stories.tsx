import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent } from "storybook/test";
import {
  RecipeImportForm,
  RecipeImportPageForm,
  type RecipeImportAction,
  type RecipeImportFormState,
} from "./recipe-import-form";

const noOpAction: RecipeImportAction = async () => ({ errors: {} });
const fieldErrorAction: RecipeImportAction = async () => ({
  errors: { url: "Enter a recipe website URL we can import." },
});
const formErrorAction: RecipeImportAction = async () => ({
  errors: {},
  message: "We could not import this recipe.",
});

const pendingActionControl: {
  finish: (state: RecipeImportFormState) => void;
} = { finish: () => undefined };
const pendingAction: RecipeImportAction = () =>
  new Promise((resolve) => {
    pendingActionControl.finish = resolve;
  });

const meta = {
  title: "Recipes/RecipeImportForm",
  component: RecipeImportForm,
  parameters: { layout: "padded" },
  args: { importAction: noOpAction },
} satisfies Meta<typeof RecipeImportForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { importAction: fn(noOpAction) },
  play: async ({ canvas, args }) => {
    const url = "https://example.com/recipes/soup";
    await userEvent.type(canvas.getByRole("textbox", { name: "Recipe website URL" }), url);
    await userEvent.click(canvas.getByRole("button", { name: "Import recipe" }));
    await expect(args.importAction).toHaveBeenCalled();
  },
};

export const FieldErrorAfterFailedSubmission: Story = {
  args: { importAction: fieldErrorAction },
  play: async ({ canvas }) => {
    const url = "https://example.com/recipes/soup";
    const input = canvas.getByRole("textbox", { name: "Recipe website URL" });
    await userEvent.type(input, url);
    await userEvent.click(canvas.getByRole("button", { name: "Import recipe" }));
    await expect(
      await canvas.findByText("Enter a recipe website URL we can import."),
    ).toBeVisible();
    await expect(input).toHaveValue(url);
  },
};

export const FormError: Story = {
  args: { importAction: formErrorAction },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Recipe website URL" }),
      "https://example.com/recipes/soup",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Import recipe" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "We could not import this recipe.",
    );
  },
};

export const Pending: Story = {
  args: { importAction: pendingAction },
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Recipe website URL" }),
      "https://example.com/recipes/soup",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Import recipe" }));
    await expect(canvas.getByRole("button", { name: "Importing…" })).toBeDisabled();
    pendingActionControl.finish({ errors: {} });
    await expect(await canvas.findByRole("button", { name: "Import recipe" })).toBeEnabled();
  },
};

export const ImportPagePlaceholder: Story = {
  render: () => <RecipeImportPageForm />,
  play: async ({ canvas }) => {
    await userEvent.type(
      canvas.getByRole("textbox", { name: "Recipe website URL" }),
      "https://example.com/recipes/soup",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Import recipe" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Website import isn’t available yet.",
    );
  },
};
