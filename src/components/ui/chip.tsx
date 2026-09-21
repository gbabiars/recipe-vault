import type { ComponentPropsWithoutRef } from "react";
import { cn } from "cn";

import styles from "./chip.module.css";

export type ChipProps = ComponentPropsWithoutRef<"span">;

export function Chip({ className, ...props }: ChipProps) {
  return <span {...props} className={cn(styles.chip, className)} />;
}
