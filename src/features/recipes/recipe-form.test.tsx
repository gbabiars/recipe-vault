import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { RecipeForm } from "./recipe-form";

const saveRecipeAction = vi.fn();
vi.mock("./actions", () => ({
  saveRecipeAction: (...args: unknown[]) => saveRecipeAction(...args),
}));

afterEach(() => {
  cleanup();
  saveRecipeAction.mockReset();
});

test("labels fields, connects hints, and submits the expected recipe values", async () => {
  saveRecipeAction.mockResolvedValue({ errors: {} });
  const { container } = render(<RecipeForm />);

  const tags = screen.getByRole("textbox", {
    name: "Tags",
    description: "Separate labels with commas",
  });
  expect(tags).toBeInstanceOf(HTMLInputElement);
  fireEvent.change(screen.getByRole("textbox", { name: "Title" }), {
    target: { value: "Tomato soup" },
  });
  fireEvent.change(tags, { target: { value: "quick, soup" } });
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
  expect(Object.fromEntries(data)).toMatchObject({
    title: "Tomato soup",
    summary: "A quick soup",
    tags: "quick, soup",
    ingredientCount: "1",
    "ingredient-0-name": "Tomato",
    stepCount: "1",
    "step-0-instruction": "Simmer",
  });
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
