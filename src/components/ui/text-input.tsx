"use client";

import * as React from "react";
import { Input as BaseInput } from "@base-ui/react/input";
import { cn } from "cn";
import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import styles from "./text-input.module.css";

export type TextInputType =
  | "text"
  | "search"
  | "email"
  | "password"
  | "tel"
  | "url"
  | "number"
  | "date"
  | "datetime-local"
  | "month"
  | "time"
  | "week";

export type TextInputProps = Omit<
  React.ComponentPropsWithoutRef<typeof BaseInput>,
  | "children"
  | "render"
  | "className"
  | "style"
  | "type"
  | "value"
  | "defaultValue"
  | "aria-invalid"
  | "aria-labelledby"
> & {
  label: React.ReactNode;
  helpText?: React.ReactNode;
  error?: React.ReactNode;
  invalid?: boolean;
  visuallyHiddenLabel?: boolean;
  type?: TextInputType;
  value?: string | number;
  defaultValue?: string | number;
  className?: string;
  style?: React.CSSProperties;
  inputClassName?: string;
  inputStyle?: React.CSSProperties;
};

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    label,
    helpText,
    error,
    invalid,
    visuallyHiddenLabel = false,
    type = "text",
    className,
    style,
    inputClassName,
    inputStyle,
    name,
    disabled,
    ...inputProps
  },
  ref,
) {
  const hasError =
    error != null && error !== false && (typeof error !== "string" || error.trim() !== "");

  return (
    <Field
      name={name}
      disabled={disabled}
      invalid={hasError || invalid}
      className={className}
      style={style}
    >
      <FieldLabel className={visuallyHiddenLabel ? "visually-hidden" : undefined}>
        {label}
      </FieldLabel>
      <BaseInput
        {...inputProps}
        ref={ref}
        type={type}
        className={cn(styles.input, inputClassName)}
        style={inputStyle}
      />
      {helpText != null && <FieldDescription>{helpText}</FieldDescription>}
      <FieldError match={hasError ? true : undefined}>{hasError ? error : undefined}</FieldError>
    </Field>
  );
});
