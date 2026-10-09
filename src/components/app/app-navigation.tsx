import Link from "next/link";
import { BookOpen, ChevronDown, PanelLeftClose, PanelLeftOpen, Tags } from "lucide-react";
import { Avatar } from "../ui/avatar";
import { IconButton } from "../ui/button";
import { Tooltip } from "../ui/tooltip";
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
  userImageUrl?: string | null;
  onSignOut: () => void | Promise<void>;
  onSelect?: () => void;
  showBrand?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function AppNavigation({
  pathname,
  userName,
  userImageUrl,
  onSignOut,
  onSelect,
  showBrand = true,
  collapsed = false,
  onToggleCollapse,
}: AppNavigationProps) {
  const recipesActive = pathname === "/recipes" || pathname.startsWith("/recipes/");
  const tagsActive = pathname === "/tags" || pathname.startsWith("/tags/");
  const settingsActive = pathname === "/settings" || pathname.startsWith("/settings/");
  const accountMenuTriggerClassName = settingsActive
    ? `${styles.accountMenuTrigger} ${styles.active}`
    : styles.accountMenuTrigger;

  return (
    <>
      {onToggleCollapse ? (
        <div className={styles.navigationHeader}>
          {!collapsed && showBrand ? <AppBrand onClick={onSelect} /> : null}
          <Tooltip
            trigger={
              <IconButton
                className={styles.collapseButton}
                icon={collapsed ? PanelLeftOpen : PanelLeftClose}
                label={collapsed ? "Expand navigation" : "Collapse navigation"}
                size="large"
                variant="subtle"
                onClick={onToggleCollapse}
              />
            }
            content={collapsed ? "Expand navigation" : "Collapse navigation"}
            side="right"
          />
        </div>
      ) : showBrand ? (
        <AppBrand onClick={onSelect} />
      ) : null}
      <nav className={styles.nav} aria-label="Primary">
        <AppNavLink
          href="/recipes"
          icon={BookOpen}
          active={recipesActive}
          current={recipesActive}
          collapsed={collapsed}
          onClick={onSelect}
        >
          Recipes
        </AppNavLink>
        <AppNavLink
          href="/tags"
          icon={Tags}
          active={tagsActive}
          current={tagsActive}
          collapsed={collapsed}
          onClick={onSelect}
        >
          Tags
        </AppNavLink>
      </nav>
      <div className={styles.footer}>
        <DropdownMenu>
          {collapsed ? (
            <Tooltip
              trigger={
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className={accountMenuTriggerClassName}
                      aria-label={userName}
                    >
                      <Avatar
                        name={userName}
                        imageUrl={userImageUrl}
                        size="small"
                        aria-hidden="true"
                      />
                      <span className={styles.visuallyHidden}>{userName}</span>
                    </button>
                  }
                />
              }
              content={userName}
              side="right"
            />
          ) : (
            <DropdownMenuTrigger
              render={
                <button type="button" className={accountMenuTriggerClassName} aria-label={userName}>
                  <Avatar name={userName} imageUrl={userImageUrl} size="small" aria-hidden="true" />
                  <span className={styles.accountName}>{userName}</span>
                  <ChevronDown aria-hidden="true" size={16} />
                </button>
              }
            />
          )}
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
