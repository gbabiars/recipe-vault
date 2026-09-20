import type { ComponentPropsWithoutRef } from "react";

import styles from "./chip.module.css";

export type ChipProps = ComponentPropsWithoutRef<"span">;

export function Chip({ className, ...props }: ChipProps) {
  return <span {...props} className={[styles.chip, className].filter(Boolean).join(" ")} />;
}
