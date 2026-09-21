import * as React from "react";
import { cn } from "cn";

import styles from "./card.module.css";

export type CardPadding = "default" | "none";

type CardElement = keyof React.JSX.IntrinsicElements;

export type CardProps<T extends CardElement = "div"> = {
  as?: T;
  padding?: CardPadding;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "padding">;

type CardComponent = <T extends CardElement = "div">(
  props: CardProps<T> & { ref?: React.Ref<React.ComponentRef<T>> },
) => React.ReactElement | null;

const CardImpl = <T extends CardElement = "div">(
  { as, className, padding = "default", ...props }: CardProps<T>,
  ref: React.ForwardedRef<React.ComponentRef<T>>,
) => {
  const Component = (as ?? "div") as React.ElementType;

  return React.createElement(Component, {
    ...props,
    ref,
    className: cn(styles.card, className),
    "data-padding": padding,
  });
};

export const Card = React.forwardRef(CardImpl) as CardComponent;
