import { AppNavigation } from "./app-navigation";
import styles from "./app-sidebar.module.css";

type AppSidebarProps = {
  pathname: string;
  onSignOut: () => void | Promise<void>;
};

export function AppSidebar({ pathname, onSignOut }: AppSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <AppNavigation pathname={pathname} onSignOut={onSignOut} />
    </aside>
  );
}
