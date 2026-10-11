import { cleanup, screen, waitFor } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { afterEach, expect, test, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { render } from "@testing-library/react";
import { DocumentRecipePageActionsView } from "./document-recipe-page-actions";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/app/(private)/recipes/_actions/recipe-document-actions", () => ({
  deleteRecipeDocumentAction: vi.fn(),
}));

function renderActions(
  deleteAction: Parameters<typeof DocumentRecipePageActionsView>[0]["deleteAction"],
) {
  return render(
    <ToastProvider>
      <DocumentRecipePageActionsView
        recipeId="recipe-1"
        recipeTitle="Tomato soup"
        revision={7}
        editHref="/recipes/recipe-1/edit"
        deleteAction={deleteAction}
        navigate={push}
      />
    </ToastProvider>,
  );
}

async function confirmDelete() {
  await userEvent.click(screen.getByRole("button", { name: "Actions" }));
  await userEvent.click(screen.getByRole("menuitem", { name: "Delete recipe" }));
  return screen.findByRole("alertdialog", { name: "Delete Tomato soup?" });
}

afterEach(() => push.mockReset());

test("requires confirmation before calling delete with the loaded revision", async () => {
  const deleteAction = vi.fn().mockResolvedValue({ status: "deleted" });
  renderActions(deleteAction);

  await confirmDelete();
  expect(deleteAction).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Delete recipe" }));

  await waitFor(() => expect(deleteAction).toHaveBeenCalledWith("recipe-1", 7));
  expect(await screen.findByText("Tomato soup was deleted.")).toBeTruthy();
  expect(push).toHaveBeenCalledWith("/recipes");
});

test("keeps the dialog open and blocks Escape and Cancel while deletion is pending", async () => {
  let finish: (result: { status: "deleted" }) => void = () => undefined;
  const deleteAction = vi.fn(
    () =>
      new Promise<{ status: "deleted" }>((resolve) => {
        finish = resolve;
      }),
  );
  renderActions(deleteAction);

  await confirmDelete();
  await userEvent.click(screen.getByRole("button", { name: "Delete recipe" }));
  expect(deleteAction).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Delete recipe" })).toBeDisabled();

  await userEvent.keyboard("{Escape}");
  expect(screen.getByRole("alertdialog")).toBeVisible();
  (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement).click();
  expect(screen.getByRole("alertdialog")).toBeVisible();
  expect(deleteAction).toHaveBeenCalledTimes(1);

  finish({ status: "deleted" });
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  expect(push).toHaveBeenCalledWith("/recipes");
});

test("keeps the dialog available to retry when deletion throws", async () => {
  const deleteAction = vi.fn().mockRejectedValue(new Error("request failed"));
  renderActions(deleteAction);

  await confirmDelete();
  await userEvent.click(screen.getByRole("button", { name: "Delete recipe" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Unable to delete this recipe. Please try again.",
  );
  expect(screen.getByRole("alertdialog")).toBeVisible();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  expect(push).not.toHaveBeenCalled();
});

test("keeps the confirmation open and asks for refresh after a stale revision conflict", async () => {
  const deleteAction = vi.fn().mockResolvedValue({ status: "conflict", revision: 8 });
  renderActions(deleteAction);

  await confirmDelete();
  await userEvent.click(screen.getByRole("button", { name: "Delete recipe" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This recipe changed after this page loaded. Refresh the page, then try again.",
  );
  expect(screen.getByRole("alertdialog")).toBeVisible();
  expect(push).not.toHaveBeenCalled();
});

test("reports unavailable and invalid outcomes without navigating", async () => {
  for (const [result, message] of [
    [{ status: "not_found" }, "This recipe is no longer available."],
    [
      { status: "invalid", issues: [] },
      "Unable to delete this recipe. Refresh the page and try again.",
    ],
  ] as const) {
    const deleteAction = vi.fn().mockResolvedValue(result);
    renderActions(deleteAction);
    await confirmDelete();
    await userEvent.click(screen.getByRole("button", { name: "Delete recipe" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getByRole("alertdialog")).toBeVisible();
    expect(push).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    cleanup();
  }
});
