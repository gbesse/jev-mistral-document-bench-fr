import { analyze, toHtml, type Dossier, type Report } from "../src/index.mjs";
import { createJevClient } from "../src/jev.mjs";
import * as adapters from "../src/adapters.mjs";
const dossier: Dossier = {
  annotation: {
    docId: "a",
    fields: [
      {
        key: "total",
        kind: "money",
        value: 120000,
      },
      {
        key: "date",
        kind: "date",
        value: "2026-10-02",
      },
      {
        key: "prestation",
        kind: "text",
        value: "Isolation thermique des combles perdus.",
      },
    ],
  },
  extraction: {
    docId: "b",
    model: "annotation-importee",
    fields: {
      total: 120000,
      date: "2026-10-02",
      prestation: "Pose d’isolant dans les combles non aménagés.",
    },
  },
  id: "jev-mistral-document-bench-fr-dev-paraphrase",
  documents: [
    {
      id: "a",
      text: 'dossier.annotation : {"fields": [{"key": "total", "kind": "money", "value": 120000}, {"key": "date", "kind": "date", "value": "2026-10-02"}, {"key": "prestation", "kind": "text", "value": "Isolation thermique des combles perdus."}]}',
      source: {
        uri: "fixture:a",
        date: "2026-10-04",
        licence: "CC0",
        kind: "synthetique",
      },
    },
    {
      id: "b",
      text: 'dossier.extraction : {"model": "annotation-importee", "fields": {"total": 120000, "date": "2026-10-02", "prestation": "Pose d’isolant dans les combles non aménagés."}}',
      source: {
        uri: "fixture:b",
        date: "2026-10-04",
        licence: "CC0",
        kind: "synthetique",
      },
    },
  ],
};
const report: Report = await analyze(dossier, {
  mode: "jev",
  provider: createJevClient({ apiKey: "exemple-de-type" }),
});
const html: string = toHtml(report);
void html;
void adapters;
// @ts-expect-error Un dossier vide ne respecte pas le contrat métier.
await analyze({ id: "incomplet", documents: [] });
