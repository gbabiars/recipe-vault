import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import {
  RecipeImportForm,
  type RecipeImportAction,
  type RecipeImportFormState,
} from "./recipe-import-form";

afterEach(cleanup);

test("requires a valid website URL using native URL validation", () => {
  const importAction = vi.fn<RecipeImportAction>(async () => ({ errors: {} }));
  render(<RecipeImportForm importAction={importAction} />);

  const input = screen.getByRole("textbox", { name: "Recipe website URL" }) as HTMLInputElement;
  expect(input.type).toBe("url");
  expect(input.required).toBe(true);
  expect(input.checkValidity()).toBe(false);

  fireEvent.change(input, { target: { value: "not a URL" } });
  expect(input.checkValidity()).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Import recipe" }));
  expect(importAction).not.toHaveBeenCalled();
});

test("renders field errors and preserves the entered URL after a failed submission", async () => {
  const importAction = vi.fn<RecipeImportAction>(async () => ({
    errors: { url: "Enter a recipe website URL we can import." },
  }));
  render(<RecipeImportForm importAction={importAction} />);

  const input = screen.getByRole("textbox", { name: "Recipe website URL" });
  const url = "https://example.com/recipes/soup";
  fireEvent.change(input, { target: { value: url } });
  fireEvent.click(screen.getByRole("button", { name: "Import recipe" }));

  expect(await screen.findByText("Enter a recipe website URL we can import.")).toBeTruthy();
  expect(input).toHaveValue(url);
  expect(importAction).toHaveBeenCalledWith(expect.anything(), expect.any(FormData));
  expect((importAction.mock.calls[0][1] as FormData).get("url")).toBe(url);
});

test("renders form-level errors", async () => {
  const importAction = vi.fn<RecipeImportAction>(async (): Promise<RecipeImportFormState> => ({
    errors: {},
    message: "We could not import this recipe.",
  }));
  render(<RecipeImportForm importAction={importAction} />);

  fireEvent.change(screen.getByRole("textbox", { name: "Recipe website URL" }), {
    target: { value: "https://example.com/recipes/soup" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Import recipe" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("We could not import this recipe.");
});

test("shows a disabled pending button while the action is unresolved", async () => {
  let finishAction: ((state: RecipeImportFormState) => void) | undefined;
  const importAction = vi.fn<RecipeImportAction>(
    () =>
      new Promise((resolve) => {
        finishAction = resolve;
      }),
  );
  render(<RecipeImportForm importAction={importAction} />);

  fireEvent.change(screen.getByRole("textbox", { name: "Recipe website URL" }), {
    target: { value: "https://example.com/recipes/soup" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Import recipe" }));

  const pendingButton = screen.getByRole("button", { name: "Importing…" });
  expect(pendingButton).toBeDisabled();
  finishAction?.({ errors: {} });
  await waitFor(() => expect(screen.getByRole("button", { name: "Import recipe" })).toBeEnabled());
});
