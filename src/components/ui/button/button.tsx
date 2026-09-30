"use client";

import * as React from "react";
import { Button as BaseButton } from "@base-ui/react/button";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "cn";

import styles from "./button.module.css";

type BaseButtonProps = React.ComponentPropsWithoutRef<typeof BaseButton>;

export type ButtonVariant = "default" | "primary" | "subtle" | "danger";
export type ButtonSize = "small" | "medium" | "large";
export type ButtonIcon = React.ComponentType<React.SVGProps<SVGSVGElement>>;

type ButtonVisualProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Decorative leading icon. The visible label remains the accessible name. */
  icon?: ButtonIcon;
};

export type ButtonAnchorProps = Omit<React.ComponentPropsWithoutRef<"a">, "children" | "href"> & {
  children?: React.ReactNode;
  "data-variant": ButtonVariant;
  "data-size": ButtonSize;
  "data-full-width"?: "" | undefined;
  href: string;
  ref?: React.Ref<HTMLAnchorElement>;
};

type ButtonActionProps = Omit<BaseButtonProps, "type"> &
  ButtonVisualProps & {
    href?: undefined;
    type?: React.ComponentProps<"button">["type"];
  };

type ButtonHrefProps = Omit<
  React.ComponentPropsWithoutRef<"a">,
  "children" | "className" | "disabled" | "href" | "type"
> &
  ButtonVisualProps & {
    children?: React.ReactNode;
    className?: string;
    disabled?: never;
    href: string;
    render?: React.ReactElement | ((anchorProps: ButtonAnchorProps) => React.ReactElement);
    type?: never;
  };

export type ButtonProps = ButtonActionProps | ButtonHrefProps;

const ButtonAnchor = React.forwardRef<HTMLAnchorElement, ButtonHrefProps>(
  function ButtonAnchor(props, ref) {
    const {
      children,
      className,
      disabled,
      fullWidth = false,
      href,
      icon: Icon,
      render,
      size = "medium",
      type,
      variant = "default",
      ...anchorAttributes
    } = props;
    void disabled;
    void type;
    const resolvedChildren = Icon ? (
      <>
        <Icon className={styles.icon} aria-hidden="true" focusable={false} />
        {children}
      </>
    ) : (
      children
    );
    const anchorProps: ButtonAnchorProps = {
      ...anchorAttributes,
      children: resolvedChildren,
      className: cn(styles.button, className),
      "data-variant": variant,
      "data-size": size,
      "data-full-width": fullWidth ? "" : undefined,
      href,
    };
    // Base UI types callbacks as generic HTML props; this branch supplies required anchor props.
    const typedRender = render as unknown as useRender.RenderProp;

    return useRender({
      defaultTagName: "a",
      render: typedRender,
      ref,
      props: anchorProps,
    });
  },
);

export const Button = React.forwardRef<HTMLElement, ButtonProps>(
  function Button(props, forwardedRef) {
    if (props.href !== undefined) {
      return <ButtonAnchor {...props} ref={forwardedRef as React.Ref<HTMLAnchorElement>} />;
    }

    const {
      className,
      fullWidth = false,
      icon: Icon,
      size = "medium",
      type = "button",
      variant = "default",
      children,
      ...buttonProps
    } = props;
    const resolvedChildren = Icon ? (
      <>
        <Icon className={styles.icon} aria-hidden="true" focusable={false} />
        {children}
      </>
    ) : (
      children
    );

    return (
      <BaseButton
        {...buttonProps}
        ref={forwardedRef as React.Ref<HTMLButtonElement>}
        type={type}
        data-variant={variant}
        data-size={size}
        data-full-width={fullWidth ? "" : undefined}
        className={cn(styles.button, className)}
      >
        {resolvedChildren}
      </BaseButton>
    );
  },
);
