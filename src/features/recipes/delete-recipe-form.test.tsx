import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { DeleteRecipeForm } from "./delete-recipe-form";

const deleteRecipeAction = vi.fn();
vi.mock("./actions", () => ({
  deleteRecipeAction: (...args: unknown[]) => deleteRecipeAction(...args),
}));

afterEach(() => {
  cleanup();
  deleteRecipeAction.mockReset();
});

test("submits the confirmation value only when checked", async () => {
  deleteRecipeAction.mockResolvedValue({ errors: {} });
  const { container } = render(<DeleteRecipeForm recipeId="recipe-1" />);
  const form = container.querySelector("form")!;
  const confirmation = screen.getByRole("checkbox", {
    name: "I understand this permanently deletes the recipe.",
  });

  expect(new FormData(form).has("confirmDelete")).toBe(false);
  fireEvent.click(confirmation);
  expect(new FormData(form).get("confirmDelete")).toBe("delete");
  fireEvent.click(screen.getByRole("button", { name: "Delete recipe" }));

  await waitFor(() => expect(deleteRecipeAction).toHaveBeenCalled());
  expect(Object.fromEntries(deleteRecipeAction.mock.calls[0][1] as FormData)).toMatchObject({
    recipeId: "recipe-1",
    confirmDelete: "delete",
  });
});

test("shows a confirmation error on the checkbox", async () => {
  deleteRecipeAction.mockResolvedValue({
    errors: { confirmDelete: "Confirm deletion before continuing." },
  });
  render(<DeleteRecipeForm recipeId="recipe-1" />);
  fireEvent.click(screen.getByRole("button", { name: "Delete recipe" }));

  await waitFor(() =>
    expect(
      screen.getByRole("checkbox", {
        name: "I understand this permanently deletes the recipe.",
        description: "Confirm deletion before continuing.",
      }),
    ).toBeTruthy(),
  );
  expect(screen.getByRole("checkbox").hasAttribute("data-invalid")).toBe(true);
});
