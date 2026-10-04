# Série française Jev — octobre 2026

Douze projets indépendants avec une CLI, une bibliothèque typée, un import métier, des exemples français et des rapports documentés. Code MIT ; exemples synthétiques CC0. Versions initiales expérimentales.

Chaque dépôt contient 20 tests automatiques vérifiés localement sur Node 22.23.3 et 24.11.1. Le corpus contient 10 dossiers synthétiques, dont 7 réservés au test. La comparaison appelle réellement Jev ; elle n’utilise pas de réponses attendues dans les requêtes.

| Dépôt | Statuts corrects / test | Faux étayés |
|---|---:|---:|
| [jev-facturx-crosscheck](https://github.com/gbesse/jev-facturx-crosscheck) | 7/7 | 0 |
| [jev-rge-devis-proof](https://github.com/gbesse/jev-rge-devis-proof) | 7/7 | 0 |
| [jev-chorus-rejection-repair](https://github.com/gbesse/jev-chorus-rejection-repair) | 7/7 | 0 |
| [jev-dsn-norme-impact](https://github.com/gbesse/jev-dsn-norme-impact) | 6/7 | 0 |
| [jev-trackdechets-coherence](https://github.com/gbesse/jev-trackdechets-coherence) | 6/7 | 0 |
| [jev-cantine-purchase-proof](https://github.com/gbesse/jev-cantine-purchase-proof) | 6/7 | 0 |
| [jev-rncp-claim-proof](https://github.com/gbesse/jev-rncp-claim-proof) | 7/7 | 0 |
| [jev-copro-resolution-diff](https://github.com/gbesse/jev-copro-resolution-diff) | 5/7 | 0 |
| [jev-cnc-production-proof](https://github.com/gbesse/jev-cnc-production-proof) | 6/7 | 0 |
| [jev-programmes-comparables](https://github.com/gbesse/jev-programmes-comparables) | 6/7 | 0 |
| [jev-mistral-document-bench-fr](https://github.com/gbesse/jev-mistral-document-bench-fr) | 6/7 | 0 |
| [jev-datagouv-answer-proof](https://github.com/gbesse/jev-datagouv-answer-proof) | 5/7 | 0 |

Ces résultats concernent uniquement le petit corpus synthétique de cette série, annoté par l’auteur. Ils ne démontrent ni une supériorité SOTA ni une efficacité en production. Les variantes partagent des structures et ne constituent pas un jeu indépendant de dossiers réels. Les prédictions, distributions, latences et erreurs sont disponibles dans `reports/live-test.json` de chaque dépôt. Les résultats sémantiques sont séparés des statuts globaux ; la revue et la couverture sont mesurées.

L’OCR Mistral et les connecteurs privés Trackdéchets/Chorus nécessitent leurs propres accès. L’OCR Mistral n’a pas été exécuté faute de clé disponible. Le parcours PDF avec couche texte a été vérifié. Le client Chorus importe des exports locaux et ne soumet aucune facture. Le client Trackdéchets n’a pas été essayé avec un compte réel. Les connecteurs publics RGE, RNCP (découverte des archives) et data.gouv.fr ont été essayés sur les sources officielles.
