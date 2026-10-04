# Évaluation reproductible

`npm run bench` compare les règles exactes et une baseline d’extraction lexicale. `npm run bench:live` ajoute **de véritables appels Jev** et conserve leurs décisions, distributions, usage et latence. Le mode hors ligne ne simule aucune performance Jev. Les doubles utilisés dans les tests vérifient uniquement le contrat du client.

Les cas `dev` et `test` ont des identifiants disjoints. Les seuils de revue (confiance 0,75 et marge 0,20) sont fixes, non calibrés sur des documents réels. Le corpus est petit, synthétique, annoté par l’auteur ; il manque une annotation indépendante et un jeu de documents réels. Ce dépôt ne démontre aucune supériorité SOTA.

Les rapports contiennent une matrice de confusion du statut global, l’exactitude, la couverture (part des dossiers conclus), l’exactitude sur les dossiers conclus et les faux « étayé ». Une abstention attendue compte comme une réponse correcte mais n’augmente pas la couverture. Les décisions sémantiques ont leur propre exactitude et nombre de faux « étayé ». Le sous-ensemble `modelOnlyMetrics` exclut les passages identiques et les preuves manquantes traités en code.

Les contrôles numériques peuvent masquer une erreur sémantique dans le statut global : examiner aussi les constatations individuelles enregistrées dans chaque rapport.

Pour une validation produit : recueillir des dossiers autorisés, annoter en double aveugle, séparer les organisations entre apprentissage et test, calibrer les seuils sur le développement, puis figer le test. Mesurer le temps de revue avec et sans outil, les faux positifs par contrôle, la couverture à risque fixé et la réutilisation à 30 jours. Aucun succès commercial n’est revendiqué.

Les erreurs de transport ou de contrat ne sont pas retirées du benchmark : `providerErrors` les compte et les constatations concernées passent en revue avec `method: erreur_fournisseur`. `tokensComplete: false` signale que l’usage total ne peut pas être connu. L’API de bibliothèque échoue par défaut ; l’option explicite `onProviderError: review` conserve les contrôles exacts et marque l’échec du fournisseur. Une annulation reste toujours une erreur.
