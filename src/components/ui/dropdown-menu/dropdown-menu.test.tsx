import * as React from "react";
import Link from "next/link";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import "../../../app/globals.css";
import { LinkRendererProvider, type LinkRendererProps } from "../link-renderer";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuPopup,
  DropdownMenuTrigger,
} from "./dropdown-menu";

function TestIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} data-testid="menu-item-icon" />;
}

const RouterLink = React.forwardRef<HTMLAnchorElement, LinkRendererProps>(
  function RouterLink(props, ref) {
    return <a {...props} ref={ref} data-router="test" />;
  },
);

test("renders decorative leading icons on action and link items", async () => {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button">Actions</button>} />
      <DropdownMenuPopup>
        <DropdownMenuItem icon={TestIcon}>Edit</DropdownMenuItem>
        <DropdownMenuLinkItem icon={TestIcon} render={<Link href="/recipes" />}>
          Browse recipes
        </DropdownMenuLinkItem>
      </DropdownMenuPopup>
    </DropdownMenu>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Actions" }));

  const action = await screen.findByRole("menuitem", { name: "Edit" });
  const link = screen.getByRole("menuitem", { name: "Browse recipes" });

  for (const item of [action, link]) {
    const icon = within(item).getByTestId("menu-item-icon");
    expect(item.firstElementChild).toBe(icon);
    expect(icon.getAttribute("aria-hidden")).toBe("true");
    expect(icon.getAttribute("focusable")).toBe("false");
  }
  expect(link.getAttribute("href")).toBe("/recipes");
  link.setAttribute("data-highlighted", "");
  expect(getComputedStyle(link).color).toBe(getComputedStyle(action).color);
});

test("uses the configured renderer for href links in the menu", async () => {
  render(
    <LinkRendererProvider link={<RouterLink href="/" />}>
      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button">Actions</button>} />
        <DropdownMenuPopup>
          <DropdownMenuLinkItem href="/recipes">Browse recipes</DropdownMenuLinkItem>
        </DropdownMenuPopup>
      </DropdownMenu>
    </LinkRendererProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Actions" }));

  const link = await screen.findByRole("menuitem", { name: "Browse recipes" });
  expect(link.getAttribute("href")).toBe("/recipes");
  expect(link.getAttribute("data-router")).toBe("test");
});

test("an explicit menu render overrides the configured link renderer", async () => {
  render(
    <LinkRendererProvider link={<RouterLink href="/" />}>
      <DropdownMenu>
        <DropdownMenuTrigger render={<button type="button">Actions</button>} />
        <DropdownMenuPopup>
          <DropdownMenuLinkItem render={<a href="/export" download />}>
            Download recipes
          </DropdownMenuLinkItem>
        </DropdownMenuPopup>
      </DropdownMenu>
    </LinkRendererProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Actions" }));

  const link = await screen.findByRole("menuitem", { name: "Download recipes" });
  expect(link.getAttribute("data-router")).toBeNull();
  expect(link.hasAttribute("download")).toBe(true);
});

test("supports danger variants on action and link items while retaining disabled behavior", async () => {
  const onDelete = vi.fn();
  render(
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button">Actions</button>} />
      <DropdownMenuPopup>
        <DropdownMenuItem onClick={() => undefined}>Edit</DropdownMenuItem>
        <DropdownMenuItem disabled onClick={() => undefined}>
          Edit unavailable
        </DropdownMenuItem>
        <DropdownMenuItem variant="danger" onClick={onDelete}>
          Delete recipe
        </DropdownMenuItem>
        <DropdownMenuLinkItem variant="danger" href="#delete-help">
          Deletion help
        </DropdownMenuLinkItem>
        <DropdownMenuItem variant="danger" disabled onClick={() => undefined}>
          Delete unavailable
        </DropdownMenuItem>
      </DropdownMenuPopup>
    </DropdownMenu>,
  );

  fireEvent.click(screen.getByRole("button", { name: "Actions" }));

  const action = await screen.findByRole("menuitem", { name: "Delete recipe" });
  const defaultAction = screen.getByRole("menuitem", { name: "Edit" });
  const defaultDisabled = screen.getByRole("menuitem", { name: "Edit unavailable" });
  const link = screen.getByRole("menuitem", { name: "Deletion help" });
  const disabled = screen.getByRole("menuitem", { name: "Delete unavailable" });
  expect(action).toHaveAttribute("data-variant", "danger");
  expect(link).toHaveAttribute("data-variant", "danger");
  expect(defaultAction).toHaveAttribute("data-variant", "default");
  expect(getComputedStyle(action).color).toBe("rgb(185, 28, 28)");
  expect(getComputedStyle(defaultAction).color).not.toBe(getComputedStyle(action).color);
  expect(disabled).toHaveAttribute("data-variant", "danger");
  expect(disabled).toHaveAttribute("aria-disabled", "true");
  expect(defaultDisabled).toHaveAttribute("aria-disabled", "true");

  action.setAttribute("data-highlighted", "");
  expect(getComputedStyle(action).backgroundColor).toBe("rgb(254, 242, 242)");
  disabled.setAttribute("data-highlighted", "");
  defaultDisabled.setAttribute("data-highlighted", "");
  expect(getComputedStyle(disabled).color).toBe("rgb(163, 163, 163)");
  expect(getComputedStyle(disabled).color).toBe(getComputedStyle(defaultDisabled).color);
  expect(getComputedStyle(disabled).backgroundColor).toBe("rgba(0, 0, 0, 0)");
  expect(getComputedStyle(disabled).backgroundColor).toBe(
    getComputedStyle(defaultDisabled).backgroundColor,
  );

  fireEvent.click(action);
  expect(onDelete).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
});
