import { AppBrand } from "./app-brand";
import { AppNavLink } from "./app-nav-link";
import styles from "./app-sidebar.module.css";

type AppSidebarProps = {
  pathname: string;
  onSignOut: () => void | Promise<void>;
};

export function AppSidebar({ pathname, onSignOut }: AppSidebarProps) {
  const recipesActive = pathname === "/recipes" || pathname.startsWith("/recipes/");
  const settingsActive =
    pathname === "/settings" ||
    pathname.startsWith("/user-profile") ||
    pathname.startsWith("/mcp-keys");

  return (
    <aside className={styles.sidebar}>
      <AppBrand />
      <nav className={styles.nav} aria-label="Primary">
        <AppNavLink href="/recipes" active={recipesActive} current={recipesActive}>
          Recipes
        </AppNavLink>
        <AppNavLink href="/settings" active={settingsActive} current={pathname === "/settings"}>
          Settings
        </AppNavLink>
      </nav>
      <div className={styles.footer}>
        <button type="button" className={styles.signOut} onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
