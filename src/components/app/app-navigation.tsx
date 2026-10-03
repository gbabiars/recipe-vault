import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Avatar } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuPopup,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { AppBrand } from "./app-brand";
import { AppNavLink } from "./app-nav-link";
import styles from "./app-sidebar.module.css";

type AppNavigationProps = {
  pathname: string;
  userName: string;
  onSignOut: () => void | Promise<void>;
  onSelect?: () => void;
};

export function AppNavigation({ pathname, userName, onSignOut, onSelect }: AppNavigationProps) {
  const recipesActive = pathname === "/recipes" || pathname.startsWith("/recipes/");
  const tagsActive = pathname === "/tags" || pathname.startsWith("/tags/");
  const settingsActive = pathname === "/settings" || pathname.startsWith("/user-profile");
  const accountMenuTriggerClassName = settingsActive
    ? `${styles.accountMenuTrigger} ${styles.active}`
    : styles.accountMenuTrigger;

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
        <AppNavLink href="/tags" active={tagsActive} current={tagsActive} onClick={onSelect}>
          Tags
        </AppNavLink>
      </nav>
      <div className={styles.footer}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button type="button" className={accountMenuTriggerClassName}>
                <Avatar name={userName} size="small" aria-hidden="true" />
                <span className={styles.accountName}>{userName}</span>
                <ChevronDown aria-hidden="true" size={16} />
              </button>
            }
          />
          <DropdownMenuPopup side="top" align="start" className={styles.accountMenuPopup}>
            <DropdownMenuLinkItem
              render={
                <Link
                  href="/settings"
                  aria-current={pathname === "/settings" ? "page" : undefined}
                  onClick={onSelect}
                />
              }
            >
              Settings
            </DropdownMenuLinkItem>
            <DropdownMenuItem
              onClick={() => {
                onSelect?.();
                void onSignOut();
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuPopup>
        </DropdownMenu>
      </div>
    </>
  );
}
