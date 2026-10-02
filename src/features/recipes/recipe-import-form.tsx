"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stack } from "@/components/ui/stack";
import { TextInput } from "@/components/ui/text-input";
import { importRecipeFromApi, RecipeImportError } from "./import-recipe-from-api";

export type RecipeImporter = (url: string) => Promise<{ id: string }>;

export function RecipeImportForm({ importRecipe }: { importRecipe: RecipeImporter }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(undefined);
    try {
      const { id } = await importRecipe(url);
      router.push(`/recipes/${encodeURIComponent(id)}`);
    } catch (failure) {
      setError(
        failure instanceof RecipeImportError
          ? failure.message
          : "We could not import this recipe. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <form onSubmit={submit}>
        <Stack gap="200">
          <TextInput
            name="url"
            label="Recipe website URL"
            type="url"
            required
            value={url}
            onValueChange={setUrl}
          />
          {error && (
            <div role="alert">
              <Alert title="Could not import recipe" description={error} variant="danger" />
            </div>
          )}
          <div>
            <Button
              label={pending ? "Importing…" : "Import recipe"}
              type="submit"
              variant="primary"
              disabled={pending}
            />
          </div>
        </Stack>
      </form>
    </Card>
  );
}

export function RecipeImportPageForm() {
  return <RecipeImportForm importRecipe={importRecipeFromApi} />;
}
