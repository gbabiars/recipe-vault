"use client";

import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { cn } from "cn";

import styles from "./choice.module.css";

export type CheckboxProps = React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root>;
export type CheckboxGroupProps = React.ComponentPropsWithoutRef<typeof BaseCheckboxGroup>;

export const Checkbox = React.forwardRef<HTMLElement, CheckboxProps>(function Checkbox(
  { className, ...props },
  ref,
) {
  return (
    <BaseCheckbox.Root
      {...props}
      ref={ref}
      className={
        typeof className === "function"
          ? (state) => cn(styles.control, styles.checkbox, className(state))
          : cn(styles.control, styles.checkbox, className)
      }
    >
      <BaseCheckbox.Indicator className={styles.indicator}>
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className={styles.check}>
          <path d="m3 8 3.3 3.3L13 4.5" stroke="currentColor" strokeWidth="2" />
        </svg>
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className={styles.mixed}>
          <path d="M3 8h10" stroke="currentColor" strokeWidth="2" />
        </svg>
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
});

export const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
  function CheckboxGroup({ className, ...props }, ref) {
    return (
      <BaseCheckboxGroup
        {...props}
        ref={ref}
        className={
          typeof className === "function"
            ? (state) => cn(styles.group, className(state))
            : cn(styles.group, className)
        }
      />
    );
  },
);
