"use client";

import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";

import styles from "./button.module.css";

export type ButtonLinkProps = useRender.ComponentProps<"a">;

export const ButtonLink = React.forwardRef<HTMLAnchorElement, Omit<ButtonLinkProps, "ref">>(
  function ButtonLink({ className, render, ...props }, ref) {
    return useRender({
      defaultTagName: "a",
      render,
      ref,
      props: mergeProps<"a">({ className: styles.button }, { ...props, className }),
    });
  },
);
