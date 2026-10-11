import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { RecipeDocumentForm, type RecipeDocumentSaveAction } from "./recipe-document-form";
import type { RecipeDocumentContent } from "@/lib/validation/recipe-document";

function fill(label: string, value: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  fireEvent.change(screen.getByLabelText(new RegExp(escaped)), { target: { value } });
}

test("creates a complete document with optional fields and no yield", async () => {
  const saveRecipe = vi.fn<RecipeDocumentSaveAction>().mockResolvedValue({ status: "saved" });
  const onSaved = vi.fn();
  render(<RecipeDocumentForm saveRecipe={saveRecipe} onSaved={onSaved} />);

  fill("Title", "Quick pickled onions");
  fill("Description", "Tangy onions for tacos.");
  fill("Ingredient name", "red onion");
  fill("Amount (optional)", "1");
  fill("Preparation note (optional)", "thinly sliced");
  fill("Direction", "Put the onion in a jar.");
  fill("Tags", "condiments");
  fill("Source URL (optional)", "https://example.com/onions");
  fireEvent.click(screen.getByRole("button", { name: "Add equipment" }));
  fill("Equipment name", "jar");
  fireEvent.click(screen.getByRole("button", { name: "Add note" }));
  fill("Recipe note", "Refrigerate overnight for a stronger flavor.");

  fireEvent.click(screen.getByRole("button", { name: "Create recipe" }));

  await waitFor(() => expect(saveRecipe).toHaveBeenCalledTimes(1));
  const expected: RecipeDocumentContent = {
    title: "Quick pickled onions",
    description: "Tangy onions for tacos.",
    time: {},
    ingredients: [{ name: "red onion", amount: "1", note: "thinly sliced" }],
    equipment: [{ name: "jar" }],
    instructions: ["Put the onion in a jar."],
    notes: ["Refrigerate overnight for a stronger flavor."],
    tags: ["condiments"],
    sourceUrl: "https://example.com/onions",
  };
  expect(saveRecipe).toHaveBeenCalledWith(expected, {});
  expect(onSaved).toHaveBeenCalledTimes(1);
  expect(await screen.findByRole("status")).toHaveTextContent("Recipe saved.");
});

test("passes edit identity and displays a stale revision conflict", async () => {
  const content: RecipeDocumentContent = {
    title: "Rice",
    description: "",
    time: {},
    ingredients: [{ name: "rice", amount: "1 cup" }],
    equipment: [],
    instructions: ["Cook the rice."],
    notes: [],
    tags: [],
  };
  const saveRecipe = vi
    .fn<RecipeDocumentSaveAction>()
    .mockResolvedValue({ status: "conflict", revision: 4 });
  render(
    <RecipeDocumentForm
      recipe={{ id: "recipe-1", revision: 3, content }}
      saveRecipe={saveRecipe}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This recipe changed while you were editing it. The latest version is revision 4. Reload before saving.",
  );
  expect(saveRecipe).toHaveBeenCalledWith(content, { recipeId: "recipe-1", expectedRevision: 3 });
});

test("keeps a blank optional yield valid", async () => {
  const saveRecipe = vi.fn<RecipeDocumentSaveAction>().mockResolvedValue(undefined);
  render(<RecipeDocumentForm saveRecipe={saveRecipe} />);
  fill("Title", "Rice");
  fill("Ingredient name", "rice");
  fill("Direction", "Cook the rice.");
  fill("Yield unit (optional)", "");

  fireEvent.click(screen.getByRole("button", { name: "Create recipe" }));
  await waitFor(() => expect(saveRecipe).toHaveBeenCalledTimes(1));
  expect(saveRecipe.mock.calls[0]?.[0]).not.toHaveProperty("yield");
});

test("focuses the first invalid field after client validation fails", async () => {
  const saveRecipe = vi.fn<RecipeDocumentSaveAction>();
  render(<RecipeDocumentForm saveRecipe={saveRecipe} />);

  fireEvent.click(screen.getByRole("button", { name: "Create recipe" }));

  const title = screen.getByLabelText(/Title/);
  await waitFor(() => expect(title).toHaveFocus());
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Review the highlighted fields and try again.",
  );
  expect(saveRecipe).not.toHaveBeenCalled();
});

test("focuses the field named by server validation issues", async () => {
  const content: RecipeDocumentContent = {
    title: "Rice",
    description: "",
    time: {},
    ingredients: [{ name: "rice" }],
    equipment: [],
    instructions: ["Cook the rice."],
    notes: [],
    tags: [],
  };
  const saveRecipe = vi.fn<RecipeDocumentSaveAction>().mockResolvedValue({
    status: "invalid",
    issues: [{ path: ["ingredients", 0, "name"], message: "Use a recognized ingredient name." }],
  });
  render(<RecipeDocumentForm saveRecipe={saveRecipe} />);
  fill("Title", content.title);
  fill("Ingredient name", "rice");
  fill("Direction", "Cook the rice.");

  fireEvent.click(screen.getByRole("button", { name: "Create recipe" }));

  const ingredientName = screen.getByLabelText(/Ingredient name/);
  await waitFor(() => expect(ingredientName).toHaveFocus());
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Review the highlighted fields and try again.",
  );
  expect(ingredientName).toHaveAttribute("aria-invalid", "true");
});

test("shows safe failure feedback when saving rejects", async () => {
  const saveRecipe = vi
    .fn<RecipeDocumentSaveAction>()
    .mockRejectedValue(new Error("database detail"));
  render(<RecipeDocumentForm saveRecipe={saveRecipe} />);
  fill("Title", "Rice");
  fill("Ingredient name", "rice");
  fill("Direction", "Cook the rice.");

  fireEvent.click(screen.getByRole("button", { name: "Create recipe" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "We could not save this recipe. Please try again.",
  );
  expect(screen.getByRole("alert")).not.toHaveTextContent("database detail");
});

test("focuses an invalid field in a later repeated ingredient row", async () => {
  const saveRecipe = vi.fn<RecipeDocumentSaveAction>().mockResolvedValue({
    status: "invalid",
    issues: [{ path: ["ingredients", 1, "name"], message: "Use a recognized ingredient name." }],
  });
  render(<RecipeDocumentForm saveRecipe={saveRecipe} />);
  fill("Title", "Rice");
  fill("Ingredient name", "rice");
  fill("Direction", "Cook the rice.");
  fireEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
  const ingredientFields = screen.getAllByLabelText(/Ingredient name/);
  fireEvent.change(ingredientFields[1]!, { target: { value: "salt" } });

  fireEvent.click(screen.getByRole("button", { name: "Create recipe" }));

  const laterIngredient = screen.getAllByLabelText(/Ingredient name/)[1]!;
  await waitFor(() => expect(laterIngredient).toHaveFocus());
  expect(laterIngredient).toHaveAttribute("aria-invalid", "true");
});
