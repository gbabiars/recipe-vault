"use client";

import * as React from "react";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";

import styles from "./card.module.css";

export type CardPadding = "small" | "medium" | "large" | "none";

type CardElement = keyof React.JSX.IntrinsicElements;
type InteractiveCardElement =
  | "a"
  | "audio"
  | "button"
  | "details"
  | "embed"
  | "iframe"
  | "input"
  | "label"
  | "select"
  | "summary"
  | "textarea"
  | "video";
type NonInteractiveCardElement = Exclude<CardElement, InteractiveCardElement>;
type NextLink = typeof import("next/link").default;

export type CardRender =
  | React.ReactElement<React.AnchorHTMLAttributes<HTMLAnchorElement>, "a">
  | React.ReactElement<React.ButtonHTMLAttributes<HTMLButtonElement>, "button">
  | React.ReactElement<React.ComponentPropsWithoutRef<NextLink>, NextLink>;

type CardBaseProps<T extends CardElement> = {
  as?: T;
  padding?: CardPadding;
};

type StaticCardProps<T extends CardElement> = CardBaseProps<T> & {
  label?: never;
  render?: never;
} & Omit<React.ComponentPropsWithoutRef<T>, "as" | "label" | "padding" | "render">;

type InteractiveCardProps<T extends NonInteractiveCardElement> = CardBaseProps<T> & {
  label: string;
  render: CardRender;
} & Omit<
    React.ComponentPropsWithoutRef<T>,
    "as" | "label" | "onAuxClick" | "onClick" | "padding" | "render" | "role" | "tabIndex"
  >;

export type CardProps<T extends CardElement = "div"> =
  | StaticCardProps<T>
  | (T extends NonInteractiveCardElement ? InteractiveCardProps<T> : never);

type CardComponent = {
  <T extends CardElement = "div">(
    props: StaticCardProps<T> & { ref?: React.Ref<React.ComponentRef<T>> },
  ): React.ReactElement | null;
  <T extends NonInteractiveCardElement = "div">(
    props: InteractiveCardProps<T> & { ref?: React.Ref<React.ComponentRef<T>> },
  ): React.ReactElement | null;
};

type CardImplementationProps = {
  as?: CardElement;
  children?: React.ReactNode;
  className?: string;
  label?: string;
  padding?: CardPadding;
  render?: CardRender;
} & React.HTMLAttributes<HTMLElement>;

const interactiveCardElements = new Set<InteractiveCardElement>([
  "a",
  "audio",
  "button",
  "details",
  "embed",
  "iframe",
  "input",
  "label",
  "select",
  "summary",
  "textarea",
  "video",
]);

const interactiveTargetSelector = [
  "a[href]",
  "audio[controls]",
  "button",
  "details",
  "embed",
  "iframe",
  "input",
  "select",
  "summary",
  "textarea",
  "video[controls]",
  '[contenteditable]:not([contenteditable="false"])',
  "[role]",
  "[tabindex]",
].join(", ");

function isInteractiveTarget(target: EventTarget | null, card: HTMLElement) {
  if (!(target instanceof Element)) {
    return false;
  }

  const interactiveTarget = target.closest(interactiveTargetSelector);

  return interactiveTarget !== null && card.contains(interactiveTarget);
}

function hasTextSelection() {
  const selection = window.getSelection();

  return selection !== null && !selection.isCollapsed && selection.toString().length > 0;
}

function isSupportedRender(render: CardRender) {
  return typeof render.type !== "string" || render.type === "a" || render.type === "button";
}

const InteractiveCard = React.forwardRef<HTMLElement, CardImplementationProps>(
  function InteractiveCard(
    { as, children, className, label, padding = "medium", render, ...props },
    ref,
  ) {
    const primaryControlRef = React.useRef<HTMLAnchorElement | HTMLButtonElement>(null);
    const Component = (as ?? "div") as React.ElementType;

    if (label === undefined || render === undefined) {
      throw new Error("Interactive Card requires both render and label.");
    }

    if (!isSupportedRender(render)) {
      throw new Error("Card render must be an anchor, button, or Next.js Link.");
    }

    if (as !== undefined && interactiveCardElements.has(as as InteractiveCardElement)) {
      throw new Error("Interactive Card cannot use an interactive outer element.");
    }

    const primaryControl = useRender({
      defaultTagName: "button",
      render: React.cloneElement(render as React.ReactElement<Record<string, unknown>>, {
        "aria-label": label,
        "aria-labelledby": undefined,
      }),
      ref: primaryControlRef,
      props: {
        "aria-label": label,
        className: styles.primaryControl,
      },
    });

    const activatePrimaryControl = (event: React.MouseEvent<HTMLElement>) => {
      const card = event.currentTarget;
      const primaryControlElement = primaryControlRef.current;

      if (
        event.defaultPrevented ||
        primaryControlElement === null ||
        isInteractiveTarget(event.target, card) ||
        hasTextSelection()
      ) {
        return;
      }

      if (primaryControlElement instanceof HTMLButtonElement && primaryControlElement.disabled) {
        return;
      }

      if (
        primaryControlElement instanceof HTMLAnchorElement &&
        (event.ctrlKey || event.metaKey || event.button === 1)
      ) {
        window.open(primaryControlElement.href, "_blank", "noopener");
        return;
      }

      primaryControlElement.click();
    };

    return React.createElement(
      Component,
      {
        ...props,
        ref,
        className: cn(styles.card, className),
        "data-interactive": "",
        "data-padding": padding,
        onAuxClick: activatePrimaryControl,
        onClick: activatePrimaryControl,
        role: undefined,
        tabIndex: undefined,
      },
      primaryControl,
      children,
    );
  },
);

const CardImpl = (
  { as, className, padding = "medium", render, ...props }: CardImplementationProps,
  ref: React.ForwardedRef<HTMLElement>,
) => {
  const Component = (as ?? "div") as React.ElementType;

  if (render !== undefined) {
    return (
      <InteractiveCard
        {...props}
        as={as}
        className={className}
        padding={padding}
        ref={ref}
        render={render}
      />
    );
  }

  return React.createElement(Component, {
    ...props,
    ref,
    className: cn(styles.card, className),
    "data-padding": padding,
  });
};

export const Card = React.forwardRef(CardImpl) as unknown as CardComponent;
