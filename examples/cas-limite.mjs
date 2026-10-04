import { readFile, mkdir, writeFile } from "node:fs/promises";
import { analyze, toHtml } from "../src/index.mjs";
import { createJevClient } from "../src/jev.mjs";
const cases = JSON.parse(
  await readFile(new URL("../corpus/cases.json", import.meta.url), "utf8"),
);
const mode = process.argv.includes("--live") ? "jev" : "regles";
const report = await analyze(cases[7].input, {
  mode,
  provider: mode === "jev" ? createJevClient() : undefined,
});
await mkdir(new URL("../reports/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../reports/cas-limite.html", import.meta.url),
  toHtml(report),
);
console.log(
  JSON.stringify(
    {
      id: report.id,
      status: report.status,
      summary: report.summary,
      outputs: report.outputs,
    },
    null,
    2,
  ),
);
