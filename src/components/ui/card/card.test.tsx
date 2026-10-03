import { fireEvent, render, screen } from "@testing-library/react";
import Link from "next/link";
import * as React from "react";
import { userEvent } from "vitest/browser";
import { afterEach, expect, test, vi } from "vitest";

import "../../../app/globals.css";

import { Card } from "./card";
import { LinkRendererProvider, type LinkRendererProps } from "../link-renderer";
import styles from "./card.module.css";

const RouterLink = React.forwardRef<HTMLAnchorElement, LinkRendererProps>(
  function RouterLink(props, ref) {
    return <a {...props} ref={ref} data-router="test" />;
  },
);

afterEach(() => {
  document.documentElement.removeAttribute("data-theme");
});

test("renders a div with the default card styling and medium padding", () => {
  render(<Card>Recipe details</Card>);

  const card = screen.getByText("Recipe details");

  expect(card).toBeInstanceOf(HTMLDivElement);
  expect(card.classList.contains(styles.card)).toBe(true);
  expect(card.getAttribute("data-padding")).toBe("medium");
  expect(card.getAttribute("data-variant")).toBe("default");
});

test("supports the subtle variant", () => {
  render(
    <Card data-testid="card" variant="subtle">
      Recipe details
    </Card>,
  );

  expect(screen.getByTestId("card").getAttribute("data-variant")).toBe("subtle");
});

test.each([
  ["section", "Recipe details", "SECTION"],
  ["li", "Recipe summary", "LI"],
] as const)("renders as a semantic %s element", (as, content, tagName) => {
  render(
    <Card as={as} data-testid="card">
      {content}
    </Card>,
  );

  expect(screen.getByTestId("card").tagName).toBe(tagName);
});

test.each(["small", "medium", "large", "none"] as const)("supports %s padding", (padding) => {
  render(
    <Card padding={padding} data-testid="card">
      Recipe summary
    </Card>,
  );

  expect(screen.getByTestId("card").getAttribute("data-padding")).toBe(padding);
});

test("forwards native props, refs, and consumer class names", () => {
  const ref = { current: null as HTMLDivElement | null };

  render(
    <Card
      ref={ref}
      aria-label="Recipe card"
      className="featured-card"
      data-testid="card"
      id="recipe-card"
      title="Recipe details"
    >
      Recipe details
    </Card>,
  );

  const card = screen.getByTestId("card");

  expect(ref.current).toBe(card);
  expect(card.getAttribute("aria-label")).toBe("Recipe card");
  expect(card.classList.contains(styles.card)).toBe(true);
  expect(card.classList.contains("featured-card")).toBe(true);
  expect(card.id).toBe("recipe-card");
  expect(card.title).toBe("Recipe details");
});

test("renders one named native anchor inside a non-interactive card", () => {
  render(
    <Card
      data-testid="card"
      label="View Tomato Soup"
      render={<a href="https://example.com/recipes/tomato-soup" />}
    >
      <h2>Tomato Soup</h2>
    </Card>,
  );

  const card = screen.getByTestId("card");
  const links = screen.getAllByRole("link", { name: "View Tomato Soup" });

  expect(links).toHaveLength(1);
  expect(links[0]).toBeInstanceOf(HTMLAnchorElement);
  expect(links[0].getAttribute("href")).toBe("https://example.com/recipes/tomato-soup");
  expect(links[0].classList.contains(styles.primaryControl)).toBe(true);
  expect(card.tagName).toBe("DIV");
  expect(card.getAttribute("role")).toBeNull();
  expect(card.getAttribute("tabindex")).toBeNull();
});

test("renders an href through the configured link renderer", () => {
  render(
    <LinkRendererProvider link={<RouterLink href="/" />}>
      <Card as="li" label="View Tomato Soup" href="/recipes/tomato-soup">
        Tomato Soup
      </Card>
    </LinkRendererProvider>,
  );

  const link = screen.getByRole("link", { name: "View Tomato Soup" });
  expect(link.getAttribute("href")).toBe("/recipes/tomato-soup");
  expect(link.getAttribute("data-router")).toBe("test");
  expect(link.closest("li")?.getAttribute("data-interactive")).toBe("");
});

test("renders a native anchor for href without a provider", () => {
  render(
    <Card label="View Tomato Soup" href="/recipes/tomato-soup">
      Tomato Soup
    </Card>,
  );

  const link = screen.getByRole("link", { name: "View Tomato Soup" });
  expect(link).toBeInstanceOf(HTMLAnchorElement);
  expect(link.getAttribute("href")).toBe("/recipes/tomato-soup");
});

test("an explicit render overrides the configured link renderer", () => {
  render(
    <LinkRendererProvider link={<RouterLink href="/" />}>
      <Card label="Download Tomato Soup" render={<a href="/export" download />}>
        Tomato Soup
      </Card>
    </LinkRendererProvider>,
  );

  const link = screen.getByRole("link", { name: "Download Tomato Soup" });
  expect(link.getAttribute("data-router")).toBeNull();
  expect(link.hasAttribute("download")).toBe(true);
});

test("supports the subtle variant on an interactive card", () => {
  render(
    <Card
      data-testid="card"
      label="View Tomato Soup"
      render={<a href="https://example.com/recipes/tomato-soup" />}
      variant="subtle"
    >
      Tomato Soup
    </Card>,
  );

  expect(screen.getByTestId("card").getAttribute("data-variant")).toBe("subtle");
});

