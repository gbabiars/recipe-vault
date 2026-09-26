"use client";

import type { ComponentPropsWithoutRef } from "react";
import { X } from "lucide-react";
import { cn } from "cn";
import { Text } from "../text";

import styles from "./chip.module.css";

type ChipRemovalProps =
  | { onRemove: () => void; removeLabel: string }
  | { onRemove?: never; removeLabel?: never };

export type ChipProps = ComponentPropsWithoutRef<"span"> & ChipRemovalProps;

export function Chip({ children, className, onRemove, removeLabel, ...props }: ChipProps) {
  return (
    <span {...props} className={cn(styles.chip, className)}>
      <Text>{children}</Text>
      {onRemove ? (
        <button
          aria-label={removeLabel}
          className={styles.removeButton}
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          type="button"
        >
          <X aria-hidden="true" size={14} />
        </button>
      ) : null}
    </span>
  );
}
