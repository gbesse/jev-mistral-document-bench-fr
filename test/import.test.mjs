import test from "node:test";
import assert from "node:assert/strict";
import { dossier, report } from "../examples/import.mjs";
test("Parcours réel du format source vers un rapport documenté", () => {
  assert.ok(report.findings.length > 0);
  assert.ok(dossier.documents.length > 0);
  assert.ok(report.findings.every((f) => f.evidence.length));
  assert.equal(report.id, dossier.id);
});
