import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { RecipeImportForm, type RecipeImporter } from "./recipe-import-form";
import { RecipeImportError } from "../_lib/import-recipe-from-api";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

test("requires a valid website URL before submitting", () => {
  const importRecipe = vi.fn<RecipeImporter>();
  render(<RecipeImportForm importRecipe={importRecipe} />);
  const input = screen.getByRole("textbox", { name: "Recipe website URL" }) as HTMLInputElement;
  expect(input.type).toBe("url");
  expect(input.required).toBe(true);
  fireEvent.change(input, { target: { value: "not a URL" } });
  fireEvent.click(screen.getByRole("button", { name: "Import recipe" }));
  expect(importRecipe).not.toHaveBeenCalled();
});

test("imports and opens the created recipe", async () => {
  push.mockReset();
  const importRecipe = vi.fn<RecipeImporter>().mockResolvedValue({ id: "new recipe" });
  render(<RecipeImportForm importRecipe={importRecipe} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Recipe website URL" }), {
    target: { value: "https://example.com/soup" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Import recipe" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/recipes/new%20recipe"));
  expect(importRecipe).toHaveBeenCalledWith("https://example.com/soup");
});

test("shows a safe error and preserves the URL", async () => {
  const importRecipe = vi
    .fn<RecipeImporter>()
    .mockRejectedValue(new RecipeImportError("No complete recipe was found."));
  render(<RecipeImportForm importRecipe={importRecipe} />);
  const input = screen.getByRole("textbox", { name: "Recipe website URL" });
  fireEvent.change(input, { target: { value: "https://example.com/soup" } });
  fireEvent.click(screen.getByRole("button", { name: "Import recipe" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not import recipe. No complete recipe was found.",
  );
  expect(input).toHaveValue("https://example.com/soup");
});

test("disables submission while import is pending", async () => {
  let finish!: (result: { id: string }) => void;
  const importRecipe = vi.fn<RecipeImporter>(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<RecipeImportForm importRecipe={importRecipe} />);
  fireEvent.change(screen.getByRole("textbox", { name: "Recipe website URL" }), {
    target: { value: "https://example.com/soup" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Import recipe" }));
  expect(screen.getByRole("button", { name: "Importing…" })).toBeDisabled();
  finish({ id: "new" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Import recipe" })).toBeEnabled());
});
