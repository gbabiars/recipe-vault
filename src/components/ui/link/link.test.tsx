import * as React from "react";
import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";

import { Link } from "./link";
import { LinkRendererProvider, type LinkRendererProps } from "../link-renderer";
import "../../../app/globals.css";
import styles from "./link.module.css";

const RouterLink = React.forwardRef<HTMLAnchorElement, LinkRendererProps>(
  function RouterLink(props, ref) {
    return <a {...props} ref={ref} data-router="test" />;
  },
);

test("falls back to a native anchor and forwards link attributes and ref", () => {
  const ref = React.createRef<HTMLElement>();
  render(
    <Link href="/recipes" target="_blank" title="Browse recipes" ref={ref} data-kind="primary">
      Browse recipes
    </Link>,
  );

  const anchor = screen.getByRole("link", { name: "Browse recipes" });
  expect(anchor).toBeInstanceOf(HTMLAnchorElement);
  expect(anchor).toHaveAttribute("href", "/recipes");
  expect(anchor).toHaveAttribute("target", "_blank");
  expect(anchor).toHaveAttribute("data-kind", "primary");
  expect(anchor).toHaveClass(styles.link);
  expect(ref.current).toBe(anchor);
});

test("uses the provider renderer and lets caller attributes override its defaults", () => {
  render(
    <LinkRendererProvider link={<RouterLink href="/" target="_self" />}>
      <Link href="/help" target="_blank" aria-label="Help center">
        Help
      </Link>
    </LinkRendererProvider>,
  );

  const anchor = screen.getByRole("link", { name: "Help center" });
  expect(anchor).toHaveAttribute("href", "/help");
  expect(anchor).toHaveAttribute("target", "_blank");
  expect(anchor).toHaveAttribute("data-router", "test");
});

test("passes attributes and refs through an anchor override", () => {
  const ref = React.createRef<HTMLElement>();
  render(
    <Link render={<a />} href="/help" target="_blank" download ref={ref}>
      Help
    </Link>,
  );

  const anchor = screen.getByRole("link", { name: "Help" });
  expect(anchor).toHaveAttribute("href", "/help");
  expect(anchor).toHaveAttribute("target", "_blank");
  expect(anchor).toHaveAttribute("download");
  expect(ref.current).toBe(anchor);
});

test("supports a button action without href and defaults its type to button", () => {
  const onClick = vi.fn();
  const ref = React.createRef<HTMLElement>();
  render(
    <Link render={<button />} onClick={onClick} ref={ref}>
      Open help
    </Link>,
  );

  const button = screen.getByRole("button", { name: "Open help" });
  expect(button).toHaveAttribute("type", "button");
  expect(button).toHaveClass(styles.link);
  expect(ref.current).toBe(button);
  button.click();
  expect(onClick).toHaveBeenCalledTimes(1);
});

test("preserves a caller supplied button type", () => {
  render(
    <Link render={<button />} type="submit">
      Submit
    </Link>,
  );
  expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute("type", "submit");
});
