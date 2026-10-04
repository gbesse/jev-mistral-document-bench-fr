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
