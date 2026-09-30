"use client";

import * as React from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "cn";

import { Card } from "../card/card";
import { Heading } from "../heading/heading";
import { Text } from "../text/text";
import styles from "./alert.module.css";

export type AlertVariant = "default" | "danger" | "warning" | "success";

export type AlertProps = Omit<React.ComponentPropsWithoutRef<"section">, "title"> & {
  description: React.ReactNode;
  title: string;
  variant?: AlertVariant;
};

const icons = {
  default: Info,
  danger: CircleAlert,
  warning: TriangleAlert,
  success: CircleCheck,
} satisfies Record<AlertVariant, React.ComponentType<React.SVGProps<SVGSVGElement>>>;

const AlertImpl = (
  { className, description, title, variant = "default", ...props }: AlertProps,
  ref: React.ForwardedRef<HTMLElement>,
) => {
  const titleId = React.useId();
  const Icon = icons[variant];

  return (
    <Card
      {...props}
      aria-labelledby={titleId}
      as="section"
      className={cn(styles.alert, className)}
      data-alert-variant={variant}
      padding="medium"
      ref={ref}
      variant="subtle"
    >
      <Icon aria-hidden="true" className={styles.icon} focusable="false" />
      <div className={styles.content}>
        <Heading id={titleId} level={5}>
          {title}
        </Heading>
        <Text as="p" appearance="secondary">
          {description}
        </Text>
      </div>
    </Card>
  );
};

export const Alert = React.forwardRef<HTMLElement, AlertProps>(AlertImpl);
