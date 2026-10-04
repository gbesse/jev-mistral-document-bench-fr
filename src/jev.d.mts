import type { Provider } from "./index.mjs";
export const MODEL: string;
export function createJevClient(options?: {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  retries?: number;
}): Provider;
export function validateChoiceResponse(
  response: unknown,
  questions: Record<string, unknown>,
  model?: string,
): unknown;
