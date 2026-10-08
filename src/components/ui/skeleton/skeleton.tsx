import * as React from "react";
import { cn } from "cn";

import styles from "./skeleton.module.css";

export type SkeletonRadius = "0" | "025" | "050" | "075" | "100" | "150" | "200" | "300" | "full";

export type SkeletonProps = Omit<
  React.ComponentPropsWithoutRef<"div">,
  "children" | "height" | "width"
> & {
  height?: React.CSSProperties["height"];
  radius?: SkeletonRadius;
  width?: React.CSSProperties["width"];
};

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, height = "1em", radius = "050", style, width = "100%", ...props },
  ref,
) {
  return (
    <div
      {...props}
      ref={ref}
      aria-hidden="true"
      className={cn(styles.skeleton, className)}
      data-radius={radius}
      style={{ ...style, height, width }}
    />
  );
});

export type SkeletonTextProps = Omit<SkeletonProps, "height" | "inset" | "radius"> & {
  size?: "small" | "medium" | "large";
};

export function SkeletonText({
  className,
  size = "medium",
  style,
  width = "100%",
  ...props
}: SkeletonTextProps) {
  const lineHeight = `var(--line-height-text-${size})`;
  const fontSize = `var(--font-size-text-${size})`;

  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn(styles.line, className)}
      data-size={size}
      style={{
        ...style,
        height: lineHeight,
        paddingBlock: `calc((${lineHeight} - ${fontSize}) / 2)`,
        width,
      }}
    >
      <Skeleton height={fontSize} width="100%" />
    </div>
  );
}

export type SkeletonHeadingProps = Omit<SkeletonProps, "height" | "inset" | "radius"> & {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
};

export function SkeletonHeading({
  className,
  level = 1,
  style,
  width = "100%",
  ...props
}: SkeletonHeadingProps) {
  const lineHeight = `var(--line-height-heading-${level})`;
  const fontSize = `var(--font-size-heading-${level})`;

  return (
    <div
      {...props}
      aria-hidden="true"
      className={cn(styles.line, className)}
      data-level={level}
      style={{
        ...style,
        height: lineHeight,
        paddingBlock: `calc((${lineHeight} - ${fontSize}) / 2)`,
        width,
      }}
    >
      <Skeleton height={fontSize} width="100%" />
    </div>
  );
}

export type SkeletonAvatarProps = Omit<SkeletonProps, "height" | "inset" | "radius" | "width"> & {
  size?: "small" | "medium" | "large";
};

const avatarSizes = { small: "24px", medium: "32px", large: "40px" } as const;

export function SkeletonAvatar({ size = "medium", ...props }: SkeletonAvatarProps) {
  const dimension = avatarSizes[size];

  return (
    <Skeleton {...props} data-size={size} height={dimension} radius="full" width={dimension} />
  );
}
