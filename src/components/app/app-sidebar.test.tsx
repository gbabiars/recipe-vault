import { fireEvent, render, screen } from "@testing-library/react";
import { BookOpen } from "lucide-react";
import { expect, test, vi } from "vitest";
import { AppBrand } from "./app-brand";
import { AppNavLink } from "./app-nav-link";
import { AppSidebar } from "./app-sidebar";
import styles from "./app-sidebar.module.css";

test("brand links to recipes and nav links expose active and current states separately", () => {
  render(
    <>
      <AppBrand />
      <AppNavLink href="/settings" active>
        Settings
      </AppNavLink>
      <AppNavLink href="/recipes" icon={BookOpen} active current>
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
  const recipes = screen.getByRole("link", { name: "Recipes" });
  const icon = recipes.querySelector("svg");
  expect(recipes.firstElementChild).toBe(icon);
  expect(icon).toHaveAttribute("aria-hidden", "true");
  expect(icon).toHaveAttribute("focusable", "false");
});

test.each([
  ["/recipes", true, false, false],
  ["/recipes/example", true, false, false],
  ["/tags", false, false, true],
  ["/tags/example", false, false, true],
  ["/settings", false, true, false],
  ["/user-profile", false, true, false],
  ["/user-profile/security", false, true, false],
  ["/", false, false, false],
  ["/recipes-archive", false, false, false],
] as const)("sidebar states on %s", (pathname, recipesActive, settingsAreaActive, tagsActive) => {
  render(<AppSidebar pathname={pathname} userName="Ada Lovelace" onSignOut={() => {}} />);

  const navigation = screen.getByRole("navigation", { name: "Primary", hidden: true });
  const links = Array.from(navigation.querySelectorAll("a"));
  const activeLinks = recipesActive ? ["Recipes"] : tagsActive ? ["Tags"] : [];
  expect(
    links.filter((link) => link.classList.contains(styles.active)).map((link) => link.textContent),
  ).toEqual(activeLinks);
  expect(
    links
      .filter((link) => link.getAttribute("aria-current") === "page")
      .map((link) => link.textContent),
  ).toEqual(activeLinks);
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
    "Tags",
  ]);
  expect(screen.queryByRole("link", { name: "Settings", hidden: true })).toBeNull();
  expect(screen.getByRole("link", { name: "Tags", hidden: true })).toHaveAttribute("href", "/tags");
  for (const label of ["Recipes", "Tags"]) {
    const link = screen.getByRole("link", { name: label, hidden: true });
    const icon = link.querySelector("svg");
    expect(link.firstElementChild).toBe(icon);
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveAttribute("focusable", "false");
  }

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

test("collapsed sidebar keeps navigation names accessible and renders compact controls", () => {
  render(
    <AppSidebar
      pathname="/recipes"
      userName="Ada Lovelace"
      onSignOut={() => {}}
      collapsed
      onToggleCollapse={() => {}}
    />,
  );

  const sidebar = screen.getByRole("complementary", { hidden: true });
  expect(sidebar).toHaveAttribute("data-collapsed", "true");
  expect(screen.getByRole("link", { name: "Recipes", hidden: true })).toHaveClass(
    styles.collapsedLink,
  );
  expect(screen.getByRole("link", { name: "Tags", hidden: true })).toHaveClass(
    styles.collapsedLink,
  );
  expect(screen.getByRole("button", { name: "Ada Lovelace", hidden: true })).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Expand navigation", hidden: true }),
  ).toBeInTheDocument();
});
