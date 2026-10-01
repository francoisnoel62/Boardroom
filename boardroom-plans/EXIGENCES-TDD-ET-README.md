# Exigences transversales — TDD-first et README d'excellence

Ajout demandé par l'utilisateur le 1er octobre 2026. Ces exigences complètent la spec et s'appliquent aux **neuf plans**, sans ajouter un dixième jalon. Statut : exigences de réalisation ; aucune implémentation ni exécution de tests n'est constatée ici. [Ordre et dépendances](00-ORDRE-ET-DEPENDANCES.md).

## 1. Toute implémentation commence par un test

Le TDD-first est obligatoire pour toute implémentation : comportement produit, correctif, adaptateur, persistance, script de distribution ou autre automatisation livrée. Les tests définissent le comportement attendu avant le code qui le satisfait.

Pour chaque petite tranche verticale :

1. Décrire le comportement et la frontière publique observable : commande applicative, interface du service, commande CLI, terminal, adaptateur ou paquet distribué. S'appuyer sur le langage du domaine et les décisions d'architecture existantes.
2. Écrire un test pertinent, l'exécuter et constater son échec pour la raison attendue. Un problème de configuration du runner ne démontre pas l'absence du comportement demandé.
3. Écrire uniquement le code nécessaire pour faire passer ce test, puis exécuter les vérifications concernées.
4. Passer au comportement suivant. Éviter de rédiger toute une suite sur un système imaginé puis toute l'implémentation séparément.
5. Traiter les refactorings lors d'une revue distincte, avec la suite verte avant et après. Toute modification de comportement supplémentaire commence par son propre test en échec.

Un bug reproductible commence par un test de régression rouge. Écrire des tests après une fonctionnalité terminée ne satisfait pas cette exigence. Si du code antérieur doit être repris, couvrir d'abord son comportement observable et écrire le test du changement avant de modifier ce comportement.

La preuve rouge → vert est consignée sobrement dans le compte rendu de changement : scénario, commande et échec attendu observé, puis résultat après implémentation. Elle n'impose pas de publier des commits cassés ni de conserver des logs contenant des secrets.

## 2. Choisir le bon niveau de test

| Niveau | Quand il est obligatoire | Ce qu'il doit vérifier |
|---|---|---|
| Test de comportement ciblé | À chaque comportement implémenté ou corrigé | Un résultat observable à une interface publique, avec une attente indépendante de l'implémentation. Il peut déjà être un test d'intégration. |
| Test d'intégration | Lorsque le comportement dépend de plusieurs composants ou d'une frontière réelle : graphe/persistance, extraction/index, policy/exécution, fournisseur, télémétrie, packaging | Les composants travaillent réellement ensemble et leurs contrats restent compatibles, y compris pour les échecs significatifs. |
| Test E2E automatisé | Lorsqu'un parcours utilisateur, le terminal, l'installation, le redémarrage ou une garantie traversant plusieurs couches est créé ou modifié | Un processus de l'application réellement lancé reçoit des entrées publiques et produit le résultat utilisateur attendu. |
| Essai E2E avec service réel | Avant de déclarer une route ou intégration externe supportée, puis après un changement susceptible de l'affecter et pour la release | Authentification, capacités, usage, annulation et reprise fonctionnent réellement avec le compte et l'environnement annoncés. |

« Quand nécessaire » se décide d'après le comportement et le risque, pas d'après la commodité. Un changement purement local n'oblige pas à ajouter un E2E redondant. En revanche, chaque plan introduit ici un parcours ou une frontière qui justifie les tests d'intégration et E2E identifiés dans sa section dédiée ; ils sont obligatoires pour ce jalon.

Un test appelant directement le service applicatif est un test d'intégration, pas une preuve du terminal installé. Un E2E du produit traverse son point d'entrée réel et vérifie sa sortie visible ou son export. Le test de distribution lance le paquet construit, avec ses dépendances et assets, pas seulement le code source dans l'environnement de développement.

## 3. Des tests représentatifs et maintenables

