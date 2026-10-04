import { text, list, cents, date, ref, check, pair } from "./index.mjs";

export function prepare(x) {
  const expected = x.annotation,
    got = x.extraction;
  if (!expected || !got)
    throw new TypeError("annotation et extraction requises");
  const fields = list(expected.fields, "annotation.fields");
  const refs = ref(expected.docId, got.docId);
  const checks = [],
    pairs = [],
    stats = { numeric: 0, numericCorrect: 0, text: 0 };
  for (const f of fields) {
    text(f.key);
    const value = Object.hasOwn(got.fields ?? {}, f.key)
      ? got.fields[f.key]
      : undefined;
    if (f.kind === "money") {
      stats.numeric++;
      cents(f.value);
      if (value !== undefined) cents(value);
      if (value === f.value) stats.numericCorrect++;
      checks.push(
        check(
          f.key,
          "Champ monétaire : " + f.key,
          value === undefined ? null : value === f.value,
          refs,
        ),
      );
    } else if (f.kind === "date") {
      stats.numeric++;
      date(f.value);
      if (value !== undefined) date(value);
      if (value === f.value) stats.numericCorrect++;
      checks.push(
        check(
          f.key,
          "Date extraite : " + f.key,
          value === undefined ? null : value === f.value,
          refs,
        ),
      );
    } else if (f.kind === "text") {
      stats.text++;
      pairs.push(
        pair(
          f.key,
          "Fidélité du champ : " + f.key,
          f.value,
          value,
          refs,
          "Le texte extrait à droite restitue-t-il fidèlement le champ annoté à gauche, sans omission, négation ni ajout ?",
        ),
      );
    } else throw new TypeError("Type de champ inconnu");
  }
  return {
    checks,
    pairs,
    outputs: {
      extractor: got.model ?? "import",
      ...stats,
      numericAccuracy: stats.numeric
        ? stats.numericCorrect / stats.numeric
        : null,
      limite:
        "Les annotations sont réservées à l’évaluation ; en production, Jev compare des pièces, pas une vérité connue.",
    },
  };
}

function requiredDoc(o) {
  if (!o || typeof o !== "object") throw new TypeError("Objet métier requis");
  text(o.docId, "docId requis");
}
export function validateInput(x) {
  requiredDoc(x.annotation);
  requiredDoc(x.extraction);
  if (
    !x.extraction.fields ||
    typeof x.extraction.fields !== "object" ||
    Array.isArray(x.extraction.fields)
  )
    throw new TypeError("Champs extraits requis");
}
