import { render, screen, waitFor, within } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { afterEach, expect, test } from "vitest";

import "../../../app/globals.css";

import { Button } from "../button";
import { ToastProvider, useToast } from "./toast";
import type { ShowToastOptions } from "./toast";

function Trigger({ title, description, variant }: ShowToastOptions) {
  const { showToast } = useToast();

  return <Button label="Show toast" onClick={() => showToast({ title, description, variant })} />;
}

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
});

test("creates a titled toast through the hook and dismisses it with the small icon button", async () => {
  render(
    <ToastProvider>
      <Trigger
        title="Recipe saved"
        description="Your changes are ready to view."
        variant="success"
      />
    </ToastProvider>,
  );

  expect(screen.getAllByRole("region", { name: "Notifications" })).toHaveLength(1);
  await userEvent.click(screen.getByRole("button", { name: "Show toast" }));

  const viewport = screen.getByRole("region", { name: "Notifications" });
  const title = await within(viewport).findByText("Recipe saved");
  const toast = title.closest('[role="dialog"]');
  const close = within(viewport).getByLabelText("Dismiss notification");

  expect(toast).not.toBeNull();
  expect(title).toHaveAttribute("data-level", "6");
  expect(within(viewport).getByText("Your changes are ready to view.")).toHaveAttribute(
    "data-size",
    "medium",
  );
  expect(close).toHaveAttribute("data-size", "small");
  expect(close).toHaveAttribute("data-variant", "subtle");

  await userEvent.click(close);
  await waitFor(() => expect(within(viewport).queryByText("Recipe saved")).not.toBeInTheDocument());
});

test("renders title-only feedback and stacks messages in one viewport", async () => {
  render(
    <ToastProvider>
      <Trigger title="Recipe copied" />
    </ToastProvider>,
  );

  await userEvent.click(screen.getByRole("button", { name: "Show toast" }));
  await userEvent.click(screen.getByRole("button", { name: "Show toast" }));

  expect(screen.getAllByRole("heading", { name: "Recipe copied" })).toHaveLength(2);
  expect(screen.queryByText("Your changes are ready to view.")).not.toBeInTheDocument();
  expect(screen.getAllByRole("region", { name: "Notifications" })).toHaveLength(1);
});

test.each([
  ["light", "default", "rgb(245, 245, 245)", "rgb(229, 229, 229)", "rgb(82, 82, 82)"],
  ["light", "danger", "rgb(254, 242, 242)", "rgb(254, 202, 202)", "rgb(220, 38, 38)"],
  ["light", "warning", "rgb(255, 251, 235)", "rgb(253, 230, 138)", "rgb(217, 119, 6)"],
  ["light", "success", "rgb(240, 253, 244)", "rgb(187, 247, 208)", "rgb(22, 163, 74)"],
  ["dark", "default", "rgb(38, 38, 38)", "rgb(38, 38, 38)", "rgb(163, 163, 163)"],
  ["dark", "danger", "rgb(69, 10, 10)", "rgb(127, 29, 29)", "rgb(248, 113, 113)"],
  ["dark", "warning", "rgb(69, 26, 3)", "rgb(120, 53, 15)", "rgb(251, 191, 36)"],
  ["dark", "success", "rgb(5, 46, 22)", "rgb(20, 83, 45)", "rgb(74, 222, 128)"],
] as const)(
  "uses %s theme colors for the %s toast",
  async (theme, variant, background, border, icon) => {
    document.documentElement.dataset.theme = theme;

    render(
      <ToastProvider>
        <Trigger title="Recipe update" variant={variant} />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Show toast" }));

    const viewport = screen.getByRole("region", { name: "Notifications" });
    const title = await within(viewport).findByText("Recipe update");
    const toast = title.closest('[role="dialog"], [role="alertdialog"]') as HTMLElement;
    const statusIcon = toast.querySelector("svg");

    expect(getComputedStyle(toast).backgroundColor).toBe(background);
    expect(getComputedStyle(toast).borderTopColor).toBe(border);
    expect(getComputedStyle(statusIcon as SVGSVGElement).color).toBe(icon);
    expect(statusIcon).toHaveAttribute("aria-hidden", "true");
  },
);
