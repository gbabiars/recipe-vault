import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import styles from "./app-sidebar.module.css";

let AppBrand: typeof import("./app-brand").AppBrand;
let AppNavLink: typeof import("./app-nav-link").AppNavLink;
let AppSidebar: typeof import("./app-sidebar").AppSidebar;

beforeAll(async () => {
  vi.stubGlobal("process", { env: {} });
  ({ AppBrand } = await import("./app-brand"));
  ({ AppNavLink } = await import("./app-nav-link"));
  ({ AppSidebar } = await import("./app-sidebar"));
});

afterAll(() => vi.unstubAllGlobals());

afterEach(cleanup);

test("brand links to recipes and nav links expose active and current states separately", () => {
  render(
    <>
      <AppBrand />
      <AppNavLink href="/settings" active>
        Settings
      </AppNavLink>
      <AppNavLink href="/recipes" active current>
        Recipes
      </AppNavLink>
    </>,
  );

  expect(screen.getByRole("link", { name: "Recipe Vault" }).getAttribute("href")).toBe("/recipes");
  expect(screen.getByRole("link", { name: "Settings" }).classList.contains(styles.active)).toBe(
    true,
  );
  expect(screen.getByRole("link", { name: "Settings" }).hasAttribute("aria-current")).toBe(false);
  expect(screen.getByRole("link", { name: "Recipes" }).getAttribute("aria-current")).toBe("page");
});

test.each([
  ["/recipes", "Recipes", "Recipes"],
  ["/recipes/example", "Recipes", "Recipes"],
  ["/settings", "Settings", "Settings"],
  ["/user-profile", "Settings", null],
  ["/user-profile/security", "Settings", null],
  ["/mcp-keys", "Settings", null],
  ["/mcp-keys/example", "Settings", null],
  ["/", null, null],
  ["/recipes-archive", null, null],
] as const)("sidebar states on %s", (pathname, activeName, currentName) => {
  render(<AppSidebar pathname={pathname} onSignOut={() => {}} />);

  const navigation = screen.getByRole("navigation", { name: "Primary" });
  const links = Array.from(navigation.querySelectorAll("a"));
  expect(
    links.filter((link) => link.classList.contains(styles.active)).map((link) => link.textContent),
  ).toEqual(activeName ? [activeName] : []);
  expect(
    links
      .filter((link) => link.getAttribute("aria-current") === "page")
      .map((link) => link.textContent),
  ).toEqual(currentName ? [currentName] : []);
});

test("sidebar exposes the expected navigation and sign-out controls", () => {
  render(<AppSidebar pathname="/recipes" onSignOut={() => {}} />);

  const navigation = screen.getByRole("navigation", { name: "Primary" });
  expect(screen.getByRole("link", { name: "Recipe Vault" }).getAttribute("href")).toBe("/recipes");
  expect(screen.getByRole("link", { name: "Recipes" }).getAttribute("href")).toBe("/recipes");
  expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("/settings");
  expect(Array.from(navigation.querySelectorAll("a"), (link) => link.textContent)).toEqual([
    "Recipes",
    "Settings",
  ]);
  expect(screen.getByRole("button", { name: "Sign out" }).getAttribute("type")).toBe("button");
});

test("sidebar invokes the supplied sign-out callback", () => {
  const onSignOut = vi.fn();
  render(<AppSidebar pathname="/recipes" onSignOut={onSignOut} />);

  fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

  expect(onSignOut).toHaveBeenCalledOnce();
});
