# Plan 09 — Préparer et livrer la bêta publique

Statut : à réaliser. Dépendances : [plans 01–08](00-ORDRE-ET-DEPENDANCES.md) acceptés avec leurs limites documentées. Références : spec §1, §10 et §11. [Ordre général](00-ORDRE-ET-DEPENDANCES.md).

## Ce qui devient utilisable

Un utilisateur ou recruteur peut télécharger un paquet correspondant à son système, découvrir l'exemple, connecter ses modèles, conduire une vraie réunion et inspecter les preuves. Les sources, instructions et diagnostics permettent d'évaluer le projet sans aide directe de son auteur.

Le travail produit d'abord une release candidate installable et un dossier de publication concret. La publication effective, le choix final de licence et les éventuels achats de signature ou d'infrastructure suivent les décisions explicites correspondantes.

## Entrée

Reprendre les paquets et preuves déjà collectés, les statuts réels des routes abonnement et la matrice de capacités par OS. Les limites prévues par la spec peuvent rester visibles ; une capacité obligatoire manquante ne devient pas une limitation acceptable par simple inscription dans la documentation.

## Tranches d'implémentation, dans cet ordre

Tout code de release, de packaging ou de correction suit lui aussi les [exigences transversales TDD et README](EXIGENCES-TDD-ET-README.md) : test rouge du comportement, implémentation minimale, test vert. Ce jalon rassemble et exécute les suites construites dès 01 ; il ne lance pas une campagne de tests écrits après l'implémentation complète.

1. **Figer la candidate.** Fixer versions, dépendances et procédures de build. Vérifier les paquets pour chaque OS/architecture annoncée avec runtime embarqué, assets et dépendances natives préparées. Définir précisément les terminaux et versions de systèmes pris en charge.
2. **Rendre l'installation reproductible.** Tester installation propre, lancement, chemins Unicode/espaces, permissions locales, absence de Node préinstallé, données hors paquet et remplacement du paquet. Fournir une procédure de mise à jour ; préserver les données utilisateur et valider toute migration introduite depuis les jalons précédents.
3. **Exécuter les parcours intégrés.** Utiliser les scénarios ci-dessous dans la candidate. Faire tourner le parcours central multi-fournisseur sur chaque OS annoncé ; répartir les essais déterministes et de panne selon les adaptateurs, sans extrapoler leurs protections d'un OS à l'autre.
4. **Finaliser un README d'excellence et sa documentation.** Valider le README anglais construit depuis 01 et composé en 07 comme une vitrine majeure de la release : promesse immédiatement comprise, démo lisible, décision améliorée avec preuves, quickstart reproductible, présentation soignée et crédibilité technique. Appliquer toute la grille des exigences transversales. La documentation liée approfondit configuration des modèles, permissions, sources/mémoire, budgets et usage inconnu, reprise, confidentialité/observabilité, limites et dépannage. Les détails d'architecture et leurs compromis restent facilement accessibles.
5. **Préparer le support.** Proposer des diagnostics locaux expurgés et inspectables par l'utilisateur avant partage : version, plateforme, capacités, événements et codes d'erreur utiles. Les documents, clés, conversations et chemins sensibles ne partent pas automatiquement vers un service ou un dépôt public.
6. **Préparer les décisions de diffusion.** Inventorier dépendances natives, modèles distribués/téléchargés, notices et droits associés. Vérifier la provenance des données fictives. Préparer choix de licence, canaux de publication et options/coûts de signature ou notarisation applicables avec leurs conséquences concrètes.
7. **Publier après décision.** Après les accords nécessaires, publier les sources, paquets, notes de version et limitations. Retélécharger les artefacts publiés et refaire le parcours de démarrage rapide. Si une décision manque, livrer la candidate et son dossier ; noter la publication en attente sans la déclarer effectuée.

## Tests d'intégration et E2E obligatoires

- Exécuter les suites déterministes d'intégration et E2E requises des plans 01–08 contre la candidate. Tout correctif commence par un test de régression rouge au niveau public pertinent.
- Exécuter les E2E de distribution et les commandes du README telles que publiées sur chaque OS annoncé, avec environnement propre et données de test isolées ; couvrir mise à jour et migration si elles sont introduites.
- Réaliser les essais vivants requis des routes et services annoncés, avec comptes et budgets autorisés. Un accès manquant laisse la capacité non vérifiée ; un E2E avec doublure ne la certifie pas.
- Joindre les résultats CI, preuves rouges → vertes pertinentes, résultats par plateforme et essais de quickstart au dossier de release. Un test requis ignoré ou instable sans résolution bloque la capacité concernée.

## Campagne d'acceptation intégrée

