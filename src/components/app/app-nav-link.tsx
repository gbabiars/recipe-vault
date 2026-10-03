import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import styles from "./app-sidebar.module.css";

type AppNavLinkProps = {
  href: string;
  children: string;
  icon?: LucideIcon;
  active?: boolean;
  current?: boolean;
  onClick?: () => void;
};

export function AppNavLink({
  href,
  children,
  icon: Icon,
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
      {Icon ? <Icon aria-hidden="true" focusable="false" size={18} /> : null}
      {children}
    </Link>
  );
}