- Tester les comportements publics, les résultats et les invariants. Éviter méthodes privées, structure interne des tables, ordre d'appels de collaborateurs internes et snapshots massifs qui figent un détail sans valeur produit.
- Employer les vrais composants internes : graphe, stockage SQLite de test, extraction, retrieval, broker et services applicatifs. Vérifier la persistance en rouvrant le service ou le processus puis en lisant via son interface publique.
- Remplacer seulement les frontières externes nécessaires pour rendre la suite déterministe : API modèles, service distant, horloge ou hasard. Ces doublures ne certifient jamais l'intégration réelle qu'elles remplacent.
- Utiliser de vrais fichiers temporaires et processus pour les garanties d'originaux, d'isolation et de reprise. Les simulations peuvent provoquer une panne, mais ne prouvent pas qu'un sandbox ou un serveur MCP respecte effectivement ses limites.
- Vérifier les textes générés par des structures, références, invariants et effets attendus. Ne pas exiger une phrase LLM mot pour mot. Un jeu déterministe teste le workflow ; l'essai réel vérifie la route et la qualité du parcours.
- Tester aussi refus, versions obsolètes, usage inconnu, plafond atteint, panne et action ambiguë lorsqu'ils concernent la tranche. Les attentes viennent de la spec et de cas explicites, pas d'un recalcul copié du code testé.
- Préférer une synchronisation sur événements et états observables aux attentes arbitraires. Isoler données, horloges et ressources ; garder les tests reproductibles sans rendre un vrai défaut vert par relances répétées.

## 4. CI et acceptation

Le plan 01 installe progressivement le runner, la suite d'intégration, le lancement E2E du terminal/paquet et la CI nécessaires à ses propres tranches. Les plans suivants étendent ces parcours au moment où ils implémentent la capacité correspondante.

Chaque changement d'implémentation exécute en CI les contrôles déterministes concernés et les régressions critiques : tests de comportement, intégration et E2E nécessaires. La matrice de plateforme couvre les garanties dépendantes de l'OS. Une modification du packaging ou d'un adaptateur spécifique doit être vérifiée sur les environnements concernés avant de déclarer leur support.

Les essais vivants sont isolés des tests sans comptes : compte autorisé, secrets protégés, budget autorisé et déclenchement explicite. Ils restent obligatoires aux portes de validation concernées. Un compte manquant, un quota épuisé ou un runner de plateforme absent signifie « non vérifié » ; cela ne permet pas de marquer le jalon correspondant comme validé. La suite déterministe peut continuer à fonctionner sans ces accès.

Un taux global de couverture ne remplace ni les scénarios critiques ni l'essai réel. Un test requis désactivé, ignoré ou instable sans résolution bloque l'acceptation de la capacité touchée. Une démo manuelle complète les tests automatisés ; elle ne les remplace pas.

## 5. Un README comme vitrine du produit

Le `README.md` public, en anglais, est un livrable produit majeur. Il doit donner envie d'essayer BOARDROOM, prouver sa valeur et permettre à un utilisateur ou recruteur de l'évaluer rapidement. Son ambition associe qualité éditoriale, démonstration concrète, présentation soignée et crédibilité technique.

Il commence en 01, évolue à chaque jalon, reçoit sa composition éditoriale et visuelle complète en 07, puis passe une validation finale bloquante en 09. Le README décrit les capacités réellement disponibles dans la version présentée.

### Parcours de lecture attendu

