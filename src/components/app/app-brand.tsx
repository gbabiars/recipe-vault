import Link from "next/link";
import styles from "./app-sidebar.module.css";

export function AppBrand() {
  return (
    <Link href="/recipes" className={styles.brand}>
      Recipe Vault
    </Link>
  );
}
