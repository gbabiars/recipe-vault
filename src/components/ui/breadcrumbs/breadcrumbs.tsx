import type { HTMLAttributes, LiHTMLAttributes, ReactElement } from "react";
import { cn } from "cn";

import styles from "./breadcrumbs.module.css";

type BreadcrumbsProps = HTMLAttributes<HTMLElement> & {
  trailingSeparator?: boolean;
};

type BreadcrumbsItemProps = Omit<LiHTMLAttributes<HTMLLIElement>, "children"> &
  ({ current: true; children: string | number } | { current?: false; children: ReactElement });

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
  children,
  className,
  ...props
}: BreadcrumbsItemProps) {
  return (
    <li className={cn(styles.item, className)} {...props}>
      {current ? <span aria-current="page">{children}</span> : children}
    </li>
  );
}
