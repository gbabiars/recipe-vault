"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppNavigation } from "./app-navigation";
import styles from "./app-sidebar.module.css";

type AppMobileNavigationProps = {
  pathname: string;
  userName: string;
  onSignOut: () => void | Promise<void>;
};

export function AppMobileNavigation({ pathname, userName, onSignOut }: AppMobileNavigationProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  return (
    <div className={styles.mobileNavigation}>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <header className={styles.mobileHeader}>
          <Dialog.Trigger className={styles.iconButton} aria-label="Open menu">
            <Menu aria-hidden="true" size={24} />
          </Dialog.Trigger>
          <span className={styles.mobileTitle}>Recipe Vault</span>
        </header>
        <Dialog.Portal>
          <Dialog.Backdrop className={styles.backdrop} />
          <Dialog.Popup className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <Dialog.Title className={styles.drawerTitle}>Menu</Dialog.Title>
              <Dialog.Close className={styles.iconButton} aria-label="Close menu">
                <X aria-hidden="true" size={24} />
              </Dialog.Close>
            </div>
            <AppNavigation
              pathname={pathname}
              userName={userName}
              onSelect={() => setOpen(false)}
              onSignOut={onSignOut}
            />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
