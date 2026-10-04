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
  collapsed?: boolean;
};

export function AppNavLink({
  href,
  children,
  icon: Icon,
  active = false,
  current = false,
  onClick,
  collapsed = false,
}: AppNavLinkProps) {
  return (
    <Link
      href={href}
      className={`${active ? `${styles.link} ${styles.active}` : styles.link}${collapsed ? ` ${styles.collapsedLink}` : ""}`}
      aria-current={current ? "page" : undefined}
      onClick={onClick}
    >
      {Icon ? <Icon aria-hidden="true" focusable="false" size={18} /> : null}
      <span className={collapsed ? styles.visuallyHidden : undefined}>{children}</span>
    </Link>
  );
}
