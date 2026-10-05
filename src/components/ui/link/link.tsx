"use client";

import * as React from "react";
import { cn } from "cn";

import { useLinkRenderer } from "../link-renderer";
import styles from "./link.module.css";

type LinkAnchorProps = Omit<React.ComponentPropsWithoutRef<"a">, "children" | "href"> & {
  children?: React.ReactNode;
  href: string;
  render?: React.ReactElement;
};

type LinkButtonProps = Omit<React.ComponentPropsWithoutRef<"button">, "children" | "type"> & {
  children?: React.ReactNode;
  href?: never;
  render: React.ReactElement<React.ComponentPropsWithoutRef<"button">>;
  type?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
};

export type LinkProps = LinkAnchorProps | LinkButtonProps;

export const Link = React.forwardRef<HTMLElement, LinkProps>(function Link(props, ref) {
  const defaultLink = useLinkRenderer();
  const { className, children, render, ...attributes } = props;
  const isButton = render?.type === "button";
  const element = render ?? defaultLink;
  const elementClassName = (element as React.ReactElement<{ className?: string }>).props.className;
  const resolvedAttributes = {
    ...attributes,
    ...(isButton && !("type" in attributes) ? { type: "button" as const } : {}),
    className: cn(styles.link, className, elementClassName),
    children,
    ref,
  };

  return React.cloneElement(element, resolvedAttributes as never);
});
