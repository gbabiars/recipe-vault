import * as React from "react";
import { render, screen } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { afterEach, expect, test } from "vitest";
import { Trash2 } from "lucide-react";

import "../../../app/globals.css";

import { IconButton } from "../button";
import { Tooltip, TooltipProvider } from "./tooltip";

function Provider({ children }: React.PropsWithChildren) {
  return <TooltipProvider>{children}</TooltipProvider>;
}

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
});

test("composes the tooltip description with an existing described-by value", () => {
  render(
    <Tooltip
      trigger={
        <IconButton aria-describedby="delete-guidance" icon={Trash2} label="Delete recipe" />
      }
      content="Permanently removes this recipe."
    />,
    { wrapper: Provider },
  );

  const trigger = screen.getByRole("button", { name: "Delete recipe" });
  const descriptionIds = trigger.getAttribute("aria-describedby")?.split(" ") ?? [];
  const tooltipId = descriptionIds.find((id) => id !== "delete-guidance");

  expect(descriptionIds).toHaveLength(2);
  expect(descriptionIds).toContain("delete-guidance");
  expect(tooltipId).toBeTruthy();
  expect(document.getElementById(tooltipId as string)).toHaveTextContent(
    "Permanently removes this recipe.",
  );
});

test("waits 400 ms to open on hover", async () => {
  render(
    <Tooltip
      trigger={<IconButton icon={Trash2} label="Delete recipe" />}
      content="Permanently removes this recipe."
    />,
    { wrapper: Provider },
  );

  await userEvent.hover(screen.getByRole("button", { name: "Delete recipe" }));
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  expect(await screen.findByRole("tooltip")).toBeVisible();
});

test("opens immediately on keyboard focus", async () => {
  render(
    <Tooltip
      trigger={<IconButton icon={Trash2} label="Delete recipe" />}
      content="Permanently removes this recipe."
    />,
    { wrapper: Provider },
  );

  await userEvent.tab();

  expect(screen.getByRole("button", { name: "Delete recipe" })).toHaveFocus();
  expect(await screen.findByRole("tooltip")).toBeVisible();
});

test("uses the requested side and keeps centered alignment", async () => {
  render(
    <Tooltip
      side="bottom"
      trigger={<IconButton icon={Trash2} label="Delete recipe" />}
      content="Permanently removes this recipe."
    />,
    { wrapper: Provider },
  );

  await userEvent.hover(screen.getByRole("button", { name: "Delete recipe" }));

  const tooltip = await screen.findByRole("tooltip");
  const positioner = tooltip.parentElement;

  expect(positioner).toHaveAttribute("data-side", "bottom");
  expect(positioner).toHaveAttribute("data-align", "center");
});

test("disabled prevents opening and omits its description association", async () => {
  render(
    <Tooltip
      disabled
      trigger={
        <IconButton aria-describedby="existing-description" icon={Trash2} label="Delete recipe" />
      }
      content="Permanently removes this recipe."
    />,
    { wrapper: Provider },
  );

  const trigger = screen.getByRole("button", { name: "Delete recipe" });
  await userEvent.hover(trigger);
  await new Promise((resolve) => setTimeout(resolve, 450));

  expect(trigger).toHaveAttribute("aria-describedby", "existing-description");
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
});

test.each([
  ["light", "rgb(23, 23, 23)", "rgb(255, 255, 255)"],
  ["dark", "rgb(245, 245, 245)", "rgb(23, 23, 23)"],
] as const)("uses inverse tooltip colors in %s mode", async (theme, background, text) => {
  document.documentElement.dataset.theme = theme;

  render(
    <Tooltip trigger={<IconButton icon={Trash2} label="Help" />} content="Supplemental details." />,
    { wrapper: Provider },
  );

  const tooltip = document.getElementById(
    screen.getByRole("button", { name: "Help" }).getAttribute("aria-describedby") as string,
  );

  expect(tooltip).not.toBeNull();
  expect(getComputedStyle(tooltip as HTMLElement).backgroundColor).toBe(background);
  expect(getComputedStyle(tooltip as HTMLElement).color).toBe(text);
});
