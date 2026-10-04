"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppNavigation } from "./app-navigation";
import { Heading } from "@/components/ui/heading";
import { Inline } from "@/components/ui/inline";
import styles from "./app-sidebar.module.css";

type AppMobileNavigationProps = {
  pathname: string;
  userName: string;
  userImageUrl?: string | null;
  onSignOut: () => void | Promise<void>;
};

export function AppMobileNavigation({
  pathname,
  userName,
  userImageUrl,
  onSignOut,
}: AppMobileNavigationProps) {
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
          <Heading level={3} as="h1">
            Recipe Vault
          </Heading>
        </header>
        <Dialog.Portal>
          <Dialog.Backdrop className={styles.backdrop} />
          <Dialog.Popup className={styles.drawer}>
            <Inline align="center" justify="between">
              <Dialog.Title
                render={
                  <Heading level={4} as="h2">
                    Menu
                  </Heading>
                }
              />
              <Dialog.Close className={styles.iconButton} aria-label="Close menu">
                <X aria-hidden="true" size={24} />
              </Dialog.Close>
            </Inline>
            <AppNavigation
              pathname={pathname}
              userName={userName}
              userImageUrl={userImageUrl}
              showBrand={false}
              onSelect={() => setOpen(false)}
              onSignOut={onSignOut}
            />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
