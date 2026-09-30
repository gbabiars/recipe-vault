import { AppNavigation } from "./app-navigation";
import styles from "./app-sidebar.module.css";

type AppSidebarProps = {
  pathname: string;
  userName: string;
  onSignOut: () => void | Promise<void>;
};

export function AppSidebar({ pathname, userName, onSignOut }: AppSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <AppNavigation pathname={pathname} userName={userName} onSignOut={onSignOut} />
    </aside>
  );
}
