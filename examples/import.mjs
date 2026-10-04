import { readFile, mkdir, writeFile } from "node:fs/promises";
import { analyze, toHtml } from "../src/index.mjs";
const base = JSON.parse(
  await readFile(new URL("./dossier.json", import.meta.url), "utf8"),
);

import { PDFDocument, StandardFonts } from "pdf-lib";
import { extractPdfText, importOcrResult } from "../src/adapters.mjs";
const pdf = await PDFDocument.create(),
  page = pdf.addPage(),
  font = await pdf.embedFont(StandardFonts.Helvetica);
[
  "Total: 1200.00",
  "Date: 2026-10-02",
  "Prestation: Isolation thermique des combles perdus.",
].forEach((line, i) =>
  page.drawText(line, { x: 50, y: 780 - i * 30, size: 12, font }),
);
const extracted = await extractPdfText(await pdf.save());
const all = extracted.pages.map((p) => p.text).join("\n");
const total = all.match(/Total:\s*(\d+)\.(\d{2})/);
const fields = {
  total: Number(total[1]) * 100 + Number(total[2]),
  date: all.match(/Date:\s*(\d{4}-\d{2}-\d{2})/)[1],
  prestation: all.match(/Prestation:\s*([^\n]+)/)[1].trim(),
};
const dossier = importOcrResult(extracted, base.annotation, {
  fields,
  uri: "fixture:pdf-texte.pdf",
});

for (const d of dossier.documents) {
  d.source.kind = "synthetique";
  d.source.licence = "CC0";
  if (!d.source.uri.startsWith("fixture:")) d.source.uri = "fixture:" + d.id;
}
const report = await analyze(dossier);
await mkdir(new URL("../reports/", import.meta.url), { recursive: true });
await writeFile(
  new URL("../reports/import.html", import.meta.url),
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
export { dossier, report };
