import * as React from "react";
import { cn } from "cn";

import type { LayoutSpace } from "../layout";
import layoutStyles from "../layout.module.css";

export type BoxPadding = LayoutSpace;

type BoxElement = keyof React.JSX.IntrinsicElements;

export type BoxProps<T extends BoxElement = "div"> = {
  as?: T;
  padding?: BoxPadding;
  paddingInline?: BoxPadding;
  paddingBlock?: BoxPadding;
  paddingInlineStart?: BoxPadding;
  paddingInlineEnd?: BoxPadding;
  paddingBlockStart?: BoxPadding;
  paddingBlockEnd?: BoxPadding;
} & Omit<
  React.ComponentPropsWithoutRef<T>,
  | "as"
  | "padding"
  | "paddingInline"
  | "paddingBlock"
  | "paddingInlineStart"
  | "paddingInlineEnd"
  | "paddingBlockStart"
  | "paddingBlockEnd"
>;

type BoxComponent = <T extends BoxElement = "div">(
  props: BoxProps<T> & { ref?: React.Ref<React.ComponentRef<T>> },
) => React.ReactElement | null;

const BoxImpl = <T extends BoxElement = "div">(
  {
    as,
    className,
    padding,
    paddingInline,
    paddingBlock,
    paddingInlineStart,
    paddingInlineEnd,
    paddingBlockStart,
    paddingBlockEnd,
    ...props
  }: BoxProps<T>,
  ref: React.ForwardedRef<React.ComponentRef<T>>,
) => {
  const Component = (as ?? "div") as React.ElementType;

  return React.createElement(Component, {
    ...props,
    ref,
    className: cn(layoutStyles.layout, className),
    "data-padding": padding,
    "data-padding-inline": paddingInline,
    "data-padding-block": paddingBlock,
    "data-padding-inline-start": paddingInlineStart,
    "data-padding-inline-end": paddingInlineEnd,
    "data-padding-block-start": paddingBlockStart,
    "data-padding-block-end": paddingBlockEnd,
  });
};

export const Box = React.forwardRef(BoxImpl) as BoxComponent;
