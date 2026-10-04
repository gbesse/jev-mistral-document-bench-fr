import type { Dossier, Document } from "./index.mjs";
export const OCR_MODEL: string;
export function extractPdfText(
  bytes: Uint8Array,
): Promise<{ model: string; pages: { page: number; text: string }[] }>;
export function requestMistralOcr(
  bytes: Uint8Array,
  options?: {
    apiKey?: string;
    fetchImpl?: typeof fetch;
    signal?: AbortSignal;
    schema?: Record<string, unknown>;
  },
): Promise<Record<string, unknown>>;
export function importOcrResult(
  result: Record<string, unknown>,
  annotation: Record<string, unknown>,
  options?: { fields?: Record<string, unknown>; uri?: string; at?: string },
): Dossier;
