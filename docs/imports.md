# Importer des données

`extractPdfText` lit la couche texte PDF avec PDF.js ; cela ne réalise pas d’OCR sur une image. `requestMistralOcr` appelle réellement `/v1/ocr` avec le modèle `mistral-ocr-4-1`, un PDF et éventuellement un schéma de champs. `MISTRAL_API_KEY` est distincte de la clé Jev. `importOcrResult` accepte Markdown/pages et annotations JSON ; des champs structurés sont requis. Les scores OCR ne garantissent pas la fidélité. Les annotations du corpus servent uniquement à l’évaluation. L’OCR Mistral payant est optionnel et sera signalé comme non vérifié en l’absence de clé.

```sh
npm run demo:import
```

[Code complet de l’import](../examples/import.mjs). Ce parcours passe réellement du format source au rapport JSON/HTML. Les fichiers générés ne contiennent que des données synthétiques. Pour des documents réels confidentiels, écrire les rapports dans `reports/private/` (ignoré par Git), contrôler les droits de fichier et informer les personnes concernées avant un envoi externe.
