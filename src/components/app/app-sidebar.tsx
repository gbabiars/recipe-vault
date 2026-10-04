import { AppNavigation } from "./app-navigation";
import styles from "./app-sidebar.module.css";

type AppSidebarProps = {
  pathname: string;
  userName: string;
  userImageUrl?: string | null;
  onSignOut: () => void | Promise<void>;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function AppSidebar({
  pathname,
  userName,
  userImageUrl,
  onSignOut,
  collapsed = false,
  onToggleCollapse,
}: AppSidebarProps) {
  return (
    <aside className={styles.sidebar} data-collapsed={collapsed}>
      <AppNavigation
        pathname={pathname}
        userName={userName}
        userImageUrl={userImageUrl}
        onSignOut={onSignOut}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
      />
    </aside>
  );
}
