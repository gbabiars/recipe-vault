"use client";

import * as React from "react";
import { Radio as BaseRadio } from "@base-ui/react/radio";
import {
  RadioGroup as BaseRadioGroup,
  type RadioGroupProps as BaseRadioGroupProps,
} from "@base-ui/react/radio-group";
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

export type RadioGroupItemProps = Omit<
  React.ComponentPropsWithoutRef<typeof BaseRadio.Root>,
  "className" | "style" | "value"
> & {
  label: React.ReactNode;
  value: string;
  helpText?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  radioClassName?: string;
  radioStyle?: React.CSSProperties;
};
export type RadioGroupProps = Omit<BaseRadioGroupProps<string>, "className" | "style"> & {
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

export const RadioGroupItem = React.forwardRef<HTMLElement, RadioGroupItemProps>(
  function RadioGroupItem(
    { label, helpText, className, style, radioClassName, radioStyle, disabled, ...radioProps },
    ref,
  ) {
    return (
      <FieldItem disabled={disabled} className={className} style={style}>
        <FieldLabel>
          <BaseRadio.Root
            {...radioProps}
            disabled={disabled}
            ref={ref}
            className={cn(styles.control, styles.radio, radioClassName)}
            style={radioStyle}
          >
            <BaseRadio.Indicator className={styles.dot} />
          </BaseRadio.Root>
          {label}
        </FieldLabel>
        {helpText != null && <FieldDescription>{helpText}</FieldDescription>}
      </FieldItem>
    );
  },
);

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
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
      <FieldsetLegend id={legendId} className={visuallyHiddenLabel ? "visually-hidden" : undefined}>
        {label}
      </FieldsetLegend>
      <BaseRadioGroup
        {...groupProps}
        name={name}
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
      </BaseRadioGroup>
    </Fieldset>
  );
});
