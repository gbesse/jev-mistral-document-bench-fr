import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyze } from "../src/index.mjs";
const base = JSON.parse(
  await readFile(new URL("../examples/dossier.json", import.meta.url), "utf8"),
);
const clone = structuredClone;

import {
  importOcrResult,
  requestMistralOcr,
  OCR_MODEL,
} from "../src/adapters.mjs";
test("Markdown seul ne vaut pas extraction structurée", () => {
  assert.throws(
    () => importOcrResult({ pages: [{ markdown: "texte" }] }, base.annotation),
    /Champs structurés/,
  );
});
test("OCR réel : contrat HTTP du modèle figé", async () => {
  let body;
  const r = await requestMistralOcr(new Uint8Array([1, 2]), {
    apiKey: "test",
    fetchImpl: async (u, o) => {
      body = JSON.parse(o.body);
      return Response.json({
        model: OCR_MODEL,
        pages: [{ markdown: "Exemple" }],
      });
    },
  });
  assert.equal(body.model, OCR_MODEL);
  assert.ok(
    body.document.document_url.startsWith("data:application/pdf;base64,"),
  );
  assert.equal(r.pages.length, 1);
});
test("Un centime erroné reste une erreur OCR exacte", async () => {
  const x = clone(base);
  x.extraction.fields.total = 119999;
  assert.equal((await analyze(x)).outputs.numericAccuracy, 0.5);
});
