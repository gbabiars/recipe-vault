import * as React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { expect, test, vi } from "vitest";

import "../../../app/globals.css";

import { Button } from "../button";
import { AlertDialog, AlertDialogTrigger, createAlertDialogHandle } from "./alert-dialog";

test("focuses Cancel and reports explicit and Escape cancellation", async () => {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(
    <AlertDialog
      trigger={<Button label="Archive recipe" />}
      title="Archive this recipe?"
      description="You can restore it later."
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );

  const trigger = screen.getByRole("button", { name: "Archive recipe" });
  await userEvent.click(trigger);
  const dialog = await screen.findByRole("alertdialog", { name: "Archive this recipe?" });
  expect(dialog).toHaveAccessibleDescription("You can restore it later.");
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();

  await userEvent.click(trigger);
  await screen.findByRole("alertdialog");
  await userEvent.keyboard("{Escape}");
  expect(onCancel).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

test("confirms once and closes an uncontrolled dialog without reporting cancellation", async () => {
  const onCancel = vi.fn();
  const onConfirm = vi.fn();
  render(
    <AlertDialog
      trigger={<Button label="Delete recipe" />}
      title="Delete this recipe?"
      description="This cannot be undone."
      confirmLabel="Delete"
      confirmVariant="danger"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Delete recipe" }));
  const confirm = screen.getByRole("button", { name: "Delete" });
  expect(confirm).toHaveAttribute("data-variant", "danger");
  await userEvent.click(confirm);

  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
});

test("allows rich description and ignores backdrop presses", async () => {
  const onCancel = vi.fn();
  render(
    <AlertDialog
      trigger={<Button label="Review archive" />}
      title="Archive this recipe?"
      description={
        <>
          <p>It will leave your recipe list.</p>
          <p>You can restore it later.</p>
        </>
      }
      onCancel={onCancel}
      onConfirm={vi.fn()}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Review archive" }));
  const dialog = screen.getByRole("alertdialog");
  expect(dialog).toHaveAccessibleDescription(
    "It will leave your recipe list. You can restore it later.",
  );
  const backdrop = document.querySelector('[class*="backdrop"]');
  expect(backdrop).not.toBeNull();
  await userEvent.click(backdrop as Element, { position: { x: 5, y: 5 } });
  expect(dialog).toBeVisible();
  expect(onCancel).not.toHaveBeenCalled();
});

test("opens from multiple nearby and detached triggers and an imperative handle", async () => {
  const handle = createAlertDialogHandle();
  render(
    <>
      <AlertDialogTrigger handle={handle} render={<Button label="Open from menu" />} />
      <AlertDialogTrigger handle={handle} render={<Button label="Open from card" />} />
      <Button label="Open imperatively" onClick={() => handle.open(null)} />
      <AlertDialog
        handle={handle}
        trigger={[
          <Button key="first" label="Nearby first" />,
          <Button key="second" label="Nearby second" />,
        ]}
        title="Archive this recipe?"
        description="All entry points share this dialog."
        onConfirm={vi.fn()}
      />
    </>,
  );

  for (const label of [
    "Nearby first",
    "Nearby second",
    "Open from menu",
    "Open from card",
    "Open imperatively",
  ]) {
    await userEvent.click(screen.getByRole("button", { name: label }));
    expect(await screen.findByRole("alertdialog")).toHaveAccessibleName("Archive this recipe?");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  }
});

test("leaves a controlled dialog open until its caller closes it", async () => {
  const onConfirm = vi.fn();
  let finish: () => void = () => undefined;

  function Example() {
    const [open, setOpen] = React.useState(false);
    return (
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        trigger={<Button label="Review archive" />}
        title="Archive this recipe?"
        description="The caller controls closing."
        onConfirm={() => {
          onConfirm();
          void new Promise<void>((resolve) => {
            finish = resolve;
          }).then(() => setOpen(false));
        }}
      />
    );
  }

  render(<Example />);
  await userEvent.click(screen.getByRole("button", { name: "Review archive" }));
  await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("alertdialog")).toBeVisible();
  act(() => finish());
  await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
});
