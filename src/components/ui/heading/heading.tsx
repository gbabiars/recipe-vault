import * as React from "react";
import { cn } from "cn";

import styles from "./heading.module.css";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

type HeadingElement = keyof React.JSX.IntrinsicElements;

export type HeadingProps<T extends HeadingElement = "h1"> = {
  level?: HeadingLevel;
  as?: T;
} & Omit<React.ComponentPropsWithoutRef<T>, "level" | "as">;

type HeadingComponent = <T extends HeadingElement = "h1">(
  props: HeadingProps<T> & { ref?: React.Ref<React.ComponentRef<T>> },
) => React.ReactElement | null;

const HeadingImpl = <T extends HeadingElement = "h1">(
  { as, className, level = 1, ...props }: HeadingProps<T>,
  ref: React.ForwardedRef<React.ComponentRef<T>>,
) => {
  const Component = (as ?? `h${level}`) as React.ElementType;

  return React.createElement(Component, {
    ...props,
    ref,
    className: cn(styles.heading, className),
    "data-level": level,
  });
};

export const Heading = React.forwardRef(HeadingImpl) as HeadingComponent;
