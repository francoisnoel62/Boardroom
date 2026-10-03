# Plan 07 — Démarrer seul, de l'exemple aux vraies connexions

Statut : à réaliser. Dépendances directes : [02](02-PREMIERE-DECISION-REELLE.md) pour les fournisseurs réels, [06](06-INVESTIGATIONS-ET-OUTILS-PROTEGES.md) pour la frontière d'actions. Plans 01–06 acceptés. Suite : [plan 08](08-OBSERVABILITE-FACULTATIVE.md). Références : spec §1, §3, §5, §8 et §10–11. [Ordre général](00-ORDRE-ET-DEPENDANCES.md).

## Ce qui devient utilisable

Un nouveau visiteur peut comprendre la valeur de BOARDROOM avant de connecter un compte. Il explore un exemple SaaS explicitement enregistré, configure ses propres accès puis lance une réunion réelle sur son projet, avec peu de réglages ordinaires.

## Entrée

Le parcours de décision, les interventions, la reprise, les sources et la frontière d'outils sont opérationnels. Les connexions API de 02 restent une voie autonome utilisable. Aucun compte BOARDROOM ni compte Langfuse ne doit être nécessaire.

Revérifier les documentations officielles, conditions d'utilisation et éligibilités actuelles pour les intégrations abonnement. Les descriptions de la spec sont des résultats de recherche datés, pas des preuves de fonctionnement de BOARDROOM.

## Tranches d'implémentation, dans cet ordre

Chaque comportement ci-dessous commence par un test rouge, puis son implémentation minimale jusqu'au vert, conformément aux [exigences transversales TDD et README](EXIGENCES-TDD-ET-README.md).

1. **Finaliser l'histoire de découverte.** Remplacer la fixture courte par l'exemple enregistré d'un lancement SaaS fictif. Fournir les documents et données fictifs. Montrer une objection sourcée, une révision de proposition, un conseiller qui change de position et le désaccord final restant. Donner à chaque rôle une contribution substantielle.
2. **Guider le passage au réel.** Séparer clairement lecture de l'exemple et création d'une réunion vivante. Guider choix du projet, connexion, association rôle/modèle, langue, durée cible et budget. Une question et un contexte suffisent ; le plan existant reste facultatif.
3. **Fiabiliser la configuration API.** Tester connexion et capacités, expliquer une clé absente ou révoquée, permettre la modification des modèles et protéger les secrets. Montrer les prérequis utiles au moment pertinent ; ne pas imposer l'installation d'un sandbox ou l'observabilité pour la première réunion.
4. **Instruire le candidat ChatGPT.** Vérifier la voie officielle adaptée à une application locale/open source, les comptes et modèles éligibles, les restrictions de preview, l'authentification, l'usage et l'annulation. Implémenter seulement les opérations autorisées et démontrables avec les comptes d'essai disponibles.
5. **Instruire le candidat Claude.** Vérifier les conditions de l'intégration du binaire Claude Code non modifié avec l'authentification propre à l'utilisateur. Distinguer ce montage d'un OAuth BOARDROOM ou d'un droit universel à l'Agent SDK. Tester son interaction avec la frontière d'outils et la reprise.
6. **Publier une matrice de capacités honnête.** Par route, afficher authentification, modèles, streaming, sorties structurées, outils, annulation, mesure d'usage et limitations. Une route inutilisable pour une opération est déclarée non prise en charge pour cette opération, sans dégrader silencieusement le produit.
7. **Composer un README remarquable.** Transformer le README enrichi depuis 01 en véritable vitrine anglaise : proposition de valeur immédiate, capture/animation réelle du terminal, récit d'une décision améliorée, démarrage sans compte puis mode réel, flux de données, architecture et preuves d'ingénierie. Soigner le rythme de lecture, la hiérarchie et les visuels selon les critères des exigences transversales. Les instructions et médias proviennent de la version effectivement testée.

## Contrats de connexion

