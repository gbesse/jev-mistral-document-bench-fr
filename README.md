# Documents français : mesurer extraction et preuves

Mesure champs, cellules et décisions sur des documents français annotés.

Le parcours produit un rapport JSON et HTML, avec contrôle par contrôle, pièces citées, empreintes SHA-256 et actions de revue. Les nombres, dates et identifiants sont contrôlés en code. Jev rapproche seulement les passages utiles, avec abstention explicite.

## Essayer immédiatement

Node.js 22 ou 24. Aucun compte nécessaire pour les exemples.

```sh
npm ci
npm test
npm run demo
npm run demo:limite
npm run demo:revue
npm run demo:import
npm run bench
node bin/jev-mistral-document-bench-fr.mjs examples/dossier.json --mode regles --out reports/rapport.json --html reports/rapport.html
```

La CLI renvoie 0 pour `etaye`, 2 pour `ecart`, 3 pour `a_revoir`, 1 pour une erreur d’entrée ou de transport. Les scripts d’exemple restent exécutables même lorsqu’ils montrent un écart. Les rapports HTML sont autonomes et échappent les données importées.

## Utiliser la bibliothèque

Depuis le dépôt :

```js
import {readFile} from 'node:fs/promises';
import {analyze, toHtml} from './src/index.mjs';
import {createJevClient} from './src/jev.mjs';
const dossier = JSON.parse(await readFile('./examples/dossier.json', 'utf8'));
const rapport = await analyze(dossier, {mode: 'regles'});
console.log(rapport.status, rapport.outputs);
// Avec TYPESAFE_API_KEY dans l’environnement :
// const rapportJev = await analyze(dossier, {mode:'jev', provider:createJevClient()});
```

Le paquet est exportable avec ses types et sa CLI, mais n’est pas publié sur npm. Pour l’intégrer sans installation globale : `npm install github:gbesse/jev-mistral-document-bench-fr#v0.1.0` puis importer `@gbesse/jev-mistral-document-bench-fr`.

## Appels Jev réels

Renseigner une `.env` **ignorée par Git**, réservée au propriétaire (permissions 600), sans enregistrer le secret. Le dépôt fournit `.env.example` vide.

```sh
node --env-file=.env examples/demo.mjs --live
npm run bench:live
```

Modèle fixé : `jev-1.13.0`. Réessais limités aux erreurs de transport, HTTP 429 et 529 ; annulation et délai d’expiration pris en charge. Pas d’appel payant en mode `regles` ou `extraction`. La comparaison lexicale est une baseline simple, pas une extraction OCR ni un modèle de référence avancé.

## Contrat métier

Les documents sont référencés par `docId`. Chaque document comporte `id`, `text`, `source.uri`, `source.date` au format ISO ; `licence`, `kind` et `page` permettent de préciser la provenance. Les références inconnues ou dupliquées sont rejetées. Les champs structurés fournis par l’importeur ne sont pas présumés fidèles au document : vérifier leur extraction avant usage opérationnel.

Les exemples utilisent le contrat suivant (les `documents` complets sont dans [examples/dossier.json](examples/dossier.json)) :

```json
{
  "annotation": {
    "docId": "a",
    "fields": [
      {
        "key": "total",
        "kind": "money",
        "value": 120000
      },
      {
        "key": "date",
        "kind": "date",
        "value": "2026-10-02"
      },
      {
        "key": "prestation",
        "kind": "text",
        "value": "Isolation thermique des combles perdus."
      }
    ]
  },
  "extraction": {
    "docId": "b",
    "model": "annotation-importee",
    "fields": {
      "total": 120000,
      "date": "2026-10-02",
      "prestation": "Pose d’isolant dans les combles non aménagés."
    }
  }
}
```

Les adaptateurs et le parcours d’import sont décrits dans [docs/imports.md](docs/imports.md). Les formats non pris en charge doivent être normalisés explicitement ; ils ne sont pas acceptés silencieusement.

## Évaluation et adoption

Lors du benchmark publié, Jev retrouve **6/7 statuts globaux attendus**, avec 0 faux « étayé » et 0 erreur de fournisseur sur ce test synthétique. Les décisions individuelles restent visibles dans [le rapport réel](reports/live-test.json). Ces résultats ne préjugent pas de la performance sur des dossiers réels.

