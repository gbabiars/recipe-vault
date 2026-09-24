import * as React from "react";
import { cn } from "cn";

import type { LayoutAlign, LayoutGap, LayoutJustify } from "./layout";
import layoutStyles from "./layout.module.css";
import styles from "./inline.module.css";

export type InlineGap = LayoutGap;
export type InlineAlign = LayoutAlign | "baseline";
export type InlineJustify = LayoutJustify;

type InlineElement = keyof React.JSX.IntrinsicElements;

export type InlineProps<T extends InlineElement = "div"> = {
  as?: T;
  gap?: InlineGap;
  rowGap?: InlineGap;
  align?: InlineAlign;
  justify?: InlineJustify;
  wrap?: boolean;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "gap" | "rowGap" | "align" | "justify" | "wrap">;

type InlineComponent = <T extends InlineElement = "div">(
  props: InlineProps<T> & { ref?: React.Ref<React.ComponentRef<T>> },
) => React.ReactElement | null;

const InlineImpl = <T extends InlineElement = "div">(
  {
    as,
    className,
    gap = "0",
    rowGap,
    align = "start",
    justify = "start",
    wrap = true,
    ...props
  }: InlineProps<T>,
  ref: React.ForwardedRef<React.ComponentRef<T>>,
) => {
  const Component = (as ?? "div") as React.ElementType;

  return React.createElement(Component, {
    ...props,
    ref,
    className: cn(layoutStyles.layout, styles.inline, className),
    "data-gap": gap,
    "data-row-gap": rowGap,
    "data-align": align,
    "data-justify": justify,
    "data-wrap": wrap,
  });
};

export const Inline = React.forwardRef(InlineImpl) as InlineComponent;
