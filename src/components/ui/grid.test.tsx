import * as React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import "../../app/globals.css";

import { Grid, GridItem } from "./grid";

afterEach(cleanup);

test("renders semantic direct children and forwards element props and refs", () => {
  const ref = React.createRef<HTMLUListElement>();

  render(
    <Grid as="ul" ref={ref} aria-label="Recipes" data-testid="grid">
      <li>Soup</li>
      <li>Salad</li>
    </Grid>,
  );

  const grid = screen.getByRole("list", { name: "Recipes" });
  expect(ref.current).toBe(grid);
  expect(grid.children).toHaveLength(2);
  expect(grid.getAttribute("role")).toBeNull();
  expect(getComputedStyle(grid).display).toBe("grid");
  expect(
    getComputedStyle(grid)
      .gridTemplateColumns.split(" ")
      .filter((track) => parseFloat(track) > 0),
  ).toHaveLength(1);
});

test("uses fixed equal tracks and tokenized gaps and padding", () => {
  render(
    <Grid
      columns={3}
      gap="200"
      rowGap="100"
      columnGap="300"
      paddingInline="200"
      style={{ width: 600 }}
      data-testid="grid"
    />,
  );

  const computed = getComputedStyle(screen.getByTestId("grid"));
  expect(computed.gridTemplateColumns.split(" ")).toHaveLength(3);
  expect(computed.columnGap).toBe("24px");
  expect(computed.rowGap).toBe("8px");
  expect(computed.paddingInlineStart).toBe("16px");
});

test("auto columns respect min width, max count, and fill versus fit", () => {
  const { rerender } = render(
    <Grid columns={{ minWidth: 200, max: 4 }} gap="200" style={{ width: 1200 }}>
      <span>Card</span>
    </Grid>,
  );

  const grid = screen.getByText("Card").parentElement!;
  expect(getComputedStyle(grid).gridTemplateColumns.split(" ")).toHaveLength(4);

  rerender(
    <Grid columns={{ minWidth: 200, max: 4 }} gap="200" style={{ width: 500 }}>
      <span>Card</span>
    </Grid>,
  );
  expect(getComputedStyle(grid).gridTemplateColumns.split(" ")).toHaveLength(2);

  rerender(
    <Grid columns={{ minWidth: 200, max: 4 }} gap="200" style={{ width: 180 }}>
      <span>Card</span>
    </Grid>,
  );
  expect(getComputedStyle(grid).gridTemplateColumns.split(" ")).toHaveLength(1);

  rerender(
    <Grid columns={{ minWidth: 200, max: 4, repeat: "fit" }} gap="200" style={{ width: 1200 }}>
      <span>Card</span>
    </Grid>,
  );

  expect(
    getComputedStyle(grid)
      .gridTemplateColumns.split(" ")
      .filter((track) => parseFloat(track) > 0),
  ).toHaveLength(1);

  rerender(
    <Grid columns={{ minWidth: 200 }} gap="200" style={{ width: 1200 }}>
      <span>Card</span>
    </Grid>,
  );

  expect(getComputedStyle(grid).gridTemplateColumns.split(" ").length).toBeGreaterThan(4);
});

test("responsive spans follow the grid container width and cascade", () => {
  const itemRef = React.createRef<HTMLLIElement>();
  const { rerender } = render(
    <Grid as="ul" columns={12} style={{ width: 500 }}>
      <GridItem as="li" ref={itemRef} span={{ base: "full", sm: 6, md: 4 }} rowSpan={2}>
        Summary
      </GridItem>
    </Grid>,
  );

  const item = screen.getByRole("listitem");
  expect(itemRef.current).toBe(item);
  expect(getComputedStyle(item).gridColumn).toBe("1 / -1");
  expect(getComputedStyle(item).gridRow).toBe("span 2");

  rerender(
    <Grid as="ul" columns={12} style={{ width: 700 }}>
      <GridItem as="li" ref={itemRef} span={{ base: "full", sm: 6, md: 4 }} rowSpan={2}>
        Summary
      </GridItem>
    </Grid>,
  );
  expect(getComputedStyle(item).gridColumn).toBe("span 6");

  rerender(
    <Grid as="ul" columns={12} style={{ width: 1000 }}>
      <GridItem as="li" ref={itemRef} span={{ base: "full", sm: 6, md: 4 }} rowSpan={2}>
        Summary
      </GridItem>
    </Grid>,
  );
  expect(getComputedStyle(item).gridColumn).toBe("span 4");
});
