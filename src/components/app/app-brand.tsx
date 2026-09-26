import Link from "next/link";
import styles from "./app-sidebar.module.css";

export function AppBrand({ onClick }: { onClick?: () => void } = {}) {
  return (
    <Link href="/recipes" className={styles.brand} onClick={onClick}>
      Recipe Vault
    </Link>
  );
}
