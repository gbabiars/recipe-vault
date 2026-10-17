import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { RecipePreviewCard } from "./recipe-preview-card";

const recipe = {
  title: "Tomato soup",
  description: "A simple soup with fresh basil.",
  time: { totalMinutes: 30 },
  tags: ["soup", "vegetarian", "weeknight"],
};

test("renders the compact recipe preview as a named link when href is supplied", () => {
  render(<RecipePreviewCard recipe={recipe} href="/recipes/tomato-soup" />);

  expect(screen.getByRole("link", { name: "View Tomato soup" })).toHaveAttribute(
    "href",
    "/recipes/tomato-soup",
  );
  expect(screen.getByRole("article")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Tomato soup", level: 2 })).toBeInTheDocument();
  expect(screen.getByText("A simple soup with fresh basil.")).toBeInTheDocument();
  expect(screen.getByText("30 min")).toBeInTheDocument();
  expect(screen.getByText("soup")).toBeInTheDocument();
  expect(screen.getByText("vegetarian")).toBeInTheDocument();
  expect(screen.getByText("+1")).toBeInTheDocument();
  expect(screen.queryByText("weeknight")).toBeNull();
});

test("renders without link semantics when href is omitted", () => {
  render(<RecipePreviewCard recipe={recipe} />);

  expect(screen.getByRole("article")).toBeInTheDocument();
  expect(screen.queryByRole("link")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});
