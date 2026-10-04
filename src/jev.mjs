import { setTimeout as pause } from "node:timers/promises";
export const MODEL = "jev-1.13.0";
const prob = (x) =>
  typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 1;
export function validateChoiceResponse(r, questions, model = MODEL) {
  if (!r || r.model !== model || !r.answers || typeof r.answers !== "object")
    throw new TypeError("Réponse Jev invalide ou modèle inattendu");
  if (Object.keys(r.answers).length !== Object.keys(questions).length)
    throw new TypeError("Nombre de réponses inattendu");
  for (const [id, q] of Object.entries(questions)) {
    if (!Object.hasOwn(r.answers, id)) throw new TypeError("Réponse manquante");
    const a = r.answers[id],
      ks = Object.keys(q.criteria);
    if (
      a?.type !== "choice" ||
      !Object.hasOwn(q.criteria, a.choice) ||
      !prob(a.confidence) ||
      !a.probabilities ||
      Object.keys(a.probabilities).length !== ks.length
    )
      throw new TypeError("Choix Jev invalide");
    for (const k of ks)
      if (!Object.hasOwn(a.probabilities, k) || !prob(a.probabilities[k]))
        throw new TypeError("Distribution Jev invalide");
    if (
      Math.abs(ks.reduce((s, k) => s + a.probabilities[k], 0) - 1) > 1e-3 ||
      a.probabilities[a.choice] + 1e-6 <
        Math.max(...Object.values(a.probabilities))
    )
      throw new TypeError("Distribution Jev incohérente");
  }
  if (
    !r.usage ||
    !["input_tokens", "output_tokens"].every(
      (k) => Number.isSafeInteger(r.usage[k]) && r.usage[k] >= 0,
    )
  )
    throw new TypeError("Usage Jev invalide");
  return r;
}
export function createJevClient({
  apiKey = process.env.TYPESAFE_API_KEY,
  fetchImpl = globalThis.fetch,
  timeoutMs = 30000,
  retries = 2,
} = {}) {
  if (typeof apiKey !== "string" || !apiKey)
    throw new TypeError("TYPESAFE_API_KEY requise");
  if (
    !Number.isInteger(retries) ||
    retries < 0 ||
    retries > 3 ||
    !Number.isInteger(timeoutMs) ||
    timeoutMs < 1
  )
    throw new TypeError("Options de transport invalides");
  return {
    async decide({ state, questions, signal }) {
      signal?.throwIfAborted();
      const body = JSON.stringify({ model: MODEL, state, questions });
      if (Buffer.byteLength(body) > 90000)
        throw new RangeError("Budget de 90 000 octets dépassé");
      for (let attempt = 0; attempt <= retries; attempt++) {
        let r;
        try {
          const t = AbortSignal.timeout(timeoutMs);
          r = await fetchImpl("https://api.typesafe.ai/v1/systemone", {
            method: "POST",
            redirect: "error",
            headers: {
              authorization: `Bearer ${apiKey}`,
              "content-type": "application/json",
            },
            body,
            signal: signal ? AbortSignal.any([signal, t]) : t,
          });
        } catch (e) {
          if (signal?.aborted) throw signal.reason;
          if (attempt === retries)
            throw new Error("Transport Jev indisponible");
          await pause(100 * 2 ** attempt, undefined, { signal });
          continue;
        }
        if (!r.ok) {
          if (![429, 529].includes(r.status) || attempt === retries)
            throw new Error(`Jev HTTP ${r.status}`);
          const h = r.headers.get("retry-after"),
            s = h === null ? NaN : Number(h);
          await pause(
            Number.isFinite(s) && s >= 0
              ? Math.min(s * 1000, 30000)
              : 100 * 2 ** attempt,
            undefined,
            { signal },
          );
          continue;
        }
        return validateChoiceResponse(await r.json(), questions);
      }
      throw new Error("Transport Jev indisponible");
    },
  };
}
