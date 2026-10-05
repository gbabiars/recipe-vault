"use client";

import * as React from "react";
import { AlertDialog as BaseAlertDialog } from "@base-ui/react/alert-dialog";

import { Button } from "../button";
import { Heading } from "../heading";
import { Inline } from "../inline";
import { Stack } from "../stack";
import { Text } from "../text";
import styles from "./alert-dialog.module.css";

export function createAlertDialogHandle() {
  return BaseAlertDialog.createHandle<never>();
}

export type AlertDialogHandle = ReturnType<typeof createAlertDialogHandle>;

export type AlertDialogTriggerProps = {
  handle: AlertDialogHandle;
  render: React.ReactElement;
  id?: string;
};

export function AlertDialogTrigger({ handle, render, id }: AlertDialogTriggerProps) {
  return <BaseAlertDialog.Trigger handle={handle} render={render} id={id} />;
}

export type AlertDialogProps = {
  title: string;
  description: React.ReactNode;
  onCancel?: () => void;
  onConfirm: () => void | Promise<void>;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmVariant?: "primary" | "danger";
  /** One or more nearby, focusable buttons that forward DOM props and refs. */
  trigger?: React.ReactElement | React.ReactElement[];
  /** Connects detached triggers or allows imperative opening. */
  handle?: AlertDialogHandle;
  /** Supply with onOpenChange to control closing, including asynchronous confirmation. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Associates a controlled dialog with its active trigger for focus restoration. */
  triggerId?: string | null;
};

export function AlertDialog({
  title,
  description,
  onCancel,
  onConfirm,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  trigger,
  handle,
  open,
  onOpenChange,
  triggerId,
}: AlertDialogProps) {
  const cancelRef = React.useRef<HTMLElement>(null);
  const actionsRef = React.useRef<BaseAlertDialog.Root.Actions>(null);

  const confirm = () => {
    const result = onConfirm();
    if (open === undefined) actionsRef.current?.close();
    void result;
  };

  return (
    <BaseAlertDialog.Root
      handle={handle}
      open={open}
      triggerId={triggerId}
      actionsRef={actionsRef}
      onOpenChange={(nextOpen, details) => {
        if (!nextOpen && (details.reason === "close-press" || details.reason === "escape-key")) {
          onCancel?.();
        }
        onOpenChange?.(nextOpen);
      }}
    >
      {React.Children.map(trigger, (button) => (
        <BaseAlertDialog.Trigger render={button as React.ReactElement} />
      ))}
      <BaseAlertDialog.Portal>
        <BaseAlertDialog.Backdrop className={styles.backdrop} />
        <BaseAlertDialog.Viewport className={styles.viewport}>
          <BaseAlertDialog.Popup className={styles.popup} initialFocus={cancelRef}>
            <Stack gap="300">
              <Stack gap="100">
                <BaseAlertDialog.Title
                  render={
                    <Heading level={4} as="h2">
                      {title}
                    </Heading>
                  }
                />
                <BaseAlertDialog.Description
                  render={
                    <Text as="div" appearance="secondary">
                      {description}
                    </Text>
                  }
                />
              </Stack>
              <Inline gap="100" justify="end">
                <BaseAlertDialog.Close
                  render={<Button ref={cancelRef} label={cancelLabel} variant="default" />}
                />
                <Button label={confirmLabel} variant={confirmVariant} onClick={confirm} />
              </Inline>
            </Stack>
          </BaseAlertDialog.Popup>
        </BaseAlertDialog.Viewport>
      </BaseAlertDialog.Portal>
    </BaseAlertDialog.Root>
  );
}
