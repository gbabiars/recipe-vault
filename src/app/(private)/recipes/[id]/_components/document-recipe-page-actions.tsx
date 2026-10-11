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
import {
  deleteRecipeDocumentAction,
  type RecipeDocumentDeleteActionResult,
} from "../../_actions/recipe-document-actions";

type DeleteAction = (
  recipeId: string,
  expectedRevision: number,
) => Promise<RecipeDocumentDeleteActionResult>;

export function DocumentRecipePageActions({
  recipeId,
  recipeTitle,
  revision,
  editHref,
}: {
  recipeId: string;
  recipeTitle: string;
  revision: number;
  editHref: string;
}) {
  const router = useRouter();
  return (
    <DocumentRecipePageActionsView
      recipeId={recipeId}
      recipeTitle={recipeTitle}
      revision={revision}
      editHref={editHref}
      deleteAction={deleteRecipeDocumentAction}
      navigate={(href) => router.push(href)}
    />
  );
}

/** Client-side controls for a recipe document snapshot and its revision. */
export function DocumentRecipePageActionsView({
  recipeId,
  recipeTitle,
  revision,
  editHref,
  deleteAction,
  navigate,
}: {
  recipeId: string;
  recipeTitle: string;
  revision: number;
  editHref: string;
  deleteAction: DeleteAction;
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
    try {
      const result = await deleteAction(recipeId, revision);
      if (result.status === "conflict") {
        setError("This recipe changed after this page loaded. Refresh the page, then try again.");
        return;
      }
      if (result.status === "not_found") {
        setError("This recipe is no longer available.");
        return;
      }
      if (result.status === "invalid") {
        setError("Unable to delete this recipe. Refresh the page and try again.");
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
        onOpenChange={(open) => {
          if (!pending || open) setDialogOpen(open);
        }}
        title={`Delete ${recipeTitle}?`}
        description={
          <>
            <p>This permanently deletes the recipe.</p>
            {error && <p role="alert">{error}</p>}
          </>
        }
        confirmLabel="Delete recipe"
        confirmVariant="danger"
        pending={pending}
        onConfirm={deleteRecipe}
      />
    </>
  );
}
