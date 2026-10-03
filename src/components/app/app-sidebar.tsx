import { AppNavigation } from "./app-navigation";
import styles from "./app-sidebar.module.css";

type AppSidebarProps = {
  pathname: string;
  userName: string;
  userImageUrl?: string | null;
  onSignOut: () => void | Promise<void>;
};

export function AppSidebar({ pathname, userName, userImageUrl, onSignOut }: AppSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <AppNavigation
        pathname={pathname}
        userName={userName}
        userImageUrl={userImageUrl}
        onSignOut={onSignOut}
      />
    </aside>
  );
}
