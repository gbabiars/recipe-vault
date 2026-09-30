"use client";

import * as React from "react";
import { cn } from "cn";

import { Button } from "./button";
import type { ButtonIcon, ButtonProps } from "./button";
import styles from "./button.module.css";

export type IconButtonProps = Omit<
  ButtonProps,
  "aria-label" | "children" | "fullWidth" | "icon"
> & {
  /** Accessible name describing the action. */
  label: string;
  /** Icon shown in the center of the button. */
  icon: ButtonIcon;
};

export const IconButton = React.forwardRef<HTMLElement, IconButtonProps>(function IconButton(
  { className, icon, label, ...props },
  ref,
) {
  return (
    <Button
      {...props}
      ref={ref}
      aria-label={label}
      className={cn(styles.iconOnly, className)}
      icon={icon}
    />
  );
});
