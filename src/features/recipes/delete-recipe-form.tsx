"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { CheckboxInput } from "@/components/ui/checkbox";
import { deleteRecipeAction } from "./actions";
import { emptyRecipeFormState } from "./recipe-form-state";

export function DeleteRecipeForm({ recipeId }: { recipeId: string }) {
  const [state, action, pending] = useActionState(deleteRecipeAction, emptyRecipeFormState);
  return (
    <form action={action} className="delete-form">
      <input type="hidden" name="recipeId" value={recipeId} />
      <CheckboxInput
        name="confirmDelete"
        value="delete"
        label="I understand this permanently deletes the recipe."
        error={state.errors.confirmDelete}
      />
      {state.message && (
        <p className="field-error" role="alert">
          {state.message}
        </p>
      )}
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Deleting…" : "Delete recipe"}
      </Button>
    </form>
  );
}
