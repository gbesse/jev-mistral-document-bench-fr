import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
export async function loadJson(path) {
  const b = await readFile(path);
  if (b.length > 8e6) throw new RangeError("Fichier supérieur à 8 Mo");
  return JSON.parse(b.toString("utf8"));
}
export async function saveReport(path, report) {
  await writeFile(path, JSON.stringify(report, null, 2) + "\n", {
    mode: 0o600,
  });
}
export function document(
  id,
  text,
  {
    uri = "fixture:" + id,
    date = new Date().toISOString().slice(0, 10),
    licence = "Données synthétiques, CC0",
    kind = "synthetique",
    page,
  } = {},
) {
  return {
    id,
    text,
    source: { uri, date, licence, kind },
    ...(page ? { page } : {}),
  };
}
export async function getJson(
  url,
  { fetchImpl = globalThis.fetch, signal, headers = {} } = {},
) {
  const u = new URL(url);
  if (u.protocol !== "https:") throw new TypeError("HTTPS requis");
  const timeout = AbortSignal.timeout(20000);
  const r = await fetchImpl(u, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    headers,
    redirect: "error",
  });
  if (!r.ok) throw new Error(`Source HTTP ${r.status}`);
  if (Number(r.headers.get("content-length")) > 8e6) {
    await r.body?.cancel();
    throw new RangeError("Réponse trop volumineuse");
  }
  const chunks = [];
  let size = 0;
  const reader = r.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8e6) {
        await reader.cancel();
        throw new RangeError("Réponse trop volumineuse");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function digest(text) {
  return createHash("sha256").update(text).digest("hex");
}
