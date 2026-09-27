import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { RecipeForm } from "./recipe-form";
import { parseRecipeFormData } from "./recipe-form-data";

const saveRecipeAction = vi.fn();
vi.mock("./actions", () => ({
  saveRecipeAction: (...args: unknown[]) => saveRecipeAction(...args),
}));

afterEach(() => {
  cleanup();
  saveRecipeAction.mockReset();
});

test("orders ingredient fields as name, quantity, unit, then notes", () => {
  render(<RecipeForm />);

  const ingredient = screen.getByRole("group", { name: "Ingredient 1" });
  expect(Array.from(ingredient.querySelectorAll("input"), (input) => input.name)).toEqual([
    "ingredient-0-name",
    "ingredient-0-quantity",
    "ingredient-0-unit",
    "ingredient-0-notes",
  ]);
});

test("removes added ingredient and step rows", () => {
  render(<RecipeForm />);
  fireEvent.click(screen.getByRole("button", { name: "Add ingredient" }));
  fireEvent.click(screen.getByRole("button", { name: "Add step" }));

  fireEvent.click(screen.getByRole("button", { name: "Remove ingredient 2" }));
  fireEvent.click(screen.getByRole("button", { name: "Remove step 2" }));

  expect(screen.getAllByRole("group", { name: /^Ingredient \d+$/ })).toHaveLength(1);
  expect(screen.getAllByRole("group", { name: /^Step \d+$/ })).toHaveLength(1);
});

test("uses multiple tag choices and keeps the comma-delimited recipe format", async () => {
  saveRecipeAction.mockResolvedValue({ errors: {} });
  const { container } = render(
    <RecipeForm
      recipe={{
        id: "recipe-1",
        ownerId: "owner-1",
        title: "Tomato soup",
        tags: ["quick", "soup"],
        ingredients: [{ displayOrder: 1, quantity: 1, unit: "can", ingredientName: "Tomato" }],
        steps: [{ stepOrder: 1, instruction: "Simmer" }],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }}
    />,
  );

  const tags = screen.getByRole("combobox", { name: "Tags" });
  expect(tags).toBeInstanceOf(HTMLInputElement);
  expect(screen.queryByRole("combobox", { name: "Dietary flags" })).toBeNull();
  expect(screen.getByRole("button", { name: "Remove quick" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Remove soup" })).toBeTruthy();

  fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
    target: { value: "Tomato soup" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "Summary" }), {
    target: { value: "A quick soup" },
  });
  fireEvent.change(
    within(screen.getByRole("group", { name: "Ingredient 1" })).getByRole("textbox", {
      name: "Ingredient name",
    }),
    {
      target: { value: "Tomato" },
    },
  );
  fireEvent.change(
    within(screen.getByRole("group", { name: "Step 1" })).getByRole("textbox", {
      name: "Instruction",
    }),
    {
      target: { value: "Simmer" },
    },
  );

  const form = container.querySelector("form")!;
  const data = new FormData(form);
  expect(data.getAll("tags")).toEqual(["quick", "soup"]);
  expect(Object.fromEntries(data)).toMatchObject({
    title: "Tomato soup",
    summary: "A quick soup",
    ingredientCount: "1",
    "ingredient-0-name": "Tomato",
    stepCount: "1",
    "step-0-instruction": "Simmer",
  });
  expect(parseRecipeFormData(data).tags).toEqual(["quick", "soup"]);
  const legacyData = new FormData(form);
  legacyData.set("tags", "quick, soup");
  expect(parseRecipeFormData(legacyData).tags).toEqual(["quick", "soup"]);
  fireEvent.submit(form);
  await waitFor(() => expect(saveRecipeAction).toHaveBeenCalled());
  expect(Object.fromEntries(saveRecipeAction.mock.calls[0][1] as FormData)).toMatchObject({
    title: "Tomato soup",
    "ingredient-0-name": "Tomato",
    "step-0-instruction": "Simmer",
  });
});

test("shows server errors on their controls and focuses the first invalid field", async () => {
  saveRecipeAction.mockResolvedValue({
    errors: { title: "Enter a title", "steps.0.instruction": "Enter an instruction" },
    message: "Please correct the highlighted fields.",
  });
  render(<RecipeForm />);
  fireEvent.click(screen.getByRole("button", { name: "Create recipe" }));

  await waitFor(() => expect(screen.getByText("Enter a title")).toBeTruthy());
  const title = screen.getByRole("textbox", { name: "Title" });
  expect(title.getAttribute("aria-invalid")).toBe("true");
  expect(title.getAttribute("aria-describedby")).toContain(screen.getByText("Enter a title").id);
  expect(document.activeElement).toBe(title);
  const instruction = within(screen.getByRole("group", { name: "Step 1" })).getByRole("textbox", {
    name: "Instruction",
  });
  expect(instruction.getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByText("Enter an instruction")).toBeTruthy();
});
