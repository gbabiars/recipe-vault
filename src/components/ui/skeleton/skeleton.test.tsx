import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Skeleton, SkeletonAvatar, SkeletonHeading, SkeletonText } from "./skeleton";

describe("Skeleton", () => {
  it("uses simple dimension and radius defaults and supports overrides", () => {
    render(
      <>
        <Skeleton data-testid="default" />
        <Skeleton data-testid="custom" width="12rem" height="2rem" radius="150" />
      </>,
    );

    expect(screen.getByTestId("default")).toHaveStyle({ width: "100%", height: "1em" });
    expect(screen.getByTestId("default")).toHaveAttribute("data-radius", "050");
    expect(screen.getByTestId("custom")).toHaveStyle({ width: "12rem", height: "2rem" });
    expect(screen.getByTestId("custom")).toHaveAttribute("data-radius", "150");
  });

  it("matches Text and Heading line-height tokens", () => {
    render(
      <>
        <SkeletonText data-testid="text" size="large" width="70%" />
        <SkeletonHeading data-testid="heading" level={3} />
      </>,
    );

    expect(screen.getByTestId("text")).toHaveStyle({
      width: "70%",
      height: "var(--line-height-text-large)",
      paddingBlock: "calc((var(--line-height-text-large) - var(--font-size-text-large)) / 2)",
    });
    expect(screen.getByTestId("text")).toHaveAttribute("data-size", "large");
    expect(screen.getByTestId("text").firstElementChild).toHaveStyle({
      height: "var(--font-size-text-large)",
      width: "100%",
    });
    expect(screen.getByTestId("heading")).toHaveStyle({ height: "var(--line-height-heading-3)" });
    expect(screen.getByTestId("heading")).toHaveAttribute("data-level", "3");
    expect(screen.getByTestId("heading").tagName).toBe("DIV");
    expect(screen.getByTestId("heading").firstElementChild).toHaveStyle({
      height: "var(--font-size-heading-3)",
      width: "100%",
    });
  });

  it("matches the Avatar size scale and remains decorative", () => {
    render(
      <>
        <SkeletonAvatar data-testid="small" size="small" />
        <SkeletonAvatar data-testid="medium" />
        <SkeletonAvatar data-testid="large" size="large" />
      </>,
    );

    expect(screen.getByTestId("small")).toHaveStyle({ width: "24px", height: "24px" });
    expect(screen.getByTestId("medium")).toHaveStyle({ width: "32px", height: "32px" });
    expect(screen.getByTestId("large")).toHaveStyle({ width: "40px", height: "40px" });
    for (const skeleton of screen.getAllByTestId(/small|medium|large/)) {
      expect(skeleton).toHaveAttribute("aria-hidden", "true");
      expect(skeleton).toHaveAttribute("data-radius", "full");
    }
  });
});
