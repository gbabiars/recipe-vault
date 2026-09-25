"use client";

import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";
import { Fieldset as BaseFieldset } from "@base-ui/react/fieldset";
import { cn } from "cn";

import styles from "./field.module.css";

export type FieldProps = React.ComponentPropsWithoutRef<typeof BaseField.Root> & {
  layout?: "default" | "choice";
};
export type FieldLabelProps = React.ComponentPropsWithoutRef<typeof BaseField.Label>;
export type FieldDescriptionProps = React.ComponentPropsWithoutRef<typeof BaseField.Description>;
export type FieldErrorProps = React.ComponentPropsWithoutRef<typeof BaseField.Error>;
export type FieldItemProps = React.ComponentPropsWithoutRef<typeof BaseField.Item>;
export type FieldsetProps = React.ComponentPropsWithoutRef<typeof BaseFieldset.Root>;
export type FieldsetLegendProps = React.ComponentPropsWithoutRef<typeof BaseFieldset.Legend>;

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(function Field(
  { className, layout = "default", ...props },
  ref,
) {
  return (
    <BaseField.Root
      {...props}
      data-layout={layout}
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

export const FieldItem = React.forwardRef<HTMLDivElement, FieldItemProps>(function FieldItem(
  { className, ...props },
  ref,
) {
  return (
    <BaseField.Item
      {...props}
      ref={ref}
      className={
        typeof className === "function"
          ? (state) => cn(styles.item, className(state))
          : cn(styles.item, className)
      }
    />
  );
});

export const Fieldset = React.forwardRef<HTMLElement, FieldsetProps>(function Fieldset(
  { className, ...props },
  ref,
) {
  return (
    <BaseFieldset.Root
      {...props}
      ref={ref}
      className={
        typeof className === "function"
          ? (state) => cn(styles.fieldset, className(state))
          : cn(styles.fieldset, className)
      }
    />
  );
});

export const FieldsetLegend = React.forwardRef<HTMLDivElement, FieldsetLegendProps>(
  function FieldsetLegend({ className, ...props }, ref) {
    return (
      <BaseFieldset.Legend
        {...props}
        ref={ref}
        className={
          typeof className === "function"
            ? (state) => cn(styles.legend, className(state))
            : cn(styles.legend, className)
        }
      />
    );
  },
);
