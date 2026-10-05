"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuPopup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { emptyRecipeFormState, type RecipeFormState } from "./recipe-form-state";

export type DeleteRecipeAction = (
  state: RecipeFormState,
  formData: FormData,
) => Promise<RecipeFormState>;

export function RecipePageActions({
  recipeId,
  recipeTitle,
  editHref,
  deleteAction,
}: {
  recipeId: string;
  recipeTitle: string;
  editHref: string;
  deleteAction: DeleteRecipeAction;
}) {
  const router = useRouter();
  return (
    <RecipePageActionsView
      recipeId={recipeId}
      recipeTitle={recipeTitle}
      editHref={editHref}
      deleteAction={deleteAction}
      navigate={(href) => router.push(href)}
    />
  );
}

export function RecipePageActionsView({
  recipeId,
  recipeTitle,
  editHref,
  deleteAction,
  navigate,
}: {
  recipeId: string;
  recipeTitle: string;
  editHref: string;
  deleteAction: DeleteRecipeAction;
  navigate: (href: string) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const { showToast } = useToast();

  async function deleteRecipe() {
    if (pending) return;
    setPending(true);
    setError(undefined);
    const formData = new FormData();
    formData.set("recipeId", recipeId);
    formData.set("confirmDelete", "delete");
    try {
      const result = await deleteAction(emptyRecipeFormState, formData);
      if (!result.deleted) {
        setError(result.message ?? "Unable to delete this recipe. Please try again.");
        return;
      }
      setDialogOpen(false);
      showToast({
        title: "Recipe deleted",
        description: `${recipeTitle} was deleted.`,
        variant: "success",
      });
      navigate("/recipes");
    } catch {
      setError("Unable to delete this recipe. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button label="Actions" />} />
        <DropdownMenuPopup align="end">
          <DropdownMenuLinkItem icon={Pencil} href={editHref}>
            Edit recipe
          </DropdownMenuLinkItem>
          <DropdownMenuItem variant="danger" icon={Trash2} onClick={() => setDialogOpen(true)}>
            Delete recipe
          </DropdownMenuItem>
        </DropdownMenuPopup>
      </DropdownMenu>
      <AlertDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={`Delete ${recipeTitle}?`}
        description={
          <>
            <p>This permanently deletes the recipe.</p>
            {error && <p role="alert">{error}</p>}
          </>
        }
        confirmLabel={pending ? "Deleting…" : "Delete recipe"}
        confirmVariant="danger"
        onConfirm={deleteRecipe}
      />
    </>
  );
}
