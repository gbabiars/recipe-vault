import * as React from "react";
import { cn } from "cn";

import styles from "./stack.module.css";

export type StackGap =
  | "0"
  | "025"
  | "050"
  | "075"
  | "100"
  | "150"
  | "200"
  | "250"
  | "300"
  | "400"
  | "500"
  | "600"
  | "800"
  | "1000"
  | "1200";

export type StackAlign = "start" | "center" | "end" | "stretch";
export type StackJustify = "start" | "center" | "end" | "between" | "around" | "evenly";

type StackElement = keyof React.JSX.IntrinsicElements;

export type StackProps<T extends StackElement = "div"> = {
  as?: T;
  gap?: StackGap;
  align?: StackAlign;
  justify?: StackJustify;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "gap" | "align" | "justify">;

type StackComponent = <T extends StackElement = "div">(
  props: StackProps<T> & { ref?: React.Ref<React.ComponentRef<T>> },
) => React.ReactElement | null;

const StackImpl = <T extends StackElement = "div">(
  { as, className, gap = "0", align = "stretch", justify = "start", ...props }: StackProps<T>,
  ref: React.ForwardedRef<React.ComponentRef<T>>,
) => {
  const Component = (as ?? "div") as React.ElementType;

  return React.createElement(Component, {
    ...props,
    ref,
    className: cn(styles.stack, className),
    "data-gap": gap,
    "data-align": align,
    "data-justify": justify,
  });
};

export const Stack = React.forwardRef(StackImpl) as StackComponent;
