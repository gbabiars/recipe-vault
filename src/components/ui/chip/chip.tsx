import type { ComponentPropsWithoutRef } from "react";
import { cn } from "cn";
import { Text } from "../text";

import styles from "./chip.module.css";

export type ChipProps = ComponentPropsWithoutRef<"span">;

export function Chip({ children, className, ...props }: ChipProps) {
  return (
    <span {...props} className={cn(styles.chip, className)}>
      <Text>{children}</Text>
    </span>
  );
}
