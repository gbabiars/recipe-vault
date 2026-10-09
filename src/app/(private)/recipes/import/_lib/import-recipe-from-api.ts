export class RecipeImportError extends Error {}

export async function importRecipeFromApi(url: string): Promise<{ id: string }> {
  let response: Response;
  try {
    response = await fetch("/api/v1/recipes/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch {
    throw new RecipeImportError("The page could not be reached. Please try again.");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const code = body?.error?.code;
    const details: Record<string, string> = {
      invalid_request: "Enter a valid website URL.",
      blocked_destination: "This website address cannot be imported.",
      access_denied:
        "This website blocked automated access. Try another source or create the recipe manually.",
      unreachable: "The page could not be reached.",
      too_large: "This page is too large to import.",
      no_recipe: "No complete recipe was found.",
      extraction_failed: "The recipe could not be extracted. Please try again.",
      unauthenticated: "Please sign in and try again.",
      rate_limited: "Too many imports. Please wait and try again.",
    };
    throw new RecipeImportError(
      Object.hasOwn(details, code)
        ? details[code]
        : "We could not import this recipe. Please try again.",
    );
  }
  const body = await response.json().catch(() => null);
  if (typeof body?.data?.id !== "string" || !body.data.id)
    throw new RecipeImportError("We could not import this recipe. Please try again.");
  return { id: body.data.id };
}
