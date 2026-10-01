import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import SettingsPage from "./page";

test("renders settings headings and destination links", () => {
  render(<SettingsPage />);

  expect(
    screen.getByRole("heading", { level: 1, name: "Settings" }).getAttribute("data-level"),
  ).toBe("2");

  const profileHeading = screen.getByRole("heading", { level: 2, name: "Profile" });
  expect(profileHeading.getAttribute("data-level")).toBe("5");
  expect(screen.getByRole("link", { name: "Profile" }).getAttribute("href")).toBe("/user-profile");
  expect(screen.queryByRole("link", { name: /MCP keys/i })).toBeNull();
});
