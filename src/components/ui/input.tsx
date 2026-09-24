"use client";

import * as React from "react";
import { Input as BaseInput } from "@base-ui/react/input";
import { cn } from "cn";

import styles from "./input.module.css";

export type InputProps = React.ComponentPropsWithoutRef<typeof BaseInput>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <BaseInput
      {...props}
      ref={ref}
      className={
        typeof className === "function"
          ? (state) => cn(styles.input, className(state))
          : cn(styles.input, className)
      }
    />
  );
});
