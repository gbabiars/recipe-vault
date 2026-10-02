import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import {
  RecipeDocumentImportForm,
  type RecipeDocumentImporter,
} from "./recipe-document-import-form";
import { RecipeImportError } from "./import-recipe-from-api";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const pdf = new File(["%PDF-1.7"], "soup.pdf", { type: "application/pdf" });

function selectPdf(input: HTMLElement) {
  const files = new DataTransfer();
  files.items.add(pdf);
  (input as HTMLInputElement).files = files.files;
  fireEvent.change(input);
}

test("requires a PDF selection and opens the imported recipe", async () => {
  push.mockReset();
  const importRecipe = vi.fn<RecipeDocumentImporter>().mockResolvedValue({ id: "new recipe" });
  render(<RecipeDocumentImportForm importRecipe={importRecipe} />);
  const submit = screen.getByRole("button", { name: "Import PDF" });
  expect(submit).toBeDisabled();
  selectPdf(screen.getByLabelText("Recipe PDF"));
  expect(submit).toBeEnabled();
  fireEvent.click(submit);
  await waitFor(() => expect(push).toHaveBeenCalledWith("/recipes/new%20recipe"));
  expect(importRecipe).toHaveBeenCalledWith(pdf);
});

test("keeps the selected PDF after a safe error", async () => {
  const importRecipe = vi
    .fn<RecipeDocumentImporter>()
    .mockRejectedValue(
      new RecipeImportError("This PDF has no readable text. Scanned images are not supported."),
    );
  render(<RecipeDocumentImportForm importRecipe={importRecipe} />);
  const input = screen.getByLabelText("Recipe PDF") as HTMLInputElement;
  selectPdf(input);
  fireEvent.click(screen.getByRole("button", { name: "Import PDF" }));
  expect(await screen.findByRole("alert")).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Could not import PDF. This PDF has no readable text. Scanned images are not supported.",
  );
  expect(input.files?.[0]).toBe(pdf);
  expect(screen.getByRole("button", { name: "Import PDF" })).toBeEnabled();
});

test("disables PDF submission while pending", async () => {
  let finish!: (result: { id: string }) => void;
  const importRecipe = vi.fn<RecipeDocumentImporter>(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<RecipeDocumentImportForm importRecipe={importRecipe} />);
  selectPdf(screen.getByLabelText("Recipe PDF"));
  fireEvent.click(screen.getByRole("button", { name: "Import PDF" }));
  expect(screen.getByRole("button", { name: "Importing PDF…" })).toBeDisabled();
  finish({ id: "new" });
  await waitFor(() => expect(screen.getByRole("button", { name: "Import PDF" })).toBeEnabled());
});
