"use client";

import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";

import styles from "./button.module.css";

type BaseButtonProps = React.ComponentPropsWithoutRef<typeof BaseButton>;
type ButtonClassName = Exclude<NonNullable<BaseButtonProps["className"]>, string>;
type ButtonState = Parameters<ButtonClassName>[0];

export type ButtonProps = BaseButtonProps;

function withButtonClassName(className: ButtonProps["className"]) {
  if (typeof className === "function") {
    return (state: ButtonState) => [styles.button, className(state)].filter(Boolean).join(" ");
  }

  return [styles.button, className].filter(Boolean).join(" ");
}

export const Button = React.forwardRef<HTMLElement, ButtonProps>(function Button(
  { className, type = "button", ...props },
  ref,
) {
  return <BaseButton {...props} ref={ref} type={type} className={withButtonClassName(className)} />;
});
