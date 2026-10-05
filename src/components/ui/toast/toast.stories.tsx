import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "../button";
import { ToastProvider, useToast } from "./toast";
import type { ShowToastOptions } from "./toast";

function ToastTrigger({ title, description, variant }: ShowToastOptions) {
  const { showToast } = useToast();

  return (
    <Button
      label={`Show ${variant ?? "default"} toast`}
      onClick={() => showToast({ title, description, variant })}
    />
  );
}

const meta = {
  title: "UI/Toast",
  component: ToastProvider,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ToastProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ToastProvider>
      <ToastTrigger
        title="Recipe needs attention"
        description="Check the ingredient amounts before continuing."
      />
    </ToastProvider>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show default toast" }));
    const viewport = within(document.body).getByRole("region", { name: "Notifications" });
    await expect(within(viewport).findByText("Recipe needs attention")).resolves.toBeVisible();
  },
};

export const Danger: Story = {
  render: () => (
    <ToastProvider>
      <ToastTrigger
        title="Could not save recipe"
        description="Check your connection and try again."
        variant="danger"
      />
    </ToastProvider>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show danger toast" }));
    const viewport = within(document.body).getByRole("region", { name: "Notifications" });
    await expect(within(viewport).findByText("Could not save recipe")).resolves.toBeVisible();
  },
};

export const Warning: Story = {
  render: () => (
    <ToastProvider>
      <ToastTrigger
        title="Check ingredients"
        description="Review the quantities before saving."
        variant="warning"
      />
    </ToastProvider>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show warning toast" }));
    const viewport = within(document.body).getByRole("region", { name: "Notifications" });
    await expect(within(viewport).findByText("Check ingredients")).resolves.toBeVisible();
  },
};

export const Success: Story = {
  render: () => (
    <ToastProvider>
      <ToastTrigger
        title="Recipe saved"
        description="Your changes are ready to view."
        variant="success"
      />
    </ToastProvider>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show success toast" }));
    const viewport = within(document.body).getByRole("region", { name: "Notifications" });
    await expect(within(viewport).findByText("Recipe saved")).resolves.toBeVisible();
  },
};

export const TitleOnlyAndDismiss: Story = {
  render: () => (
    <ToastProvider>
      <ToastTrigger title="Recipe copied" variant="success" />
    </ToastProvider>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Show success toast" }));
    const viewport = within(document.body).getByRole("region", { name: "Notifications" });
    await expect(within(viewport).findByText("Recipe copied")).resolves.toBeVisible();
    await userEvent.click(within(viewport).getByLabelText("Dismiss notification"));
    await waitFor(() =>
      expect(within(viewport).queryByText("Recipe copied")).not.toBeInTheDocument(),
    );
  },
};
