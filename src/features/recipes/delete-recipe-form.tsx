"use client";

import { useActionState } from "react";
import { deleteRecipeAction, emptyRecipeFormState } from "./actions";

export function DeleteRecipeForm({ recipeId }: { recipeId: string }) {
  const [state, action, pending] = useActionState(deleteRecipeAction, emptyRecipeFormState);
  return <form action={action} className="delete-form"><input type="hidden" name="recipeId" value={recipeId} />
    <label><input type="checkbox" name="confirmDelete" value="delete" /> I understand this permanently deletes the recipe.</label>
    {state.errors.confirmDelete && <p className="field-error" role="alert">{state.errors.confirmDelete}</p>}{state.message && <p className="field-error" role="alert">{state.message}</p>}
    <button className="danger-button" disabled={pending}>{pending ? "Deleting…" : "Delete recipe"}</button>
  </form>;
}