test.each([
  ["light", "default", "rgb(255, 255, 255)", "0, 0, 0"],
  ["light", "subtle", "rgb(245, 245, 245)", "0, 0, 0"],
  ["dark", "default", "rgb(23, 23, 23)", "255, 255, 255"],
  ["dark", "subtle", "rgb(38, 38, 38)", "255, 255, 255"],
] as const)(
  "layers neutral hover and active colors over the %s %s card surface",
  async (theme, variant, surface, neutral) => {
    document.documentElement.dataset.theme = theme;
    let activeBackground: { color: string; image: string } | undefined;

    render(
      <Card
        data-testid="card"
        label="Open recipe"
        onPointerDown={(event) => {
          const style = getComputedStyle(event.currentTarget);
          activeBackground = { color: style.backgroundColor, image: style.backgroundImage };
        }}
        render={<button type="button" />}
        variant={variant}
      >
        Recipe
      </Card>,
    );

    const card = screen.getByTestId("card");
    const defaultStyle = getComputedStyle(card);

    expect(defaultStyle.backgroundColor).toBe(surface);
    expect(defaultStyle.backgroundImage).toBe("none");

    await userEvent.hover(card);

    const hoverStyle = getComputedStyle(card);
    expect(hoverStyle.backgroundColor).toBe(surface);
    expect(hoverStyle.backgroundImage).toContain(`rgba(${neutral}, 0.06)`);

    await userEvent.click(card);

    expect(activeBackground?.color).toBe(surface);
    expect(activeBackground?.image).toContain(`rgba(${neutral}, 0.12)`);
  },
);

test("composes the primary control with Next.js Link", () => {
  render(
    <Card data-testid="card" label="View Tomato Soup" render={<Link href="/recipes/tomato-soup" />}>
      Tomato Soup
    </Card>,
  );

  const card = screen.getByTestId("card");
  const link = screen.getByRole("link", { name: "View Tomato Soup" });

  expect(link).toBeInstanceOf(HTMLAnchorElement);
  expect(link.getAttribute("href")).toBe("/recipes/tomato-soup");
  expect(link.classList.contains(styles.primaryControl)).toBe(true);
  expect(card.getAttribute("role")).toBeNull();
  expect(card.getAttribute("tabindex")).toBeNull();
});

test("keeps the primary button as the card's only named primary action", () => {
  render(
    <Card data-testid="card" label="Save Tomato Soup" render={<button type="button" />}>
      Tomato Soup
    </Card>,
  );

  const button = screen.getByRole("button", { name: "Save Tomato Soup" });

  expect(screen.getAllByRole("button", { name: "Save Tomato Soup" })).toHaveLength(1);
  expect(button).toBeInstanceOf(HTMLButtonElement);
  expect(button.classList.contains(styles.primaryControl)).toBe(true);
});

test("keeps the hidden primary control in the tab order and focuses the visible card", () => {
  render(
    <Card
      data-testid="card"
      label="View Tomato Soup"
      render={<a href="https://example.com/recipes/tomato-soup" />}
    >
      Tomato Soup
    </Card>,
  );

  const card = screen.getByTestId("card");
  const link = screen.getByRole("link", { name: "View Tomato Soup" });

  expect(link.tabIndex).toBe(0);

  link.focus();

  expect(document.activeElement).toBe(link);
  expect(card.matches(`:has(.${styles.primaryControl}:focus-visible)`)).toBe(true);
});

test("activates the primary control once when clicking unused card space", () => {
  const handleClick = vi.fn();

  render(
    <Card
      data-testid="card"
      label="Save Tomato Soup"
      render={<button onClick={handleClick} type="button" />}
    >
      Tomato Soup
    </Card>,
  );

  fireEvent.click(screen.getByTestId("card"));

  expect(handleClick).toHaveBeenCalledTimes(1);
});

test("does not proxy activation from nested interactive controls or selected text", () => {
  const handleClick = vi.fn();

  render(
    <Card
      data-testid="card"
      label="View Tomato Soup"
      render={<button onClick={handleClick} type="button" />}
    >
      <a href="https://example.com/recipes/tomato-soup/edit">Edit recipe</a>
      <button type="button">Save notes</button>
      <p>Tomato soup</p>
    </Card>,
  );

  fireEvent.click(screen.getByRole("link", { name: "Edit recipe" }));
  fireEvent.click(screen.getByRole("button", { name: "Save notes" }));

  const text = screen.getByText("Tomato soup");
  const selection = window.getSelection();
  const range = document.createRange();

  range.selectNodeContents(text);
  selection?.removeAllRanges();
  selection?.addRange(range);
  fireEvent.click(text);
  selection?.removeAllRanges();

  expect(handleClick).not.toHaveBeenCalled();
});

test("opens the rendered link URL in a new tab for modifier and middle clicks", () => {
  const open = vi.spyOn(window, "open").mockReturnValue(null);

  render(
    <Card
      data-testid="card"
      label="View Tomato Soup"
      render={<a href="https://example.com/recipes/tomato-soup" />}
    >
      Tomato Soup
    </Card>,
  );

  const card = screen.getByTestId("card");
  const link = screen.getByRole("link", { name: "View Tomato Soup" }) as HTMLAnchorElement;

  fireEvent.click(card, { ctrlKey: true });
  fireEvent.click(card, { metaKey: true });
  fireEvent(card, new MouseEvent("auxclick", { bubbles: true, button: 1 }));

  expect(open).toHaveBeenCalledTimes(3);
  expect(open).toHaveBeenNthCalledWith(1, link.href, "_blank", "noopener");
  expect(open).toHaveBeenNthCalledWith(2, link.href, "_blank", "noopener");
  expect(open).toHaveBeenNthCalledWith(3, link.href, "_blank", "noopener");

  open.mockRestore();
});
