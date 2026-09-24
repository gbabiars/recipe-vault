"use client";

import * as React from "react";
import { Field as BaseField } from "@base-ui/react/field";
import { cn } from "cn";

import { Field, FieldDescription, FieldError, FieldLabel } from "./field";
import styles from "./textarea.module.css";

type ControlProps = React.ComponentPropsWithoutRef<typeof BaseField.Control>;

export type TextareaProps = Omit<
  React.ComponentPropsWithoutRef<"textarea">,
  "className" | "style"
> &
  Pick<ControlProps, "onValueChange"> & {
    label: React.ReactNode;
    helpText?: React.ReactNode;
    error?: React.ReactNode;
    invalid?: boolean;
    visuallyHiddenLabel?: boolean;
    className?: string;
    style?: React.CSSProperties;
    textareaClassName?: string;
    textareaStyle?: React.CSSProperties;
  };

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    label,
    helpText,
    error,
    invalid,
    visuallyHiddenLabel = false,
    className,
    style,
    textareaClassName,
    textareaStyle,
    name,
    disabled,
    rows = 3,
    ...textareaProps
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
      <BaseField.Control
        {...({ ...textareaProps, rows } as ControlProps)}
        ref={ref}
        render={<textarea />}
        className={cn(styles.textarea, textareaClassName)}
        style={textareaStyle}
      />
      {helpText != null && <FieldDescription>{helpText}</FieldDescription>}
      <FieldError match={hasError ? true : undefined}>{hasError ? error : undefined}</FieldError>
    </Field>
  );
});
