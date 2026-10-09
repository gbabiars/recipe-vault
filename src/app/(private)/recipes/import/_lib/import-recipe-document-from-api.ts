import { RecipeImportError } from "./import-recipe-from-api";

export async function importRecipeDocumentFromApi(file: File): Promise<{ id: string }> {
  const form = new FormData();
  form.set("file", file);
  let response: Response;
  try {
    response = await fetch("/api/v1/recipes/import/document", { method: "POST", body: form });
  } catch {
    throw new RecipeImportError("The PDF could not be uploaded. Please try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const messages: Record<string, string> = {
      invalid_request: "Choose one PDF file.",
      invalid_upload: "The upload was empty. Select one PDF and try again.",
      not_pdf: "This file does not have a PDF header. Export it as a PDF and try again.",
      damaged_pdf: "The PDF structure is damaged or incomplete. Re-export it and try again.",
      encrypted_pdf: "Password-protected PDFs cannot be imported.",
      too_large: "Choose a PDF smaller than 3 MB.",
      too_many_pages: "Choose a PDF with 20 pages or fewer.",
      too_much_text: "This PDF contains too much text to import.",
      no_text: "This PDF has no readable text. Scanned images are not supported.",
      upload_timeout: "The PDF upload took too long. Please try again.",
      parse_timeout: "The PDF took too long to read. Please try another file.",
      parser_unavailable: "The server could not start its PDF reader. Please try again later.",
      parse_failed: "The PDF reader could not decode this file. Re-export it and try again.",
      no_recipe: "No complete recipe was found.",
      extraction_failed: "The recipe could not be extracted. Please try again.",
      unauthenticated: "Please sign in and try again.",
      rate_limited: "Too many imports. Please wait and try again.",
    };
    const code: unknown = body?.error?.code;
    throw new RecipeImportError(
      typeof code === "string" && Object.hasOwn(messages, code)
        ? messages[code]
        : "We could not import this PDF. Please try again.",
    );
  }
  if (typeof body?.data?.id !== "string" || !body.data.id)
    throw new RecipeImportError("We could not import this PDF. Please try again.");
  return { id: body.data.id };
}
