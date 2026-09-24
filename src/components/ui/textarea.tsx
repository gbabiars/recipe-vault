"use client";

import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";
import { cn } from "cn";

import styles from "./textarea.module.css";

type ControlProps = React.ComponentPropsWithoutRef<typeof BaseField.Control>;

export type TextareaProps = Omit<
  React.ComponentPropsWithoutRef<"textarea">,
  "className" | "style"
> &
  Pick<ControlProps, "className" | "style" | "onValueChange">;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 3, ...props },
  ref,
) {
  return (
    <BaseField.Control
      {...({ ...props, rows } as ControlProps)}
      ref={ref}
      render={<textarea />}
      className={
        typeof className === "function"
          ? (state) => cn(styles.textarea, className(state))
          : cn(styles.textarea, className)
      }
    />
  );
});
