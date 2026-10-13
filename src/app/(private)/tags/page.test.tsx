import { cleanup, render, screen } from "@testing-library/react";
import { Children, isValidElement, Suspense, type ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { PageContent, PageHeader } from "@/components/ui/page-layout";
import TagsPage from "./page";

vi.mock("@/lib/auth/require-user", () => ({
  requireUser: async () => ({ id: "owner-ada" }),
}));
vi.mock("@/lib/recipes", () => ({
  getTagService: async () => ({ listFromRecipes: async () => ({ tags: [], hasMore: false }) }),
}));

afterEach(() => cleanup());

test("shows the tags header and skeleton while the inventory is loading", async () => {
  const page = await TagsPage({ searchParams: Promise.resolve({}) });
  if (!isValidElement<{ children: ReactNode }>(page)) throw new Error("Missing tags page");
  const pageChildren = Children.toArray(page.props.children);
  const header = pageChildren[0];
  const content = pageChildren[1];

  expect(isValidElement(header) && header.type === PageHeader).toBe(true);
  if (!isValidElement<{ children: ReactNode }>(content) || content.type !== PageContent) {
    throw new Error("Missing page content");
  }
  const boundary = Children.only(content.props.children);
  expect(isValidElement(boundary) && boundary.type === Suspense).toBe(true);
  if (!isValidElement<{ fallback: ReactNode }>(boundary) || boundary.type !== Suspense) {
    throw new Error("Missing tags Suspense boundary");
  }

  render(boundary.props.fallback);
  expect(screen.getByRole("status", { name: "Loading tags" })).toBeInTheDocument();
  expect(screen.getAllByRole("listitem")).toHaveLength(5);
  expect(screen.getByRole("navigation", { name: "Tag pages" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
});
