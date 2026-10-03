import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { userEvent } from "vitest/browser";
import { expect, test, vi } from "vitest";

import "../../../app/globals.css";

import { LinkRendererProvider, type LinkRendererProps } from "../link-renderer";
import { List, ListItem } from "./list";
import styles from "./list.module.css";

function TestIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg data-testid="recipe-icon" {...props} />;
}

const RouterLink = React.forwardRef<HTMLAnchorElement, LinkRendererProps>(
  function RouterLink(props, ref) {
    return <a {...props} data-router="test" ref={ref} />;
  },
);

test("renders a semantic list with dividers only between items", () => {
  render(
    <List aria-label="Recipes">
      <ListItem title="Tomato soup" />
      <ListItem title="Roast vegetables" />
      <ListItem title="Apple pie" />
    </List>,
  );

  const list = screen.getByRole("list", { name: "Recipes" });
  const items = screen.getAllByRole("listitem");
  expect(list.tagName).toBe("UL");
  expect(items).toHaveLength(3);
  expect(items.every((item) => item.tagName === "LI")).toBe(true);
  expect(getComputedStyle(list).borderTopWidth).toBe("0px");
  expect(getComputedStyle(items[0]).borderTopWidth).toBe("0px");
  expect(getComputedStyle(items[1]).borderTopWidth).toBe("1px");
  expect(getComputedStyle(items[2]).borderTopWidth).toBe("1px");
  expect(getComputedStyle(items[2]).borderBottomWidth).toBe("0px");
});

test("renders large title, optional medium description, and decorative icon", () => {
  render(
    <List>
      <ListItem icon={TestIcon} title="Tomato soup" description="A family recipe" />
      <ListItem icon={TestIcon} title="Roast vegetables" />
    </List>,
  );

  const title = screen.getByText("Tomato soup");
  const description = screen.getByText("A family recipe");
  const icon = screen.getAllByTestId("recipe-icon")[0];
  expect(getComputedStyle(title).fontSize).toBe("16px");
  expect(getComputedStyle(description).fontSize).toBe("14px");
  expect(icon.getAttribute("aria-hidden")).toBe("true");
  expect(icon.classList.contains(styles.icon)).toBe(true);
  expect(
    screen.getByText("Roast vegetables").parentElement?.querySelector(`.${styles.description}`),
  ).toBeNull();
});

test("uses a native visible title link without a provider", () => {
  render(
    <List>
      <ListItem title="Tomato soup" href="#tomato-soup" description="A family recipe" />
    </List>,
  );

  const link = screen.getByRole("link", { name: "Tomato soup" });
  expect(link).toBeInstanceOf(HTMLAnchorElement);
  expect(link.getAttribute("href")).toBe("#tomato-soup");
  expect(link.textContent).toBe("Tomato soup");
  expect(screen.getByText("A family recipe").closest("a")).toBeNull();
});

test("uses the configured link renderer and keeps title keyboard accessible", async () => {
  const onClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault());
  render(
    <LinkRendererProvider link={<RouterLink href="/" onClick={onClick} />}>
      <List>
        <ListItem title="Tomato soup" href="/recipes/tomato-soup" />
      </List>
    </LinkRendererProvider>,
  );

  const link = screen.getByRole("link", { name: "Tomato soup" });
  expect(link.getAttribute("data-router")).toBe("test");
  expect(link.getAttribute("href")).toBe("/recipes/tomato-soup");
  await userEvent.tab();
  expect(document.activeElement).toBe(link);
  expect(link.closest("li")?.matches(`:has(.${styles.titleLink}:focus-visible)`)).toBe(true);
  await userEvent.keyboard("{Enter}");
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("activates title link once from unused row space and ignores description controls", () => {
  const onClick = vi.fn((event: React.MouseEvent<HTMLAnchorElement>) => event.preventDefault());
  render(
    <LinkRendererProvider link={<RouterLink href="/" onClick={onClick} />}>
      <List>
        <ListItem
          data-testid="row"
          title="Tomato soup"
          href="/recipes/tomato-soup"
          description={
            <>
              A family recipe · <a href="#quick">Quick meals</a> <button type="button">Save</button>
            </>
          }
        />
      </List>
    </LinkRendererProvider>,
  );

  fireEvent.click(screen.getByTestId("row"));
  expect(onClick).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("link", { name: "Quick meals" }));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onClick).toHaveBeenCalledTimes(1);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(screen.getByText("A family recipe ·"));
  selection?.removeAllRanges();
  selection?.addRange(range);
  fireEvent.click(screen.getByTestId("row"));
  selection?.removeAllRanges();
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("opens the title destination for modifier and middle row clicks", () => {
  const open = vi.spyOn(window, "open").mockReturnValue(null);
  render(
    <List>
      <ListItem data-testid="row" title="Tomato soup" href="/recipes/tomato-soup" />
    </List>,
  );

  const row = screen.getByTestId("row");
  const href = (screen.getByRole("link", { name: "Tomato soup" }) as HTMLAnchorElement).href;
  fireEvent.click(row, { ctrlKey: true });
  fireEvent.click(row, { metaKey: true });
  fireEvent(row, new MouseEvent("auxclick", { bubbles: true, button: 1 }));
  expect(open).toHaveBeenCalledTimes(3);
  expect(open).toHaveBeenCalledWith(href, "_blank", "noopener");
  open.mockRestore();
});
