import Link from "next/link";
import styles from "./app-sidebar.module.css";

type AppNavLinkProps = {
  href: string;
  children: string;
  active?: boolean;
  current?: boolean;
  onClick?: () => void;
};

export function AppNavLink({
  href,
  children,
  active = false,
  current = false,
  onClick,
}: AppNavLinkProps) {
  return (
    <Link
      href={href}
      className={active ? `${styles.link} ${styles.active}` : styles.link}
      aria-current={current ? "page" : undefined}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}
