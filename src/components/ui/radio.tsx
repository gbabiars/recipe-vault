"use client";

import * as React from "react";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import {
  RadioGroup as BaseRadioGroup,
  type RadioGroupProps as BaseRadioGroupProps,
} from "@base-ui/react/radio-group";
import { cn } from "cn";

import styles from "./choice.module.css";

export type RadioProps = React.ComponentPropsWithoutRef<typeof BaseRadio.Root> & { value: string };
export type RadioGroupProps = BaseRadioGroupProps<string>;

export const Radio = React.forwardRef<HTMLElement, RadioProps>(function Radio(
  { className, ...props },
  ref,
) {
  return (
    <BaseRadio.Root
      {...props}
      ref={ref}
      className={
        typeof className === "function"
          ? (state) => cn(styles.control, styles.radio, className(state))
          : cn(styles.control, styles.radio, className)
      }
    >
      <BaseRadio.Indicator className={styles.dot} />
    </BaseRadio.Root>
  );
});

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  { className, ...props },
  ref,
) {
  return (
    <BaseRadioGroup
      {...props}
      ref={ref}
      className={
        typeof className === "function"
          ? (state) => cn(styles.group, className(state))
          : cn(styles.group, className)
      }
    />
  );
});
