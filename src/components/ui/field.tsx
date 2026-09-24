"use client";

import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";
import { cn } from "cn";

import styles from "./field.module.css";

export type FieldProps = React.ComponentPropsWithoutRef<typeof BaseField.Root>;
export type FieldLabelProps = React.ComponentPropsWithoutRef<typeof BaseField.Label>;
export type FieldDescriptionProps = React.ComponentPropsWithoutRef<typeof BaseField.Description>;
export type FieldErrorProps = React.ComponentPropsWithoutRef<typeof BaseField.Error>;

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(function Field(
  { className, ...props },
  ref,
) {
  return (
    <BaseField.Root
      {...props}
      ref={ref}
      className={
        typeof className === "function"
          ? (state) => cn(styles.field, className(state))
          : cn(styles.field, className)
      }
    />
  );
});

export const FieldLabel = React.forwardRef<HTMLLabelElement, FieldLabelProps>(function FieldLabel(
  { className, ...props },
  ref,
) {
  return (
    <BaseField.Label
      {...props}
      ref={ref}
      className={
        typeof className === "function"
          ? (state) => cn(styles.label, className(state))
          : cn(styles.label, className)
      }
    />
  );
});

export const FieldDescription = React.forwardRef<HTMLParagraphElement, FieldDescriptionProps>(
  function FieldDescription({ className, ...props }, ref) {
    return (
      <BaseField.Description
        {...props}
        ref={ref}
        className={
          typeof className === "function"
            ? (state) => cn(styles.description, className(state))
            : cn(styles.description, className)
        }
      />
    );
  },
);

export const FieldError = React.forwardRef<HTMLDivElement, FieldErrorProps>(function FieldError(
  { className, ...props },
  ref,
) {
  return (
    <BaseField.Error
      {...props}
      ref={ref}
      className={
        typeof className === "function"
          ? (state) => cn(styles.error, className(state))
          : cn(styles.error, className)
      }
    />
  );
});
