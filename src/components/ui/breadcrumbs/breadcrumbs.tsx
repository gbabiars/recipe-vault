"use client";

import * as React from "react";
import { cn } from "cn";

import { useLinkRenderer } from "../link-renderer";
import styles from "./breadcrumbs.module.css";

type BreadcrumbsProps = React.HTMLAttributes<HTMLElement> & {
  trailingSeparator?: boolean;
};

type BreadcrumbsItemProps = Omit<React.LiHTMLAttributes<HTMLLIElement>, "children"> &
  (
    | { current: true; href?: never; children: string | number }
    | { current?: false; href: string; children: React.ReactNode }
  );

export function Breadcrumbs({
  children,
  className,
  trailingSeparator = false,
  ...props
}: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumbs" className={cn(styles.breadcrumbs, className)} {...props}>
      <ol className={styles.list} data-trailing-separator={trailingSeparator ? "" : undefined}>
        {children}
      </ol>
    </nav>
  );
}

export function BreadcrumbsItem({
  current = false,
  href,
  children,
  className,
  ...props
}: BreadcrumbsItemProps) {
  const link = useLinkRenderer();

  return (
    <li className={cn(styles.item, className)} {...props}>
      {current ? (
        <span aria-current="page">{children}</span>
      ) : (
        React.cloneElement(link, { href, children })
      )}
    </li>
  );
}
