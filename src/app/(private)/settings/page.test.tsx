import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import SettingsPage from "./page";

test("renders profile destination in a named settings list", () => {
  render(<SettingsPage />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Settings" }).getAttribute("data-level"),
  ).toBe("2");

  const settingsList = screen.getByRole("list", { name: "Settings" });
  expect(settingsList.querySelectorAll("li")).toHaveLength(1);
  expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe("/user-profile");
  expect(screen.getByText("Manage your account details.")).toBeTruthy();
  expect(screen.queryByRole("link", { name: /MCP keys/i })).toBeNull();
});
