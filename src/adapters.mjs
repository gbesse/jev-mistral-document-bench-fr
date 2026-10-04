import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { document } from "./io.mjs";
export const OCR_MODEL = "mistral-ocr-4-1";
export async function extractPdfText(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length > 8e6)
    throw new TypeError("PDF de 8 Mo maximum");
  const task = getDocument({
    data: new Uint8Array(bytes),
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const pdf = await task.promise;
  try {
    if (pdf.numPages > 20) throw new RangeError("20 pages maximum");
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      pages.push({
        page: i,
        text: tc.items.map((t) => t.str + (t.hasEOL ? "\n" : " ")).join(""),
      });
    }
    return { model: "pdfjs-text-layer", pages };
  } finally {
    await task.destroy();
  }
}
export async function requestMistralOcr(
  bytes,
  {
    apiKey = process.env.MISTRAL_API_KEY,
    fetchImpl = globalThis.fetch,
    signal,
    schema,
  } = {},
) {
  if (!apiKey) throw new TypeError("MISTRAL_API_KEY requise");
  if (!(bytes instanceof Uint8Array) || bytes.length > 8e6)
    throw new TypeError("PDF de 8 Mo maximum");
  const body = {
    model: OCR_MODEL,
    document: {
      type: "document_url",
      document_url:
        "data:application/pdf;base64," + Buffer.from(bytes).toString("base64"),
    },
    include_blocks: true,
    confidence_scores_granularity: "word",
    ...(schema
      ? {
          document_annotation_format: {
            type: "json_schema",
            json_schema: { name: "champs_fr", strict: true, schema },
          },
          document_annotation_prompt:
            "Extraire uniquement les champs visibles, sans supposer les valeurs illisibles.",
        }
      : {}),
  };
  const r = await fetchImpl("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    redirect: "error",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    signal: signal ?? AbortSignal.timeout(60000),
  });
  if (!r.ok) throw new Error(`Mistral OCR HTTP ${r.status}`);
  const value = await r.json();
  if (value.model !== OCR_MODEL || !Array.isArray(value.pages))
    throw new TypeError("Réponse OCR invalide");
  return value;
}
export function importOcrResult(
  result,
  annotation,
  {
    fields,
    uri = "fichier:document.pdf",
    at = new Date().toISOString().slice(0, 10),
  } = {},
) {
  if (!Array.isArray(result.pages) || !result.pages.length)
    throw new TypeError("Pages OCR requises");
  const raw =
    typeof result.document_annotation === "string"
      ? JSON.parse(result.document_annotation)
      : result.document_annotation;
  const extracted = fields ?? raw;
  if (!extracted || typeof extracted !== "object")
    throw new TypeError(
      "Champs structurés requis ; le Markdown seul n’est pas une extraction de champs",
    );
  const markdown = result.pages
    .map((p) => p.markdown ?? p.text ?? "")
    .join("\n");
  return {
    id: "evaluation-ocr",
    annotation: { ...annotation, docId: "annotation" },
    extraction: { docId: "ocr", model: result.model, fields: extracted },
    documents: [
      document("annotation", JSON.stringify(annotation), {
        uri: "fichier:annotations.json",
        date: at,
        kind: "annotation",
        licence: "Privé",
      }),
      document("ocr", markdown + "\n" + JSON.stringify(extracted), {
        uri,
        date: at,
        kind: "extraction",
        licence: "Privé",
      }),
    ],
  };
}
