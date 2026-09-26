import { AppBrand } from "./app-brand";
import { AppNavLink } from "./app-nav-link";
import styles from "./app-sidebar.module.css";

type AppNavigationProps = {
  pathname: string;
  onSignOut: () => void | Promise<void>;
  onSelect?: () => void;
};

export function AppNavigation({ pathname, onSignOut, onSelect }: AppNavigationProps) {
  const recipesActive = pathname === "/recipes" || pathname.startsWith("/recipes/");
  const settingsActive = pathname === "/settings" || pathname.startsWith("/user-profile");

  return (
    <>
      <AppBrand onClick={onSelect} />
      <nav className={styles.nav} aria-label="Primary">
        <AppNavLink
          href="/recipes"
          active={recipesActive}
          current={recipesActive}
          onClick={onSelect}
        >
          Recipes
        </AppNavLink>
        <AppNavLink
          href="/settings"
          active={settingsActive}
          current={pathname === "/settings"}
          onClick={onSelect}
        >
          Settings
        </AppNavLink>
      </nav>
      <div className={styles.footer}>
        <button
          type="button"
          className={styles.signOut}
          onClick={() => {
            onSelect?.();
            void onSignOut();
          }}
        >
          Sign out
        </button>
      </div>
    </>
  );
}
