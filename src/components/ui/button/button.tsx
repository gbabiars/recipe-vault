"use client";

import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { cn } from "cn";

import styles from "./button.module.css";

type BaseButtonProps = React.ComponentPropsWithoutRef<typeof BaseButton>;

export type ButtonVariant = "default" | "primary" | "subtle" | "danger";
export type ButtonSize = "small" | "medium" | "large";
export type ButtonProps = BaseButtonProps & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

export const Button = React.forwardRef<HTMLElement, ButtonProps>(function Button(
  { className, type = "button", variant = "default", size = "medium", fullWidth = false, ...props },
  ref,
) {
  return (
    <BaseButton
      {...props}
      ref={ref}
      type={type}
      data-variant={variant}
      data-size={size}
      data-full-width={fullWidth ? "" : undefined}
      className={cn(styles.button, className)}
    />
  );
});
