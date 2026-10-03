import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";

import "../../../app/globals.css";

import { Avatar } from "./avatar";
import { avatarImageFixtureUrl } from "./avatar-image-fixture";
import styles from "./avatar.module.css";

test("renders uppercase first and last initials with the full name as its accessible name", () => {
  render(<Avatar name="Ada Lovelace" />);

  const avatar = screen.getByRole("img", { name: "Ada Lovelace" });

  expect(avatar.textContent).toBe("AL");
  expect(avatar.getAttribute("data-size")).toBe("medium");
  expect(avatar.classList.contains(styles.avatar)).toBe(true);
});

test.each([
  ["Lovelace", "L"],
  ["Ada Byron Lovelace", "AL"],
  ["  Ada   Lovelace  ", "AL"],
  ["a\u030Ava Example", "A\u030AE"],
])("derives initials from %s", (name, initials) => {
  render(<Avatar name={name} />);

  expect(screen.getByRole("img").textContent).toBe(initials);
});

test("renders the provided image and preserves the accessible name", async () => {
  render(<Avatar name="Ada Lovelace" imageUrl={avatarImageFixtureUrl} />);

  const avatar = screen.getByRole("img", { name: "Ada Lovelace" });
  const image = avatar.querySelector("img");

  expect(image).toHaveAttribute("src", avatarImageFixtureUrl);
  expect(window.getComputedStyle(image!).objectFit).toBe("cover");
  await waitFor(() => expect(image).not.toHaveAttribute("data-loading"));
  expect(screen.getByRole("img", { name: "Ada Lovelace" })).toBe(avatar);
});

test("uses name-derived initials when the image URL is blank", () => {
  render(<Avatar name="Ada Lovelace" imageUrl="  " />);

  const avatar = screen.getByRole("img", { name: "Ada Lovelace" });

  expect(avatar.textContent).toBe("AL");
  expect(avatar.querySelector("img")).toBeNull();
});

test("keeps name-derived initials visible when the image fails to load", async () => {
  render(<Avatar name="Ada Lovelace" imageUrl="data:image/png;base64,not-an-image" />);

  const avatar = screen.getByRole("img", { name: "Ada Lovelace" });
  const image = avatar.querySelector("img");

  expect(image).not.toBeNull();
  fireEvent.error(image!);
  await waitFor(() => expect(image).toHaveAttribute("data-error"));
  expect(avatar.textContent).toBe("AL");
  expect(window.getComputedStyle(image!).visibility).toBe("hidden");
  expect(screen.getByRole("img", { name: "Ada Lovelace" })).toBe(avatar);
});

test("renders a blank name as a decorative avatar without letters", () => {
  const { container } = render(<Avatar name="  " />);
  const avatar = container.querySelector("span");

  expect(avatar).not.toBeNull();
  expect(avatar).toHaveAttribute("aria-hidden", "true");
  expect(avatar?.querySelector("svg")).not.toBeNull();
  expect(avatar?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  expect(screen.queryByRole("img")).not.toBeInTheDocument();
});

test.each([
  ["small", "24px", "12px"],
  ["medium", "32px", "14px"],
  ["large", "40px", "16px"],
] as const)("applies the %s size", (size, dimension, fontSize) => {
  render(<Avatar name="Ada Lovelace" size={size} />);

  const avatar = screen.getByRole("img", { name: "Ada Lovelace" });
  const computedStyle = window.getComputedStyle(avatar);

  expect(avatar.getAttribute("data-size")).toBe(size);
  expect(computedStyle.width).toBe(dimension);
  expect(computedStyle.height).toBe(dimension);
  expect(computedStyle.fontSize).toBe(fontSize);
});

test("forwards span props and refs and lets caller accessibility attributes override defaults", () => {
  const ref = { current: null as HTMLSpanElement | null };

  render(
    <Avatar
      ref={ref}
      name="Ada Lovelace"
      aria-label="Recipe author"
      data-testid="recipe-author-avatar"
      id="recipe-author"
      role="group"
      title="Recipe author"
    />,
  );

  const avatar = screen.getByRole("group", { name: "Recipe author" });

  expect(ref.current).toBe(avatar);
  expect(avatar.id).toBe("recipe-author");
  expect(avatar.title).toBe("Recipe author");
});
