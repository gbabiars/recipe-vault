import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "cn";

import { Heading } from "../heading";
import { Inline } from "../inline";
import { Stack } from "../stack";
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
    <Stack as="header" gap="050" className={className} {...props}>
      {overline && <div>{overline}</div>}
      <Inline gap="200" align="start" justify="between" wrap={false} className={styles.headingRow}>
        <Heading as="h1" level={2}>
          {title}
        </Heading>
        {actions && <Inline gap="100">{actions}</Inline>}
      </Inline>
      {description && (
        <Text as="p" size="medium">
          {description}
        </Text>
      )}
    </Stack>
  );
}

export function PageContent({ className, ...props }: PageContentProps) {
  return <div className={cn(styles.content, className)} {...props} />;
}