- Les routes partagent une interface de capacités, pas une fiction d'équivalence. L'utilisateur sait quel fournisseur et quel modèle réalise chaque intervention.
- Un quota inconnu s'affiche comme inconnu. Un abonnement n'est pas une API gratuite illimitée ; aucun échec ou quota épuisé ne déclenche une route facturée à part.
- Les secrets restent hors des projets partageables, des exports, de l'exemple et des logs. Déconnexion et erreur d'authentification ont un parcours explicite.
- Une intégration native qui utilise ses propres outils doit exposer les demandes au broker ou fonctionner avec des restrictions équivalentes réellement vérifiées. Sinon, l'opération reste indisponible.
- La matrice distingue candidat étudié, essai en cours et route validée. Seul un essai complet sur le type de compte concerné permet d'annoncer un support.
- Le replay ne consomme pas de crédit modèle et ne présente jamais son activité enregistrée comme de nouveaux appels.

## Tests d'intégration, E2E et README

- **Intégration obligatoire :** configuration, stockage de secrets, description des capacités, adaptateurs de connexion et broker. Couvrir accès révoqué, quota inconnu/épuisé et absence de bascule API implicite.
- **E2E automatisé obligatoire :** installation/configuration vierge → exemple sans compte → configuration d'une connexion de test → réunion → export, via le terminal. Vérifier la distinction replay/live et l'absence de secrets dans sorties et diagnostics.
- **E2E réels obligatoires :** avant d'annoncer une route abonnement, valider son compte et ses capacités de bout en bout. Les étapes d'authentification nécessitant un geste humain sont consignées ; elles ne dispensent pas d'automatiser le reste du parcours reproductible.
- **README :** utiliser son quickstart comme point d'entrée de l'essai novice ; inspecter le rendu GitHub clair/sombre et étroit/courant. Les contrôles de liens, commandes et assets complètent la relecture humaine de la qualité visuelle et éditoriale.

## Validation de sortie

- [ ] Les comportements sont réalisés en TDD-first ; les tests d'intégration/E2E requis passent et chaque connexion annoncée dispose de son essai réel.
- [ ] Le README complet satisfait la grille éditoriale et visuelle des exigences transversales avec démonstration lisible, preuve de valeur et instructions vérifiées ; les remarques de l'essai novice sont traitées.

- [ ] Depuis une installation neuve, une personne sans compte découvre l'exemple et comprend ce qui est fictif, enregistré et réutilisable.
- [ ] L'exemple rend inspectable la chaîne objection → preuve → nouvelle proposition → avis révisé, tout en préservant un désaccord final.
- [ ] Cette personne connecte ses propres clés et lance une vraie réunion à trois modèles de deux fournisseurs sans aide du développeur ni compte Langfuse.
- [ ] Le changement de mode est visible : l'état enregistré n'est pas réutilisé comme réunion réelle courante.
- [ ] Clé invalide, accès révoqué, capacité absente, quota inconnu et quota épuisé produisent des messages exacts et une suite d'actions explicite.
- [ ] Toute route abonnement annoncée passe connexion, réunion réelle, demandes d'outils, interruption, mesure disponible et reprise avec le type de compte réellement supporté.
- [ ] L'épuisement ou l'échec d'un abonnement ne produit aucune requête vers une API séparément facturée sans choix humain explicite.
- [ ] Le parcours fonctionne sur les trois OS et avec les limitations de capacités affichées ; l'exemple reste disponible sans réseau fournisseur.

## Preuves et règle de passage

Conserver le scénario de découverte, le jeu fictif distribuable, un compte rendu d'essai par route et les références officielles revérifiées avec leur date. Faire parcourir l'installation → exemple → connexion → première décision à une personne qui n'a pas développé l'application, et corriger les blocages observés.

Le parcours sans compte et le parcours API réel sont bloquants. Pour ChatGPT et Claude, livrer une intégration seulement lorsqu'elle est validée ; sinon consigner précisément le blocage, les opérations indisponibles et la voie API disponible. Cette règle suit l'intégration progressive prévue par la spec. Ne pas transformer la liste des candidats en une promesse de support universel. L'abonnement Gemini n'est pas un prérequis V1.

## Limite de cette livraison

Pas de compte central BOARDROOM, de paiement intégré, de partage entre comptes humains, ni de découverte automatique de clés sur la machine. L'observabilité cloud et ses contrôles de contenu seront livrés séparément en 08.
