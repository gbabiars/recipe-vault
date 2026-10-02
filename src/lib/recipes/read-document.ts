import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export const MAX_PDF_BYTES = 3 * 1024 * 1024;
export const MAX_PDF_PAGES = 20;
export const MAX_PDF_CHARACTERS = 50_000;

export type DocumentReadCode =
  | "invalid_upload"
  | "not_pdf"
  | "damaged_pdf"
  | "encrypted_pdf"
  | "too_large"
  | "too_many_pages"
  | "too_much_text"
  | "no_text"
  | "upload_timeout"
  | "parse_timeout"
  | "parser_unavailable"
  | "parse_failed";

export class DocumentReadError extends Error {
  constructor(code: DocumentReadCode) {
    super(code);
  }
}

export function classifyPdfError(error: unknown): DocumentReadError {
  if (error instanceof DocumentReadError) return error;
  if (error instanceof Error) {
    if (error.name === "PasswordException") return new DocumentReadError("encrypted_pdf");
    if (error.name === "InvalidPDFException" || error.name === "MissingPDFException")
      return new DocumentReadError("damaged_pdf");
    if (/Setting up fake worker failed|Cannot find module.*pdf\.worker/i.test(error.message))
      return new DocumentReadError("parser_unavailable");
  }
  return new DocumentReadError("parse_failed");
}

export async function readDocumentText(bytes: Uint8Array, signal?: AbortSignal): Promise<string> {
  if (bytes.byteLength > MAX_PDF_BYTES) throw new DocumentReadError("too_large");
  if (bytes.byteLength < 5 || new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-")
    throw new DocumentReadError("not_pdf");

  let loadingTask: ReturnType<typeof getDocument> | undefined;
  try {
    loadingTask = getDocument({
      data: bytes,
      useSystemFonts: false,
      stopAtErrors: true,
      verbosity: 0,
    });
    const document = await waitForPdf(loadingTask.promise, signal);
    if (document.numPages > MAX_PDF_PAGES) throw new DocumentReadError("too_many_pages");
    let text = "";
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await waitForPdf(document.getPage(pageNumber), signal);
      try {
        const content = await waitForPdf(page.getTextContent(), signal);
        const pageText = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .trim();
        text += `${pageText}\n`;
        if (text.length > MAX_PDF_CHARACTERS) throw new DocumentReadError("too_much_text");
      } finally {
        page.cleanup();
      }
    }
    if (!text.trim()) throw new DocumentReadError("no_text");
    return text.trim();
  } catch (error) {
    throw classifyPdfError(error);
  } finally {
    await loadingTask?.destroy().catch(() => undefined);
  }
}

function waitForPdf<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(new DocumentReadError("parse_timeout"));
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(new DocumentReadError("parse_timeout"));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
}
