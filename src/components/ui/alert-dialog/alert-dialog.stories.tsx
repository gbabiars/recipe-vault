import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { Button } from "../button";
import { Inline } from "../inline";
import { AlertDialog, AlertDialogTrigger, createAlertDialogHandle } from "./alert-dialog";

const onConfirm = fn();
const onCancel = fn();

const meta = {
  title: "UI/AlertDialog",
  component: AlertDialog,
  args: {
    title: "Archive this recipe?",
    description: "You can restore it later.",
    trigger: <Button label="Archive recipe" />,
    onConfirm,
    onCancel,
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    onConfirm.mockClear();
    await userEvent.click(canvas.getByRole("button", { name: "Archive recipe" }));
    const dialog = await within(document.body).findByRole("alertdialog");
    await expect(dialog).toHaveAccessibleName("Archive this recipe?");
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus(),
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
    await expect(onConfirm).toHaveBeenCalledTimes(1);
    await expect(within(document.body).queryByRole("alertdialog")).not.toBeInTheDocument();
  },
};

export const Destructive: Story = {
  args: {
    title: "Delete this recipe?",
    description: "This permanently removes the recipe.",
    trigger: <Button label="Delete recipe" variant="danger" />,
    confirmLabel: "Delete",
    confirmVariant: "danger",
  },
  play: async ({ canvas }) => {
    onCancel.mockClear();
    await userEvent.click(canvas.getByRole("button", { name: "Delete recipe" }));
    const dialog = await within(document.body).findByRole("alertdialog");
    await expect(within(dialog).getByRole("button", { name: "Delete" })).toHaveAttribute(
      "data-variant",
      "danger",
    );
    await userEvent.keyboard("{Escape}");
    await expect(onCancel).toHaveBeenCalledTimes(1);
    await expect(within(document.body).queryByRole("alertdialog")).not.toBeInTheDocument();
  },
};

export const RichDescription: Story = {
  args: {
    description: (
      <>
        <p>This recipe will move to your archive.</p>
        <p>You can restore it from your recipe list.</p>
      </>
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Archive recipe" }));
    const dialog = await within(document.body).findByRole("alertdialog");
    await expect(dialog).toHaveAccessibleDescription(
      "This recipe will move to your archive. You can restore it from your recipe list.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  },
};

function DetachedExample() {
  const [handle] = React.useState(createAlertDialogHandle);

  return (
    <>
      <Inline gap="100">
        <AlertDialogTrigger handle={handle} render={<Button label="Archive from menu" />} />
        <AlertDialogTrigger handle={handle} render={<Button label="Archive from card" />} />
        <Button label="Open programmatically" onClick={() => handle.open(null)} />
      </Inline>
      <AlertDialog
        handle={handle}
        title="Archive this recipe?"
        description="Both entry points open this confirmation."
        onConfirm={onConfirm}
      />
    </>
  );
}

export const DetachedAndImperative: Story = {
  render: () => <DetachedExample />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Archive from card" }));
    let dialog = await within(document.body).findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await userEvent.click(canvas.getByRole("button", { name: "Open programmatically" }));
    dialog = await within(document.body).findByRole("alertdialog");
    await expect(dialog).toHaveAccessibleName("Archive this recipe?");
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  },
};

function ControlledExample() {
  const [open, setOpen] = React.useState(false);

  return (
    <AlertDialog
      open={open}
      onOpenChange={setOpen}
      trigger={<Button label="Review archive" />}
      title="Archive this recipe?"
      description="The caller decides when the dialog closes."
      onConfirm={() => {
        onConfirm();
        setOpen(false);
      }}
    />
  );
}

export const Controlled: Story = {
  render: () => <ControlledExample />,
  play: async ({ canvas }) => {
    onConfirm.mockClear();
    await userEvent.click(canvas.getByRole("button", { name: "Review archive" }));
    const dialog = await within(document.body).findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Confirm" }));
    await expect(onConfirm).toHaveBeenCalledTimes(1);
    await expect(within(document.body).queryByRole("alertdialog")).not.toBeInTheDocument();
  },
};
