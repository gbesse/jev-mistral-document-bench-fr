import { readFile, writeFile, mkdir } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { createHash } from "node:crypto";
import { analyze } from "../src/index.mjs";
import { createJevClient, MODEL } from "../src/jev.mjs";
const live = process.argv.includes("--live");
const split = process.argv.includes("--dev") ? "dev" : "test";
const raw = await readFile(
  new URL("../corpus/cases.json", import.meta.url),
  "utf8",
);
const all = JSON.parse(raw);
const cases = all.filter((c) => c.split === split);
const modes = live ? ["regles", "extraction", "jev"] : ["regles", "extraction"];
const rows = [];
for (const mode of modes) {
  const matrix = Object.fromEntries(
    ["etaye", "ecart", "a_revoir"].map((k) => [
      k,
      { etaye: 0, ecart: 0, a_revoir: 0 },
    ]),
  );
  let ms = 0,
    tokens = 0;
  const reports = [];
  const semantic = [],
    modelOnly = [];
  const provider = mode === "jev" ? createJevClient() : undefined;
  for (const c of cases) {
    const start = performance.now();
    const r = await analyze(c.input, {
      mode,
      provider,
      onProviderError: "review",
    });
    const elapsed = performance.now() - start;
    ms += elapsed;
    tokens += (r.usage?.input_tokens ?? 0) + (r.usage?.output_tokens ?? 0);
    matrix[c.expected][r.status]++;
    for (const [id, gold] of Object.entries(c.semantic ?? {})) {
      const f = r.findings.find((f) => f.id === id);
      if (!f) throw new Error("Annotation sémantique sans contrôle : " + id);
      const row = {
        id: c.input.id + "/" + id,
        expected: gold,
        actual: f.status,
        method: f.method,
        confidence: f.confidence ?? null,
      };
      semantic.push(row);
      if (f.method === "jev") modelOnly.push(row);
    }
    reports.push({
      id: c.input.id,
      expected: c.expected,
      actual: r.status,
      latencyMs: Math.round(elapsed),
      report: r,
    });
  }
  const n = cases.length;
  const correct = Object.entries(matrix).reduce((s, [k, v]) => s + v[k], 0);
  const accepted = reports.filter((x) => x.actual !== "a_revoir");
  const falseSupport = reports.filter(
    (x) => x.actual === "etaye" && x.expected !== "etaye",
  ).length;
  const metrics = (xs) => ({
    n: xs.length,
    accuracy: xs.length
      ? xs.filter((x) => x.expected === x.actual).length / xs.length
      : null,
    falseSupport: xs.filter(
      (x) => x.actual === "etaye" && x.expected !== "etaye",
    ).length,
    coverage: xs.length
      ? xs.filter((x) => x.actual !== "a_revoir").length / xs.length
      : null,
  });
  rows.push({
    semanticMetrics: metrics(semantic),
    modelOnlyMetrics: metrics(modelOnly),
    semanticDecisions: semantic,
    mode,
    n,
    providerErrors: reports.filter((x) => x.report.providerError).length,
    tokensComplete: reports.every((x) => !x.report.providerError),
    accuracy: correct / n,
    coverage: accepted.length / n,
    accuracyWhenAccepted: accepted.length
      ? accepted.filter((x) => x.expected === x.actual).length / accepted.length
      : null,
    falseSupport,
    meanLatencyMs: Math.round(ms / n),
    tokens,
    matrix,
    reports,
  });
}
const output = {
  date: new Date().toISOString(),
  corpusSha256: createHash("sha256").update(raw).digest("hex"),
  corpusKind:
    "Synthétique, annotations auteur ; aucune validation indépendante.",
  split,
  model: live ? MODEL : null,
  thresholds: { confidence: 0.75, margin: 0.2 },
  baseline:
    "Règles exactes ; extraction = normalisation et Jaccard 0,72, sans modèle OCR.",
  rows,
  limits: [
    "Petit corpus synthétique, sans mesure de généralisation ni revendication SOTA.",
    "Seuils fixés avant le test, non calibrés sur des documents réels.",
    "Accuracy = exactitude du statut global (incluant la revue), pas conformité du dossier.",
  ],
};
await mkdir(new URL("../reports/", import.meta.url), { recursive: true });
const file = new URL(
  `../reports/${live ? "live" : "offline"}-${split}.json`,
  import.meta.url,
);
await writeFile(file, JSON.stringify(output, null, 2) + "\n");
console.log(
  JSON.stringify(
    { file: file.pathname, rows: rows.map(({ reports, ...r }) => r) },
    null,
    2,
  ),
);
