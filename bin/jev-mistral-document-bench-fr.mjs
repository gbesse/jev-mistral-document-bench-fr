#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { analyze, toHtml } from "../src/index.mjs";
import { createJevClient } from "../src/jev.mjs";
import { loadJson, saveReport } from "../src/io.mjs";
const args = process.argv.slice(2);
const value = (k) => {
  const i = args.indexOf(k);
  return i < 0 ? undefined : args[i + 1];
};
if (args.includes("--help") || !args.length) {
  console.log(
    "Usage : jev-mistral-document-bench-fr dossier.json [--mode regles|extraction|jev] [--out rapport.json] [--html rapport.html]\nSans clé en mode regles ou extraction. Pour Jev : node --env-file=.env bin/jev-mistral-document-bench-fr.mjs dossier.json --mode jev",
  );
  process.exit(0);
}
try {
  const mode = value("--mode") ?? "regles";
  const report = await analyze(await loadJson(args[0]), {
    mode,
    provider: mode === "jev" ? createJevClient() : undefined,
  });
  if (value("--out")) await saveReport(value("--out"), report);
  if (value("--html")) await writeFile(value("--html"), toHtml(report));
  console.log(JSON.stringify(report, null, 2));
  process.exitCode =
    report.status === "ecart" ? 2 : report.status === "a_revoir" ? 3 : 0;
} catch (e) {
  console.error(`Erreur : ${e.message}`);
  process.exitCode = 1;
}
