"use client";

import * as React from "react";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";

import styles from "./tooltip.module.css";

type BasePositionerProps = React.ComponentPropsWithoutRef<typeof BaseTooltip.Positioner>;

export type TooltipProviderProps = React.PropsWithChildren;

export type TooltipProps = {
  /** A focusable element that forwards refs and event props to its DOM element. */
  trigger: React.ReactElement;
  /** Short, non-interactive supplemental description for the trigger. */
  content: React.ReactNode;
  /** Prevents the visual tooltip from opening and omits its description. */
  disabled?: boolean;
  /** Preferred side of the trigger; collision handling may reposition the tooltip. */
  side?: BasePositionerProps["side"];
};

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <BaseTooltip.Provider delay={400}>{children}</BaseTooltip.Provider>;
}

export function Tooltip({ trigger, content, disabled = false, side = "top" }: TooltipProps) {
  const contentId = React.useId();
  const triggerDescription = (trigger.props as { "aria-describedby"?: string })["aria-describedby"];
  const describedBy = disabled
    ? triggerDescription
    : mergeIdReferences(triggerDescription, contentId);
  const describedTrigger = React.cloneElement(
    trigger as React.ReactElement<{ "aria-describedby"?: string }>,
    { "aria-describedby": describedBy },
  );

  return (
    <BaseTooltip.Root disabled={disabled}>
      <BaseTooltip.Trigger disabled={disabled} render={describedTrigger} />
      {!disabled && (
        <BaseTooltip.Portal keepMounted>
          <BaseTooltip.Positioner
            className={styles.positioner}
            side={side}
            align="center"
            sideOffset={8}
          >
            <BaseTooltip.Popup className={styles.popup} id={contentId} role="tooltip">
              {content}
            </BaseTooltip.Popup>
          </BaseTooltip.Positioner>
        </BaseTooltip.Portal>
      )}
    </BaseTooltip.Root>
  );
}

function mergeIdReferences(existing: string | undefined, contentId: string) {
  const ids = existing?.split(/\s+/).filter(Boolean) ?? [];

  if (!ids.includes(contentId)) ids.push(contentId);
  return ids.join(" ");
}
