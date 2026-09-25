import * as React from "react";
import { cn } from "cn";

import styles from "./text.module.css";

export type TextSize = "small" | "medium" | "large";
export type TextAppearance = "primary" | "secondary" | "disabled" | "success" | "warning" | "error";

type TextElement = keyof React.JSX.IntrinsicElements;

export type TextProps<T extends TextElement = "span"> = {
  as?: T;
  size?: TextSize;
  appearance?: TextAppearance;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "size" | "appearance">;

type TextComponent = <T extends TextElement = "span">(
  props: TextProps<T> & { ref?: React.Ref<React.ComponentRef<T>> },
) => React.ReactElement | null;

const TextImpl = <T extends TextElement = "span">(
  { as, appearance, className, size = "medium", ...props }: TextProps<T>,
  ref: React.ForwardedRef<React.ComponentRef<T>>,
) => {
  const Component = (as ?? "span") as React.ElementType;

  return React.createElement(Component, {
    ...props,
    ref,
    className: cn(styles.text, className),
    "data-size": size,
    "data-appearance": appearance,
  });
};

export const Text = React.forwardRef(TextImpl) as TextComponent;
