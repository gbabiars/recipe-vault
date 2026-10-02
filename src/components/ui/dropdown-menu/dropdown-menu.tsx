"use client";

import * as React from "react";
import { Menu } from "@base-ui/react/menu";
import { cn } from "cn";

import styles from "./dropdown-menu.module.css";

export type DropdownMenuProps = React.ComponentPropsWithoutRef<typeof Menu.Root>;
export const DropdownMenu = Menu.Root;

export type DropdownMenuTriggerProps = React.ComponentPropsWithoutRef<typeof Menu.Trigger>;
export const DropdownMenuTrigger = Menu.Trigger;

type BasePopupProps = React.ComponentPropsWithoutRef<typeof Menu.Popup>;
type BasePositionerProps = React.ComponentPropsWithoutRef<typeof Menu.Positioner>;

export type DropdownMenuPopupProps = Omit<BasePopupProps, "className"> & {
  side?: BasePositionerProps["side"];
  align?: BasePositionerProps["align"];
  className?: BasePopupProps["className"];
};

export const DropdownMenuPopup = React.forwardRef<HTMLDivElement, DropdownMenuPopupProps>(
  function DropdownMenuPopup({ side = "bottom", align = "start", className, ...popupProps }, ref) {
    return (
      <Menu.Portal>
        <Menu.Positioner side={side} align={align} className={styles.positioner}>
          <Menu.Popup
            {...popupProps}
            ref={ref}
            className={mergeClassName(styles.popup, className)}
          />
        </Menu.Positioner>
      </Menu.Portal>
    );
  },
);

type BaseItemProps = React.ComponentPropsWithoutRef<typeof Menu.Item>;
type DropdownMenuItemIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;
export type DropdownMenuItemProps = Omit<BaseItemProps, "className" | "closeOnClick"> & {
  className?: BaseItemProps["className"];
  /** Decorative leading icon; the visible item text remains its accessible name. */
  icon?: DropdownMenuItemIcon;
};

export const DropdownMenuItem = React.forwardRef<HTMLElement, DropdownMenuItemProps>(
  function DropdownMenuItem({ className, icon: Icon, children, ...props }, ref) {
    return (
      <Menu.Item
        {...props}
        ref={ref}
        closeOnClick
        className={mergeClassName(styles.item, className)}
      >
        {Icon && <Icon className={styles.icon} aria-hidden="true" focusable={false} />}
        {children}
      </Menu.Item>
    );
  },
);

type BaseLinkItemProps = React.ComponentPropsWithoutRef<typeof Menu.LinkItem>;
export type DropdownMenuLinkItemProps = Omit<BaseLinkItemProps, "className" | "closeOnClick"> & {
  className?: BaseLinkItemProps["className"];
  /** Decorative leading icon; the visible item text remains its accessible name. */
  icon?: DropdownMenuItemIcon;
};

export const DropdownMenuLinkItem = React.forwardRef<Element, DropdownMenuLinkItemProps>(
  function DropdownMenuLinkItem({ className, icon: Icon, children, ...props }, ref) {
    return (
      <Menu.LinkItem
        {...props}
        ref={ref}
        closeOnClick
        className={mergeClassName(styles.item, className)}
      >
        {Icon && <Icon className={styles.icon} aria-hidden="true" focusable={false} />}
        {children}
      </Menu.LinkItem>
    );
  },
);

function mergeClassName<State>(
  baseClassName: string,
  className: string | ((state: State) => string | undefined) | undefined,
) {
  return typeof className === "function"
    ? (state: State) => cn(baseClassName, className(state))
    : cn(baseClassName, className);
}
