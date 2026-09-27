"use client";

import * as React from "react";
import { Avatar as BaseAvatar } from "@base-ui/react/avatar";
import { cn } from "cn";
import { User } from "lucide-react";

import styles from "./avatar.module.css";

export type AvatarSize = "small" | "medium" | "large";

export type AvatarProps = Omit<React.ComponentPropsWithoutRef<"span">, "children"> & {
  name: string;
  size?: AvatarSize;
};

const graphemeSegmenter = new Intl.Segmenter("und", { granularity: "grapheme" });

function firstGrapheme(value: string) {
  return graphemeSegmenter.segment(value)[Symbol.iterator]().next().value?.segment ?? "";
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/u).filter(Boolean);
  const firstPart = parts[0];

  if (!firstPart) {
    return "";
  }

  const relevantParts = parts.length === 1 ? [firstPart] : [firstPart, parts.at(-1)!];

  return relevantParts.map(firstGrapheme).join("").toUpperCase();
}

export const Avatar = React.forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  {
    "aria-hidden": ariaHidden,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    className,
    name,
    role,
    size = "medium",
    ...props
  },
  ref,
) {
  const normalizedName = name.trim().replace(/\s+/gu, " ");
  const accessibleLabel = ariaLabel === undefined ? normalizedName : ariaLabel;
  const hasAccessibleName = Boolean(accessibleLabel.trim() || ariaLabelledBy?.trim());
  const initials = getInitials(name);
  const fallbackIconSize = size === "small" ? 14 : size === "large" ? 22 : 18;

  return (
    <BaseAvatar.Root
      {...props}
      ref={ref}
      data-size={size}
      className={cn(styles.avatar, className)}
      render={(rootProps) => (
        <span
          {...rootProps}
          role={role ?? (hasAccessibleName ? "img" : "presentation")}
          aria-label={accessibleLabel || undefined}
          aria-labelledby={ariaLabelledBy}
          aria-hidden={ariaHidden ?? !hasAccessibleName}
        />
      )}
    >
      <BaseAvatar.Fallback className={styles.initials}>
        {initials || <User aria-hidden="true" size={fallbackIconSize} />}
      </BaseAvatar.Fallback>
    </BaseAvatar.Root>
  );
});
