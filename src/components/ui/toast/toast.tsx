"use client";

import * as React from "react";
import { Toast as BaseToast } from "@base-ui/react/toast";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";

import { IconButton } from "../button";
import { Heading } from "../heading";
import { Text } from "../text";
import styles from "./toast.module.css";

export type ToastVariant = "default" | "danger" | "success" | "warning";

export type ShowToastOptions = {
  title: string;
  description?: string;
  variant?: ToastVariant;
};

const icons = {
  default: Info,
  danger: CircleAlert,
  success: CircleCheck,
  warning: TriangleAlert,
} satisfies Record<ToastVariant, React.ComponentType<React.SVGProps<SVGSVGElement>>>;

export function useToast() {
  const manager = BaseToast.useToastManager();

  return {
    showToast({ title, description, variant = "default" }: ShowToastOptions) {
      return manager.add({
        title,
        description,
        type: variant,
        priority: variant === "danger" ? "high" : "low",
      });
    },
  };
}

function ToastList() {
  const { toasts } = BaseToast.useToastManager();

  return toasts.map((toast) => {
    const variant = (toast.type ?? "default") as ToastVariant;
    const Icon = icons[variant];

    return (
      <BaseToast.Root key={toast.id} toast={toast} className={styles.toast}>
        <BaseToast.Content className={styles.content}>
          <Icon aria-hidden="true" className={styles.icon} focusable="false" />
          <div className={styles.message}>
            <BaseToast.Title render={<Heading as="h2" level={6} />} />
            {toast.description && (
              <BaseToast.Description
                render={<Text as="p" appearance="secondary" size="medium" />}
              />
            )}
          </div>
          <BaseToast.Close
            render={
              <IconButton icon={X} label="Dismiss notification" size="small" variant="subtle" />
            }
          />
        </BaseToast.Content>
      </BaseToast.Root>
    );
  });
}

export function ToastProvider({ children }: React.PropsWithChildren) {
  return (
    <BaseToast.Provider>
      {children}
      <BaseToast.Portal>
        <BaseToast.Viewport className={styles.viewport}>
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}
