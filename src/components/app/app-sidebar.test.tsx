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
  ["/recipes", true, false],
  ["/recipes/example", true, false],
  ["/settings", false, true],
  ["/user-profile", false, true],
  ["/user-profile/security", false, true],
  ["/", false, false],
  ["/recipes-archive", false, false],
] as const)("sidebar states on %s", (pathname, recipesActive, settingsAreaActive) => {
  render(<AppSidebar pathname={pathname} userName="Ada Lovelace" onSignOut={() => {}} />);

  const navigation = screen.getByRole("navigation", { name: "Primary", hidden: true });
  const links = Array.from(navigation.querySelectorAll("a"));
  expect(
    links.filter((link) => link.classList.contains(styles.active)).map((link) => link.textContent),
  ).toEqual(recipesActive ? ["Recipes"] : []);
  expect(
    links
      .filter((link) => link.getAttribute("aria-current") === "page")
      .map((link) => link.textContent),
  ).toEqual(recipesActive ? ["Recipes"] : []);
  expect(
    screen
      .getByRole("button", { name: "Ada Lovelace", hidden: true })
      .classList.contains(styles.active),
  ).toBe(settingsAreaActive);
});

test("sidebar places Settings in the account menu instead of primary navigation", () => {
  render(<AppSidebar pathname="/settings" userName="Ada Lovelace" onSignOut={() => {}} />);

  const navigation = screen.getByRole("navigation", { name: "Primary", hidden: true });
  expect(
    screen.getByRole("link", { name: "Recipe Vault", hidden: true }).getAttribute("href"),
  ).toBe("/recipes");
  expect(screen.getByRole("link", { name: "Recipes", hidden: true }).getAttribute("href")).toBe(
    "/recipes",
  );
  expect(Array.from(navigation.querySelectorAll("a"), (link) => link.textContent)).toEqual([
    "Recipes",
  ]);
  expect(screen.queryByRole("link", { name: "Settings", hidden: true })).toBeNull();

  const accountMenu = screen.getByRole("button", { name: "Ada Lovelace", hidden: true });
  expect(accountMenu.firstElementChild?.textContent).toBe("AL");
  fireEvent.click(accountMenu);

  const settings = screen.getByRole("menuitem", { name: "Settings", hidden: true });
  expect(settings).toHaveAttribute("href", "/settings");
  expect(settings).toHaveAttribute("aria-current", "page");
});

test("sidebar invokes the supplied sign-out callback", () => {
  const onSignOut = vi.fn();
  render(<AppSidebar pathname="/recipes" userName="Ada Lovelace" onSignOut={onSignOut} />);

  fireEvent.click(screen.getByRole("button", { name: "Ada Lovelace", hidden: true }));
  fireEvent.click(screen.getByRole("menuitem", { name: "Sign out", hidden: true }));

  expect(onSignOut).toHaveBeenCalledOnce();
});
