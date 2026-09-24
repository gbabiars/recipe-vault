import * as React from "react";
import { cn } from "cn";

import type { LayoutGap } from "./layout";
import layoutStyles from "./layout.module.css";
import styles from "./grid.module.css";

type GridElement = keyof React.JSX.IntrinsicElements;
type GridTrackCount = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type GridColumns = number | { minWidth: number; max?: number; repeat?: "fill" | "fit" };
export type GridSpan = GridTrackCount | "full";
export type ResponsiveGridSpan = GridSpan | { base: GridSpan; sm?: GridSpan; md?: GridSpan };

type GridLayoutProps<T extends GridElement> = {
  as?: T;
  columns?: GridColumns;
  gap?: LayoutGap;
  rowGap?: LayoutGap;
  columnGap?: LayoutGap;
  paddingInline?: LayoutGap;
  paddingBlock?: LayoutGap;
  paddingInlineStart?: LayoutGap;
  paddingInlineEnd?: LayoutGap;
  paddingBlockStart?: LayoutGap;
  paddingBlockEnd?: LayoutGap;
};

export type GridProps<T extends GridElement = "div"> = GridLayoutProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof GridLayoutProps<T>>;

type GridComponent = <T extends GridElement = "div">(
  props: GridProps<T> & { ref?: React.Ref<React.ComponentRef<T>> },
) => React.ReactElement | null;

type GridStyle = React.CSSProperties & {
  "--grid-template-columns"?: string;
};

function templateColumns(columns: GridColumns, columnGap: LayoutGap): string {
  if (typeof columns === "number") {
    return `repeat(${columns}, minmax(0, 1fr))`;
  }

  const minimum = `min(${columns.minWidth}px, 100%)`;
  const gaps = columns.max
    ? Array.from({ length: columns.max - 1 }, () => `var(--space-${columnGap})`).join(" - ")
    : "";
  const cappedMinimum = columns.max
    ? `max(${minimum}, calc((100%${gaps ? ` - ${gaps}` : ""}) / ${columns.max}))`
    : minimum;

  return `repeat(auto-${columns.repeat ?? "fill"}, minmax(${cappedMinimum}, 1fr))`;
}

const GridImpl = <T extends GridElement = "div">(
  {
    as,
    columns = 1,
    gap = "0",
    rowGap,
    columnGap,
    paddingInline,
    paddingBlock,
    paddingInlineStart,
    paddingInlineEnd,
    paddingBlockStart,
    paddingBlockEnd,
    className,
    style,
    ...props
  }: GridProps<T>,
  ref: React.ForwardedRef<React.ComponentRef<T>>,
) => {
  const Component = (as ?? "div") as React.ElementType;
  const gridStyle: GridStyle = {
    "--grid-template-columns": templateColumns(columns, columnGap ?? gap),
    ...style,
  };

  return React.createElement(Component, {
    ...props,
    ref,
    className: cn(layoutStyles.layout, styles.grid, className),
    style: gridStyle,
    "data-gap": gap,
    "data-row-gap": rowGap,
    "data-column-gap": columnGap,
    "data-padding-inline": paddingInline,
    "data-padding-block": paddingBlock,
    "data-padding-inline-start": paddingInlineStart,
    "data-padding-inline-end": paddingInlineEnd,
    "data-padding-block-start": paddingBlockStart,
    "data-padding-block-end": paddingBlockEnd,
  });
};

export const Grid = React.forwardRef(GridImpl) as GridComponent;

type GridItemLayoutProps<T extends GridElement> = {
  as?: T;
  span?: ResponsiveGridSpan;
  rowSpan?: number;
};

export type GridItemProps<T extends GridElement = "div"> = GridItemLayoutProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof GridItemLayoutProps<T>>;

type GridItemComponent = <T extends GridElement = "div">(
  props: GridItemProps<T> & { ref?: React.Ref<React.ComponentRef<T>> },
) => React.ReactElement | null;

type GridItemStyle = React.CSSProperties & {
  "--grid-item-span-base"?: string;
  "--grid-item-span-sm"?: string;
  "--grid-item-span-md"?: string;
  "--grid-item-row-span"?: string;
};

function columnSpan(span: GridSpan): string {
  return span === "full" ? "1 / -1" : `span ${span}`;
}

const GridItemImpl = <T extends GridElement = "div">(
  { as, span = 1, rowSpan, className, style, ...props }: GridItemProps<T>,
  ref: React.ForwardedRef<React.ComponentRef<T>>,
) => {
  const Component = (as ?? "div") as React.ElementType;
  const responsive = typeof span === "object" ? span : { base: span };
  const base = columnSpan(responsive.base);
  const small = columnSpan(responsive.sm ?? responsive.base);
  const medium = columnSpan(responsive.md ?? responsive.sm ?? responsive.base);
  const itemStyle: GridItemStyle = {
    "--grid-item-span-base": base,
    "--grid-item-span-sm": small,
    "--grid-item-span-md": medium,
    ...(rowSpan === undefined ? {} : { "--grid-item-row-span": `span ${rowSpan}` }),
    ...style,
  };

  return React.createElement(Component, {
    ...props,
    ref,
    className: cn(styles.item, className),
    style: itemStyle,
  });
};

export const GridItem = React.forwardRef(GridItemImpl) as GridItemComponent;
