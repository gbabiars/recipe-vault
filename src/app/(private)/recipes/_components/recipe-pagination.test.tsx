import { render, screen } from "@testing-library/react";
import { userEvent } from "vitest/browser";
import { expect, test } from "vitest";

import { RecipePagination } from "./recipe-pagination";

test("shows the page position, filtered total, and ordinary links", async () => {
  render(
    <RecipePagination
      page={2}
      pageCount={4}
      total={87}
      previousHref="/recipes?q=soup&tag=quick&page=1"
      nextHref="/recipes?q=soup&tag=quick&page=3"
    />,
  );

  expect(screen.getByRole("navigation", { name: "Recipe pages" })).toBeInTheDocument();
  expect(screen.getByText("Page 2 of 4 · 87 recipes")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
    "href",
    "/recipes?q=soup&tag=quick&page=1",
  );
  expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
    "href",
    "/recipes?q=soup&tag=quick&page=3",
  );

  await userEvent.tab();
  expect(screen.getByRole("link", { name: "Previous" })).toHaveFocus();
});

test("omits navigation for a single page", () => {
  render(<RecipePagination page={1} pageCount={1} total={13} />);
  expect(screen.queryByRole("navigation", { name: "Recipe pages" })).not.toBeInTheDocument();
});
