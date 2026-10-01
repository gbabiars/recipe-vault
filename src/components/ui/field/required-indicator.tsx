import styles from "./required-indicator.module.css";

type RequiredIndicatorProps = {
  disabled?: boolean;
};

export function RequiredIndicator({ disabled = false }: RequiredIndicatorProps) {
  return (
    <span
      aria-hidden="true"
      className={styles.requiredIndicator}
      data-disabled={disabled || undefined}
    >
      *
    </span>
  );
}
