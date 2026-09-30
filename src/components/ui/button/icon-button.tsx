"use client";

import * as React from "react";
import { cn } from "cn";

import { Button } from "./button";
import type { ButtonIcon, ButtonProps } from "./button";
import styles from "./button.module.css";

type DistributiveOmit<T, Keys extends PropertyKey> = T extends unknown ? Omit<T, Keys> : never;

export type IconButtonProps = DistributiveOmit<
  ButtonProps,
  "aria-label" | "children" | "fullWidth" | "icon"
> & {
  /** Accessible name describing the action or destination. */
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
      label=""
    />
  );
});
