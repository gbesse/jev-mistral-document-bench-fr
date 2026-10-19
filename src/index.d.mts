export type Status = "etaye" | "ecart" | "a_revoir";
export interface Document {
  id: string;
  text: string;
  source: { uri: string; date: string; licence?: string; kind?: string };
  page?: number;
}
export interface Input {
  id: string;
  documents: Document[];
  [key: string]: unknown;
}
export interface Evidence {
  id: string;
  source: Document["source"];
  page: number | null;
  quote: string;
  sha256: string;
}
export interface Finding {
  id: string;
  title: string;
  status: Status;
  method: string;
  reason: string;
  action: string;
  refs: string[];
  evidence: Evidence[];
  freshness?: {asOfDate:string;maxAgeDays:number;refs:{id:string;date:string;ageDays:number}[];requiresReview:boolean};
  statusWithoutFreshness?: Status;
  reasonWithoutFreshness?: string;
  confidence?: number | null;
  probabilities?: Record<Status, number> | null;
  model?: string | null;
}
export interface Report {
  schemaVersion: number;
  version: string;
  id: string;
  status: Status;
  mode: string;
  findings: Finding[];
  summary: Record<Status, number>;
  outputs: Record<string, unknown>;
  usage: { input_tokens: number; output_tokens: number } | null;
  policy: {
    confidenceThreshold: number;
    marginThreshold: number;
    calibration: string;
    evidenceFreshness?: {asOfDate:string;maxAgeDays:number};
  };
  limitations: string[];
  providerError: {
    category: string;
    message: string;
    usageKnown: boolean;
  } | null;
}
export interface Provider {
  decide(request: {
    state: unknown;
    questions: Record<string, unknown>;
    signal?: AbortSignal;
  }): Promise<unknown>;
}
export function analyze(
  input: Dossier,
  options?: {
    mode?: "regles" | "extraction" | "jev";
    provider?: Provider;
    signal?: AbortSignal;
    confidenceThreshold?: number;
    marginThreshold?: number;
    onProviderError?: "throw" | "review";
    asOfDate?: string;
    maxEvidenceAgeDays?: number;
  },
): Promise<Report>;
export function toHtml(report: Report): string;
export function plan(input: Input): unknown;
export function date(value: unknown): string;
export function cents(value: unknown, name?: string): number;
export function decimalCents(value: unknown): number;
export const VERSION: string;
export function text(value: unknown, name?: string): string;
export function list(value: unknown, name: string): unknown[];
export function ref(...ids: (string | undefined | null)[]): string[];
export function normalize(value: string): string;
export const criteria: Record<Status, string>;

export type Field =
  | { key: string; kind: "money"; value: number }
  | { key: string; kind: "date" | "text"; value: string };
export interface Dossier extends Input {
  annotation: { docId: string; fields: Field[] };
  extraction: {
    docId: string;
    model?: string;
    fields: Record<string, string | number>;
  };
}
