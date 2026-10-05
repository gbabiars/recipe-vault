import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { RecipePageActions } from "./recipe-page-actions";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

function renderActions(deleteAction: (state: unknown, formData: FormData) => Promise<unknown>) {
  return render(
    <ToastProvider>
      <RecipePageActions
        recipeId="recipe-1"
        recipeTitle="Tomato soup"
        editHref="/recipes/recipe-1/edit"
        deleteAction={deleteAction as never}
      />
    </ToastProvider>,
  );
}

afterEach(() => push.mockReset());

test("offers edit and delete actions and links to the current edit route", async () => {
  renderActions(vi.fn());
  fireEvent.click(screen.getByRole("button", { name: "Actions" }));
  expect(screen.getByRole("menuitem", { name: "Edit recipe" }).getAttribute("href")).toBe(
    "/recipes/recipe-1/edit",
  );
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete recipe" }));
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Delete recipe" })).toBeTruthy();
});

test("deletes, shows a recipe-specific success toast, and navigates to recipes", async () => {
  const deleteAction = vi.fn().mockResolvedValue({ errors: {}, deleted: true });
  renderActions(deleteAction);
  fireEvent.click(screen.getByRole("button", { name: "Actions" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete recipe" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete recipe" }));

  expect(await screen.findByText("Tomato soup was deleted.")).toBeTruthy();
  await waitFor(() => expect(push).toHaveBeenCalledWith("/recipes"));
  expect(deleteAction).toHaveBeenCalledWith(expect.anything(), expect.any(FormData));
});

test("keeps the dialog open and shows the error when deletion fails", async () => {
  const deleteAction = vi.fn().mockResolvedValue({
    errors: {},
    message: "Unable to delete this recipe. Please try again.",
  });
  renderActions(deleteAction);
  fireEvent.click(screen.getByRole("button", { name: "Actions" }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Delete recipe" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete recipe" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to delete this recipe. Please try again.",
  );
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  expect(push).not.toHaveBeenCalled();
});