Le corpus contient 10 cas français synthétiques, dont 7 réservés au test : paraphrases, contradictions, preuves insuffisantes et anomalies exactes, négations proches lexicalement et injection de consignes. Les [rapports](reports/) conservent les prédictions individuelles et matrices de confusion. Les appels Jev réels sont séparés des résultats hors ligne. Voir [méthode et limites](docs/evaluation.md).

**Version initiale expérimentale** : pas de supériorité SOTA, de conformité officielle ni de succès commercial démontrés. Pour mesurer l’utilité : dossiers réels autorisés, annotations indépendantes, temps de revue, faux rapprochements et réutilisation à 30 jours. Un résultat `etaye` indique seulement que les contrôles exécutés sont satisfaits.

Source principale : [Documents français : mesurer extraction et preuves](https://docs.mistral.ai/studio/document-processing/basic_ocr). [Sources et licences](docs/sources.md). Code MIT ; corpus synthétique CC0.

[Les douze projets de la série](docs/serie-fr.md).

## Immutable evaluation input / Entrée capturée / Entrada capturada

EN: Analysis now snapshots the complete dossier before planning or awaiting semantic decisions. Caller edits during a provider call cannot replace the evidence quotes, checks or output data behind the returned findings. Uncopyable records fail before any provider call. The snapshot preserves supplied French document content and annotations; it does not authenticate their provenance or establish OCR/model quality.

FR : L’analyse capture désormais le dossier complet avant planification ou attente sémantique. Des modifications pendant l’appel ne remplacent plus citations, contrôles ou données de sortie derrière les constats retournés. Un dossier non copiable échoue avant tout appel. L’instantané conserve textes français et annotations fournis ; il n’authentifie pas leur provenance et ne prouve pas la qualité OCR/modèle.

ES: El análisis captura el expediente completo antes de planificar o esperar decisiones. Cambios durante la llamada no sustituyen citas, controles ni datos detrás de hallazgos devueltos. Registros no copiables fallan antes de llamar. Conserva contenido francés y anotaciones proporcionadas; no autentica procedencia ni establece calidad OCR/modelo.


FR : Les questions attendues sont isolées de la copie envoyée au fournisseur ; modifier des critères reçus ne peut plus redéfinir le contrat utilisé pour valider sa réponse. Les critères exportés sont immuables et la réponse est copiée avant son incorporation au rapport. Cela protège l’intégrité des champs et probabilités déclarés, sans prouver l’exactitude OCR ni une supériorité entre modèles.

EN: Expected questions are isolated from the copy sent to the provider; editing received criteria cannot redefine the contract used to validate its response. Exported criteria are immutable and responses are copied before inclusion in reports. This protects declared fields and probabilities without proving OCR accuracy or superiority between models.

ES: Las preguntas esperadas están aisladas de la copia enviada al proveedor; editar criterios recibidos no redefine el contrato de validación. Los criterios exportados son inmutables y la respuesta se copia antes de incorporarla al informe. Protege campos y probabilidades declarados sin demostrar exactitud OCR ni superioridad entre modelos.

## Âge explicite des pièces / Explicit evidence age / Antigüedad explícita de pruebas

FR — Option API : `analyze(dossier, {asOfDate: "2026-10-19", maxEvidenceAgeDays: 7})`. Une pièce future ou plus ancienne que la fenêtre impose la revue des contrôles concernés, y compris exacts ; les comparaisons Jev concernées ne sont pas envoyées. Les reçus gardent dates, âge et résultat préalable disponible. La borne est inclusive. Sans ces options, comportement inchangé. C’est une règle choisie par l’appelant, pas une détermination de validité juridique ou de fraîcheur réelle.

EN — API option: `analyze(record, {asOfDate: "2026-10-19", maxEvidenceAgeDays: 7})`. Future or older evidence forces affected findings, including exact checks, into review; affected Jev comparisons are not sent. Receipts retain dates, ages and available pre-policy results. The boundary is inclusive. Without these options, behavior is unchanged. This is a caller-chosen rule, not a finding of legal validity or actual freshness.

ES — Opción API: `analyze(expediente, {asOfDate: "2026-10-19", maxEvidenceAgeDays: 7})`. Pruebas futuras o más antiguas obligan a revisar controles afectados, incluidos exactos; comparaciones Jev afectadas no se envían. Recibos conservan fechas, edades y resultados previos disponibles. El límite es inclusivo. Sin opciones no cambia comportamiento. Es una regla elegida por quien llama, no una determinación de validez jurídica ni actualidad real.
