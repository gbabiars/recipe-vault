"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { Recipe } from "@/lib/db/recipe-repository";
import { saveRecipeAction } from "./actions";
import { emptyRecipeFormState } from "./recipe-form-state";

type IngredientRow = { quantity?: number; unit?: string; ingredientName?: string; notes?: string };
type StepRow = { instruction?: string; durationMinutes?: number };
const blankIngredient: IngredientRow = { quantity: 1, unit: "", ingredientName: "", notes: "" };
const blankStep: StepRow = { instruction: "", durationMinutes: undefined };
const errorFor = (errors: Record<string, string>, key: string) =>
  errors[key] || errors[key.split(".")[0]];

export function RecipeForm({ recipe }: { recipe?: Recipe }) {
  const [state, action, pending] = useActionState(saveRecipeAction, emptyRecipeFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    recipe?.ingredients.length ? recipe.ingredients : [blankIngredient],
  );
  const [steps, setSteps] = useState<StepRow[]>(recipe?.steps.length ? recipe.steps : [blankStep]);
  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state.errors]);
  const field = (
    name: string,
    label: string,
    type = "text",
    defaultValue?: string | number,
    hint?: string,
    errorKey = name,
  ) => (
    <label className="field">
      {label}
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        aria-invalid={errorFor(state.errors, errorKey) ? true : undefined}
        aria-describedby={errorFor(state.errors, errorKey) ? `${name}-error` : undefined}
      />
      {hint && <small>{hint}</small>}
      {errorFor(state.errors, errorKey) && (
        <span id={`${name}-error`} className="field-error">
          {errorFor(state.errors, errorKey)}
        </span>
      )}
    </label>
  );
  return (
    <form ref={formRef} action={action} className="recipe-form" noValidate>
      {recipe && <input type="hidden" name="recipeId" value={recipe.id} />}
      {state.message && (
        <p className="form-message" role="alert">
          {state.message}
        </p>
      )}
      <section>
        <h2>Recipe details</h2>
        {field("title", "Title", "text", recipe?.title)}
        <label className="field">
          Summary
          <textarea
            name="summary"
            defaultValue={recipe?.summary}
            aria-invalid={errorFor(state.errors, "summary") ? true : undefined}
            aria-describedby={errorFor(state.errors, "summary") ? "summary-error" : undefined}
          />
          {errorFor(state.errors, "summary") && (
            <span id="summary-error" className="field-error">
              {errorFor(state.errors, "summary")}
            </span>
          )}
        </label>
        <div className="form-grid">
          {field("servings", "Servings", "number", recipe?.servings)}
          {field("prepTimeMinutes", "Prep time (minutes)", "number", recipe?.prepTimeMinutes)}
          {field("cookTimeMinutes", "Cook time (minutes)", "number", recipe?.cookTimeMinutes)}
          {field("totalTimeMinutes", "Total time (minutes)", "number", recipe?.totalTimeMinutes)}
        </div>
        <div className="form-grid">
          {field("tags", "Tags", "text", recipe?.tags.join(", "), "Separate labels with commas")}
          {field(
            "dietaryFlags",
            "Dietary flags",
            "text",
            recipe?.dietaryFlags.join(", "),
            "Separate labels with commas",
          )}
        </div>
        {field("sourceUrl", "Source URL", "url", recipe?.sourceUrl)}
        <label className="field">
          Notes
          <textarea
            name="notes"
            defaultValue={recipe?.notes}
            aria-invalid={errorFor(state.errors, "notes") ? true : undefined}
            aria-describedby={errorFor(state.errors, "notes") ? "notes-error" : undefined}
          />
          {errorFor(state.errors, "notes") && (
            <span id="notes-error" className="field-error">
              {errorFor(state.errors, "notes")}
            </span>
          )}
        </label>
      </section>
      <section>
        <div className="section-heading">
          <h2>Ingredients</h2>
          <button type="button" onClick={() => setIngredients([...ingredients, blankIngredient])}>
            Add ingredient
          </button>
        </div>
        <input type="hidden" name="ingredientCount" value={ingredients.length} />
        {ingredients.map((ingredient, index) => (
          <fieldset className="repeat-row" key={index}>
            <legend>Ingredient {index + 1}</legend>
            {field(
              `ingredient-${index}-quantity`,
              "Quantity",
              "number",
              ingredient.quantity,
              undefined,
              `ingredients.${index}.quantity`,
            )}
            {field(
              `ingredient-${index}-unit`,
              "Unit",
              "text",
              ingredient.unit,
              undefined,
              `ingredients.${index}.unit`,
            )}
            {field(
              `ingredient-${index}-name`,
              "Ingredient name",
              "text",
              ingredient.ingredientName,
              undefined,
              `ingredients.${index}.ingredientName`,
            )}
            {field(
              `ingredient-${index}-notes`,
              "Notes (optional)",
              "text",
              ingredient.notes,
              undefined,
              `ingredients.${index}.notes`,
            )}
            {ingredients.length > 1 && (
              <button
                type="button"
                className="text-button"
                onClick={() => setIngredients(ingredients.filter((_, row) => row !== index))}
              >
                Remove ingredient {index + 1}
              </button>
            )}
          </fieldset>
        ))}
      </section>
      <section>
        <div className="section-heading">
          <h2>Steps</h2>
          <button type="button" onClick={() => setSteps([...steps, blankStep])}>
            Add step
          </button>
        </div>
        <input type="hidden" name="stepCount" value={steps.length} />
        {steps.map((step, index) => (
          <fieldset className="repeat-row" key={index}>
            <legend>Step {index + 1}</legend>
            <label className="field">
              Instruction
              <textarea
                name={`step-${index}-instruction`}
                defaultValue={step.instruction}
                aria-invalid={
                  errorFor(state.errors, `steps.${index}.instruction`) ? true : undefined
                }
                aria-describedby={
                  errorFor(state.errors, `steps.${index}.instruction`)
                    ? `step-${index}-instruction-error`
                    : undefined
                }
              />
              {errorFor(state.errors, `steps.${index}.instruction`) && (
                <span id={`step-${index}-instruction-error`} className="field-error">
                  {errorFor(state.errors, `steps.${index}.instruction`)}
                </span>
              )}
            </label>
            {field(
              `step-${index}-durationMinutes`,
              "Duration (minutes, optional)",
              "number",
              step.durationMinutes,
              undefined,
              `steps.${index}.durationMinutes`,
            )}
            {steps.length > 1 && (
              <button
                type="button"
                className="text-button"
                onClick={() => setSteps(steps.filter((_, row) => row !== index))}
              >
                Remove step {index + 1}
              </button>
            )}
          </fieldset>
        ))}
      </section>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : recipe ? "Save changes" : "Create recipe"}
      </Button>
    </form>
  );
}
