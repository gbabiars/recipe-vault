"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { CheckboxInput } from "@/components/ui/checkbox";
import { emptyRecipeFormState, type RecipeFormState } from "./recipe-form-state";
import { Inline } from "@/components/ui/inline";
import { Stack } from "@/components/ui/stack";

export type DeleteRecipeAction = (
  state: RecipeFormState,
  formData: FormData,
) => Promise<RecipeFormState>;

export function DeleteRecipeForm({
  recipeId,
  deleteAction,
}: {
  recipeId: string;
  deleteAction: DeleteRecipeAction;
}) {
  const [state, action, pending] = useActionState(deleteAction, emptyRecipeFormState);
  return (
    <form action={action}>
      <Stack gap="150">
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
        <Inline>
          <Button type="submit" variant="danger" disabled={pending}>
            {pending ? "Deleting…" : "Delete recipe"}
          </Button>
        </Inline>
      </Stack>
    </form>
  );
}
