import Link from "next/link";
import styles from "./app-sidebar.module.css";

type AppNavLinkProps = {
  href: string;
  children: string;
  active?: boolean;
  current?: boolean;
};

export function AppNavLink({ href, children, active = false, current = false }: AppNavLinkProps) {
  return (
    <Link
      href={href}
      className={active ? `${styles.link} ${styles.active}` : styles.link}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
