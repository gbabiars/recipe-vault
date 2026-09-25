import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "cn";

import { Heading } from "../heading";
import { Text } from "../text";
import styles from "./page-layout.module.css";

type PageLayoutProps = HTMLAttributes<HTMLDivElement>;

type PageHeaderProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title: ReactNode;
  overline?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
};

type PageContentProps = HTMLAttributes<HTMLDivElement>;

export function PageLayout({ className, ...props }: PageLayoutProps) {
  return <div className={cn(styles.layout, className)} {...props} />;
}

export function PageHeader({
  title,
  overline,
  description,
  actions,
  className,
  ...props
}: PageHeaderProps) {
  return (
    <header className={cn(styles.header, className)} {...props}>
      {overline && <div>{overline}</div>}
      <div className={styles.headingRow}>
        <div className={styles.intro}>
          <Heading as="h1" level={2}>
            {title}
          </Heading>
          {description && (
            <Text as="p" size="medium">
              {description}
            </Text>
          )}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </header>
  );
}

export function PageContent({ className, ...props }: PageContentProps) {
  return <div className={cn(styles.content, className)} {...props} />;
}
