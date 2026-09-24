"use client";

import * as React from "react";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { CheckboxGroup as BaseCheckboxGroup } from "@base-ui/react/checkbox-group";
import { cn } from "cn";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldItem,
  FieldLabel,
  Fieldset,
  FieldsetLegend,
} from "./field";
import styles from "./choice.module.css";

type BaseCheckboxProps = React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root>;
export type CheckboxInputProps = Omit<BaseCheckboxProps, "className" | "style" | "parent"> & {
  label: React.ReactNode;
  helpText?: React.ReactNode;
  error?: React.ReactNode;
  invalid?: boolean;
  visuallyHiddenLabel?: boolean;
  className?: string;
  style?: React.CSSProperties;
  checkboxClassName?: string;
  checkboxStyle?: React.CSSProperties;
};
export type CheckboxGroupItemProps = Omit<
  BaseCheckboxProps,
  "className" | "style" | "name" | "parent" | "value"
> & {
  label: React.ReactNode;
  helpText?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  checkboxClassName?: string;
  checkboxStyle?: React.CSSProperties;
} & ({ parent: true; value?: never } | { parent?: false; value: string });
export type CheckboxGroupProps = Omit<
  React.ComponentPropsWithoutRef<typeof BaseCheckboxGroup>,
  "className" | "style"
> & {
  name?: string;
  label: React.ReactNode;
  helpText?: React.ReactNode;
  error?: React.ReactNode;
  invalid?: boolean;
  visuallyHiddenLabel?: boolean;
  className?: string;
  style?: React.CSSProperties;
  groupClassName?: string;
  groupStyle?: React.CSSProperties;
};

const CheckboxControl = React.forwardRef<HTMLElement, BaseCheckboxProps>(function CheckboxControl(
  { className, ...props },
  ref,
) {
  return (
    <BaseCheckbox.Root
      {...props}
      ref={ref}
      className={cn(styles.control, styles.checkbox, className)}
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

export const CheckboxInput = React.forwardRef<HTMLElement, CheckboxInputProps>(
  function CheckboxInput(
    {
      label,
      helpText,
      error,
      invalid,
      visuallyHiddenLabel = false,
      className,
      style,
      checkboxClassName,
      checkboxStyle,
      name,
      disabled,
      ...checkboxProps
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
        layout="choice"
        className={className}
        style={style}
      >
        <FieldLabel className={visuallyHiddenLabel ? "visually-hidden" : undefined}>
          <CheckboxControl
            {...checkboxProps}
            ref={ref}
            className={checkboxClassName}
            style={checkboxStyle}
          />
          {label}
        </FieldLabel>
        {helpText != null && <FieldDescription>{helpText}</FieldDescription>}
        <FieldError match={hasError ? true : undefined}>{hasError ? error : undefined}</FieldError>
      </Field>
    );
  },
);

export const CheckboxGroupItem = React.forwardRef<HTMLElement, CheckboxGroupItemProps>(
  function CheckboxGroupItem(
    {
      label,
      helpText,
      className,
      style,
      checkboxClassName,
      checkboxStyle,
      disabled,
      ...checkboxProps
    },
    ref,
  ) {
    return (
      <FieldItem disabled={disabled} className={className} style={style}>
        <FieldLabel>
          <CheckboxControl
            {...checkboxProps}
            disabled={disabled}
            ref={ref}
            className={checkboxClassName}
            style={checkboxStyle}
          />
          {label}
        </FieldLabel>
        {helpText != null && <FieldDescription>{helpText}</FieldDescription>}
      </FieldItem>
    );
  },
);

export const CheckboxGroup = React.forwardRef<HTMLDivElement, CheckboxGroupProps>(
  function CheckboxGroup(
    {
      label,
      helpText,
      error,
      invalid,
      visuallyHiddenLabel = false,
      className,
      style,
      groupClassName,
      groupStyle,
      name,
      disabled,
      children,
      ...groupProps
    },
    ref,
  ) {
    const legendId = React.useId();
    const hasError =
      error != null && error !== false && (typeof error !== "string" || error.trim() !== "");

    return (
      <Fieldset className={className} style={style} disabled={disabled}>
        <FieldsetLegend
          id={legendId}
          className={visuallyHiddenLabel ? "visually-hidden" : undefined}
        >
          {label}
        </FieldsetLegend>
        <BaseCheckboxGroup
          {...groupProps}
          disabled={disabled}
          aria-labelledby={legendId}
          ref={ref}
          className={cn(styles.group, groupClassName)}
          style={groupStyle}
        >
          <Field name={name} disabled={disabled} invalid={hasError || invalid}>
            {children}
            {helpText != null && <FieldDescription>{helpText}</FieldDescription>}
            <FieldError match={hasError ? true : undefined}>
              {hasError ? error : undefined}
            </FieldError>
          </Field>
        </BaseCheckboxGroup>
      </Fieldset>
    );
  },
);
