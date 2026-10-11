import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";

import "../../app/globals.css";
import { RecipeView } from "./recipe-view-component";
import { getRecipeViewState } from "./recipe-view-state";

const documentRecipe = {
  id: "00000000-0000-4000-8000-000000000401",
  title: "Ginger fried rice",
  description: "A quick dinner for leftover rice.",
  time: { prepMinutes: 10, cookMinutes: 12, totalMinutes: 22 },
  ingredients: [
    { name: "cooked white rice", amount: "6 cups", note: "cooled" },
    { name: "garlic", amount: "3 cloves", note: "minced" },
  ],
  equipment: [{ name: "Wok", note: "or large skillet" }],
  instructions: ["Heat the wok. (Duration: 2 minutes)", "Add rice and stir-fry until hot."],
  notes: ["Use day-old rice for the best texture.", "Add chili crisp to serve."],
  tags: ["quick", "dinner"],
  sourceUrl: "https://example.com/ginger-fried-rice",
};

test("renders the new structured get_recipe document payload without an error state", () => {
  const state = getRecipeViewState({ recipe: documentRecipe, revision: 4 });

  expect(state.state).toBe("recipe");
  render(<RecipeView {...state} />);

  expect(screen.getByRole("heading", { name: "Ginger fried rice", level: 1 })).toBeInTheDocument();
  expect(screen.getByText("Prep: 10 min · Cook: 12 min · Total: 22 min")).toBeInTheDocument();
  expect(screen.getByText("6 cups cooked white rice (cooled)")).toBeInTheDocument();
  expect(screen.getByText("3 cloves garlic (minced)")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Equipment", level: 2 })).toBeInTheDocument();
  expect(screen.getByText("Wok (or large skillet)")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Instructions", level: 2 })).toBeInTheDocument();
  expect(screen.getByText("Heat the wok. (Duration: 2 minutes)")).toBeInTheDocument();
  expect(screen.getByText("Use day-old rice for the best texture.")).toBeInTheDocument();
  expect(screen.getByText("Tag: quick")).toBeInTheDocument();
  expect(screen.getByText("https://example.com/ginger-fried-rice").closest("p")?.textContent).toBe(
    "Source: https://example.com/ginger-fried-rice",
  );
  expect(screen.queryByText(documentRecipe.id)).toBeNull();
  expect(screen.queryByText("revision")).toBeNull();
  expect(screen.queryByRole("button")).toBeNull();
});

test("renders optional yield and empty optional sections", () => {
  const state = getRecipeViewState({
    recipe: {
      ...documentRecipe,
      title: "Plain rice",
      description: "",
      yield: undefined,
      time: {},
      equipment: [],
      notes: [],
      tags: [],
      sourceUrl: undefined,
    },
    revision: 1,
  });

  expect(state.state).toBe("recipe");
  render(<RecipeView {...state} />);
  expect(screen.getByRole("heading", { name: "Plain rice", level: 1 })).toBeInTheDocument();
  expect(screen.queryByText(/Yield:|Prep:|Cook:|Total:/u)).toBeNull();
  expect(screen.queryByRole("heading", { name: "Equipment" })).toBeNull();
  expect(screen.queryByRole("heading", { name: "Notes" })).toBeNull();
});