| ID | Parcours | Preuve attendue |
|---|---|---|
| B01 | Installer sans Node sur Windows, macOS et Linux | Paquets réellement exécutés, environnements identifiés, premier lancement réussi. |
| B02 | Découvrir sans compte | Exemple SaaS lisible, données fictives identifiées, aucun appel modèle prétendument vivant. |
| B03 | Mener une réunion réelle | Trois rôles, trois modèles distincts, deux fournisseurs au moins, propositions et avis persistés. |
| B04 | Améliorer le plan avec une preuve | Citation exacte → objection → révision identifiée → avis sur la nouvelle version. |
| B05 | Conclure avec un désaccord | Rejet et preuve insuffisante fidèlement affichés ; choix humain enregistré séparément. |
| B06 | Intervenir pendant l'exécution | Travaux affectés suspendus, travaux indépendants continués, résultats tardifs attribués correctement. |
| B07 | Atteindre durée, budget ou quota | Limites respectées, prolongation explicitement autorisée, résultat partiel et usage inconnu affichés correctement. |
| B08 | Refuser une action et tester la protection | Aucun effet interdit ; originaux inchangés ; règle révoquée contrôlée avant exécution. |
| B09 | Utiliser un poste sans isolation disponible | Outil concerné bloqué, configuration guidée à la demande, réunion toujours utilisable. |
| B10 | Interrompre après une intervention et après un effet d'outil | Reprise cohérente sans duplication ; issue ambiguë visible et résolue avant réexécution. |
| B11 | Actualiser une source et réutiliser la mémoire | Anciennes citations résolubles, nouveau contexte explicite, hypothèse conservée comme hypothèse. |
| B12 | Tester les formats et l'isolation du projet | Textes/code/PDF/DOCX pris en charge ; limites signalées ; aucun passage non autorisé. |
| B13 | Tester les routes abonnement annoncées | Parcours réel sur chaque type de compte supporté, quotas honnêtes, aucune bascule facturée automatique. |
| B14 | Utiliser les trois modes d'observabilité | Off sans export ; métriques sans contenu ; diagnostic explicite et secrets filtrés ; panne non bloquante. |
| B15 | Exporter et partager un diagnostic | Nouveaux artefacts lisibles, originaux intacts, secrets absents, portée du partage inspectable. |
| B16 | Découvrir et essayer depuis le README | Promesse comprise rapidement par un novice, démonstration convaincante, quickstarts vérifiés, rendu GitHub soigné et grille d'excellence satisfaite. |

Les preuves des plans précédents sont réutilisables lorsqu'elles portent sur la même candidate ou une partie inchangée justifiée. Rejouer ce que l'intégration, le packaging ou une correction a pu affecter. Les essais de protections spécifiques restent propres à chaque environnement annoncé.

## Critères de sortie

- [ ] Les parcours B01–B16 sont réussis pour les capacités annoncées ; les cas non applicables, comme une route abonnement non publiée, ont un motif explicite conforme à la spec.
- [ ] Toute implémentation livrée suit le TDD-first ; les tests d'intégration/E2E nécessaires sont présents et verts, avec preuves et contrôles CI requis, sans test obligatoire ignoré.
- [ ] Les paquets n'exigent pas de runtime Node installé par l'utilisateur et contiennent les assets nécessaires. Une capacité optionnelle absente est détectée correctement.
- [ ] Les procédures d'installation et de première réunion ont été suivies par une personne extérieure au développement ; les blocages ont été corrigés ou la candidate reste ouverte.
- [ ] La documentation anglaise correspond exactement aux comportements et plateformes vérifiés. Elle ne présente pas les capacités candidates comme acquises.
- [ ] Le README satisfait tous les critères d'excellence éditoriale, visuelle et technique : premier écran clair, démo réelle, preuve de valeur, instructions testées, rendu vérifié et essai novice concluant.
- [ ] La distribution respecte les obligations identifiées pour code, dépendances, modèles et données d'exemple ; les notices requises sont incluses.
- [ ] Licence, mode de diffusion, signature applicable et dépenses éventuelles disposent de décisions explicites avant publication ou achat.
- [ ] Les diagnostics et exemples partageables sont expurgés ; aucun secret ni document privé n'est présent dans les artefacts publics.
- [ ] La candidate, son rapport de validation et ses limites sont disponibles ; après publication autorisée, les artefacts publics ont été retéléchargés et vérifiés.

## Blocages de release

Échec du parcours vivant à trois modèles, perte ou altération d'originaux, fuite de données dans les traces, duplication d'action achevée, confusion de versions, consentement implicite, manque de support d'un OS annoncé ou installation non reproductible : corriger avant release.

L'absence des preuves TDD et tests d'intégration/E2E requis, un test obligatoire non exécuté ou un README qui échoue aux critères d'excellence sont également bloquants. La qualité du README fait partie de la livraison ; elle n'est pas reportée après publication.

L'absence d'une intégration abonnement candidate ou d'un outil conditionné à une isolation indisponible peut être compatible avec la spec si son statut et son repli sont explicites. L'échec d'un contrôle obligatoire ne peut pas être contourné par une note de version.

## Livrables et clôture

Paquets candidats puis publiés si autorisés, sources reproductibles, README public d'excellence et ses médias, documentation détaillée, exemple SaaS, notices, matrice de capacités, suites et preuves de tests, rapport d'acceptation et notes de release. Distinguer dans le suivi « candidate validée » et « publiée ».

Ce plan termine le périmètre V1 défini. Les idées de GUI, automatisation, expérimentation ou autres extensions restent dans une suite séparée ; elles ne repoussent pas la bêta acceptée.