| Partie | Exigence concrète |
|---|---|
| Premier écran | Nom et identité visuelle sobre, proposition de valeur précise, public visé et lien immédiatement visible pour essayer. Le lecteur comprend ce que produit BOARDROOM et dans quelle situation l'utiliser. |
| Démonstration | Capture ou courte animation du vrai terminal, lisible sans zoom excessif, avec alternative textuelle. Le statut enregistré/fictif de l'exemple est explicite. |
| Preuve de valeur | Un mini-récit « proposition initiale → objection sourcée → plan révisé → désaccord conservé », accompagné d'un extrait d'artefact réel issu du jeu de démonstration. |
| Démarrage rapide | D'abord essayer l'exemple sans compte, puis connecter ses modèles pour une réunion réelle. Instructions copiables et vérifiées sur les OS annoncés, liens de téléchargement exacts et prérequis visibles. |
| Fonctionnement | Les trois rôles, la place de l'humain, les phases du débat et les résultats produits, avec un diagramme compact si utile. |
| Confiance | Ce qui reste local, ce qui est envoyé aux modèles, permissions, préservation des originaux, budget, limites de quota et observabilité facultative. Expliquer clairement le flux de données sans slogan de confidentialité trompeur. |
| Qualité d'ingénierie | Architecture lisible, principaux compromis et liens vers explications approfondies ; commandes de tests et pratique TDD, tests d'intégration/E2E et statuts CI authentiques. |
| Suite et contribution | Statut de la version, capacités disponibles et candidates, limites, documentation, signalement de problèmes, contribution et licence réellement décidée. |

La profondeur doit rester accessible par liens vers la documentation dédiée. Le README raconte un parcours cohérent ; il ne recopie pas toute la spec. Les badges éventuels correspondent à des vérifications ou informations réelles. Les modèles supportés, métriques, performances, logos, témoignages et promesses doivent être justifiables ; aucun élément de crédibilité n'est inventé pour décorer la page.

### Qualité visuelle et éditoriale

Hiérarchie claire, paragraphes courts, titres utiles, composition aérée, exemples soigneusement choisis et cohérence des visuels. Vérifier le rendu GitHub en largeur courante et étroite, ainsi qu'en thèmes clair et sombre. Les diagrammes, liens, images, animations et textes alternatifs doivent rester lisibles ; une information indispensable ne doit pas dépendre uniquement d'une animation.

Utiliser des captures provenant de la version livrée avec données distribuables et sans secrets. Prévoir des médias raisonnablement légers, un aperçu statique et une présentation qui reste compréhensible sans chargement des animations. Une accumulation de badges, une bannière spectaculaire ou des adjectifs promotionnels ne suffisent pas à satisfaire l'ambition.

## 6. Acceptation du README

- [ ] Une personne extérieure au projet identifie en environ 30 secondes le public visé, le problème traité, le résultat obtenu et comment essayer. Cette durée est un objectif de test éditorial, pas une promesse de performance de l'application.
- [ ] Elle retrouve immédiatement la démonstration et peut expliquer, avec un exemple visible, comment une objection améliore une décision.
- [ ] Elle suit les instructions de l'exemple sans compte, puis celles du mode réel sans aide du développeur. Les prérequis et coûts éventuels sont compris avant les appels.
- [ ] Les commandes publiées sont exécutées telles quelles contre le paquet de release sur les OS annoncés ; liens, assets, ancres et destinations sont valides. Les commandes du quickstart alimentent les parcours E2E correspondants.
- [ ] Le rendu est inspecté sur GitHub en largeur courante/étroite et thèmes clair/sombre ; textes alternatifs, lisibilité des captures et repli statique sont présents.
- [ ] Le README montre une preuve du produit, une explication crédible de son architecture et des vérifications réelles, tout en restant agréable à parcourir.
- [ ] Les informations de version, support, licence, coûts, données et confidentialité sont cohérentes avec l'application et les documents détaillés. Les fonctionnalités à venir sont identifiées comme telles.
- [ ] La relecture de langue anglaise, l'essai novice et les défauts de présentation relevés sont traités avant la publication.

## 7. Définition de terminé commune

Pour accepter un plan : comportement implémenté en TDD-first, tests d'intégration/E2E requis verts avec preuves, contrôles réels requis effectués, et README à jour pour les capacités livrées. La bêta exige en plus tous les critères éditoriaux et visuels ci-dessus.

Ces exigences portent sur la future implémentation et ses livrables. La présente mise à jour des plans et la rédaction éditoriale se vérifient par cohérence, liens, rendu et essais des instructions ; elles ne justifient pas des tests artificiels sur le contenu d'un paragraphe.
