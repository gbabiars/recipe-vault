import * as React from "react";
import Link from "next/link";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";

import "../../../app/globals.css";
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
});
