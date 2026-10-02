import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyPdfError,
  DocumentReadError,
  MAX_PDF_BYTES,
  readDocumentText,
} from "../src/lib/recipes/read-document";

function pdf(pages: string[]): Uint8Array {
  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 3 + index * 2);
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );
  for (const [index, value] of pages.entries()) {
    const pageId = pageIds[index];
    const streamId = pageId + 1;
    const lines = value.match(/.{1,70}/g) ?? [];
    const stream = value
      ? `BT /F1 12 Tf 14 TL 40 700 Td ${lines
          .map(
            (line) =>
              `(${line.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)")}) Tj T*`,
          )
          .join(" ")} ET`
      : "";
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${streamId} 0 R >>`,
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  let source = "%PDF-1.4\n";
  const offsets = [0];
  for (const [index, object] of objects.entries()) {
    offsets.push(source.length);
    source += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }
  const startXref = source.length;
  source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) source += `${String(offset).padStart(10, "0")} 00000 n \n`;
  source += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF`;
  return new TextEncoder().encode(source);
}

test("extracts text in page order", async () => {
  assert.match(
    await readDocumentText(pdf(["First soup", "Second stew"])),
    /First soup\nSecond stew/,
  );
});

test("rejects malformed, image-only, oversized and over-page-limit PDFs", async () => {
  for (const [bytes, code] of [
    [new TextEncoder().encode("not a PDF"), "not_pdf"],
    [new TextEncoder().encode("%PDF-broken"), "damaged_pdf"],
    [pdf([""]), "no_text"],
    [new Uint8Array(MAX_PDF_BYTES + 1), "too_large"],
    [pdf(Array(21).fill("recipe")), "too_many_pages"],
  ] as const) {
    await assert.rejects(
      readDocumentText(bytes),
      (error: unknown) => error instanceof DocumentReadError && error.message === code,
    );
  }
});

test("distinguishes server reader failures from damaged documents", () => {
  assert.equal(
    classifyPdfError(
      new Error("Setting up fake worker failed: Cannot find module './pdf.worker.mjs'"),
    ).message,
    "parser_unavailable",
  );
  assert.equal(classifyPdfError(new Error("unexpected decoder failure")).message, "parse_failed");
  assert.equal(
    classifyPdfError(Object.assign(new Error(), { name: "PasswordException" })).message,
    "encrypted_pdf",
  );
});

test("rejects extracted text beyond the limit", async () => {
  await assert.rejects(
    readDocumentText(pdf(Array(20).fill("a".repeat(3_000)))),
    (error: unknown) => error instanceof DocumentReadError && error.message === "too_much_text",
  );
});
