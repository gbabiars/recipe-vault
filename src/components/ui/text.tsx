import * as React from "react";

import styles from "./text.module.css";

export type TextSize = "small" | "medium" | "large";

type TextElement = keyof React.JSX.IntrinsicElements;

export type TextProps<T extends TextElement = "span"> = {
  as?: T;
  size?: TextSize;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "size">;

type TextComponent = <T extends TextElement = "span">(
  props: TextProps<T> & { ref?: React.Ref<React.ComponentRef<T>> },
) => React.ReactElement | null;

const TextImpl = <T extends TextElement = "span">(
  { as, className, size = "medium", ...props }: TextProps<T>,
  ref: React.ForwardedRef<React.ComponentRef<T>>,
) => {
  const Component = (as ?? "span") as React.ElementType;

  return React.createElement(Component, {
    ...props,
    ref,
    className: [styles.text, className].filter(Boolean).join(" "),
    "data-size": size,
  });
};

export const Text = React.forwardRef(TextImpl) as TextComponent;
