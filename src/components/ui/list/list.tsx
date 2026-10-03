"use client";

import * as React from "react";
import { cn } from "cn";

import { useLinkRenderer } from "../link-renderer";
import styles from "./list.module.css";

export type ListProps = React.ComponentPropsWithRef<"ul">;

export const List = React.forwardRef<HTMLUListElement, ListProps>(function List(
  { className, ...props },
  ref,
) {
  return <ul {...props} className={cn(styles.list, className)} ref={ref} />;
});

export type ListItemProps = Omit<React.ComponentPropsWithRef<"li">, "title"> & {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href?: string;
};

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

function shouldSkipRowActivation(event: React.MouseEvent<HTMLLIElement>) {
  if (event.defaultPrevented || !(event.target instanceof Element)) return true;
  if (event.target.closest(interactiveTargetSelector)) return true;

  const selection = window.getSelection();
  return selection !== null && !selection.isCollapsed && selection.toString().length > 0;
}

export const ListItem = React.forwardRef<HTMLLIElement, ListItemProps>(function ListItem(
  { className, description, href, icon: Icon, onAuxClick, onClick, title, ...props },
  ref,
) {
  const link = useLinkRenderer();
  const titleLinkRef = React.useRef<HTMLAnchorElement>(null);

  function activateTitle(event: React.MouseEvent<HTMLLIElement>) {
    const titleLink = titleLinkRef.current;
    if (!titleLink || shouldSkipRowActivation(event)) return;

    if (event.ctrlKey || event.metaKey || event.button === 1) {
      window.open(titleLink.href, "_blank", "noopener");
      return;
    }

    titleLink.click();
  }

  return (
    <li
      {...props}
      className={cn(styles.item, className)}
      data-interactive={href === undefined ? undefined : ""}
      onAuxClick={(event) => {
        onAuxClick?.(event);
        if (href !== undefined) activateTitle(event);
      }}
      onClick={(event) => {
        onClick?.(event);
        if (href !== undefined) activateTitle(event);
      }}
      ref={ref}
    >
      {Icon && <Icon aria-hidden="true" className={styles.icon} focusable="false" />}
      <div className={styles.content}>
        {href === undefined ? (
          <span className={styles.title}>{title}</span>
        ) : (
          React.cloneElement(link, {
            href,
            ref: titleLinkRef,
            className: cn(styles.title, styles.titleLink, link.props.className),
            children: title,
          })
        )}
        {description !== undefined && <span className={styles.description}>{description}</span>}
      </div>
    </li>
  );
});
