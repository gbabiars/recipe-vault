"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stack } from "@/components/ui/stack";
import { Text } from "@/components/ui/text";
import { RecipeImportError } from "./import-recipe-from-api";
import { importRecipeDocumentFromApi } from "./import-recipe-document-from-api";

export type RecipeDocumentImporter = (file: File) => Promise<{ id: string }>;

export function RecipeDocumentImportForm({
  importRecipe,
}: {
  importRecipe: RecipeDocumentImporter;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File>();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !file) return;
    setPending(true);
    setError(undefined);
    try {
      const { id } = await importRecipe(file);
      router.push(`/recipes/${encodeURIComponent(id)}`);
    } catch (failure) {
      setError(
        failure instanceof RecipeImportError
          ? failure.message
          : "We could not import this PDF. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate>
        <Stack gap="200">
          <h2>Import from a PDF</h2>
          <div>
            <label htmlFor="recipe-pdf">Recipe PDF</label>
            <input
              id="recipe-pdf"
              name="file"
              type="file"
              accept="application/pdf,.pdf"
              required
              aria-describedby="recipe-pdf-help"
              onChange={(event) => setFile(event.target.files?.[0])}
            />
            <Text as="p" id="recipe-pdf-help" size="small" appearance="secondary">
              PDF with embedded text only, up to 3 MB. Scanned images are not supported.
            </Text>
          </div>
          {error && (
            <div role="alert">
              <Text as="p" appearance="error">
                <strong>Could not import PDF.</strong> {error}
              </Text>
            </div>
          )}
          <div>
            <Button
              label={pending ? "Importing PDF…" : "Import PDF"}
              type="submit"
              variant="primary"
              disabled={pending || !file}
            />
          </div>
        </Stack>
      </form>
    </Card>
  );
}

export function RecipeDocumentImportPageForm() {
  return <RecipeDocumentImportForm importRecipe={importRecipeDocumentFromApi} />;
}
