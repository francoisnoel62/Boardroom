# Plan 01 — Un parcours local installable, sans compte

Statut : accepté avec réserves le 3 octobre 2026 ; parcours local enregistré qualifié sur Windows x64, Linux x64 et macOS arm64, avec paquets sans Node applicatif préinstallé. La fusion des PR #1 à #7 dans `main` acte l'acceptation, sans release. [Acceptation, limites et réserves](../docs/plan-01-acceptance.md). [Preuves et travaux restants](../docs/plan-01-progress.md). Dépendances : aucune. Suite : [plan 02](02-PREMIERE-DECISION-REELLE.md). Références : spec §1, §3, §6, §7, §10 et §11. [Ordre général](00-ORDRE-ET-DEPENDANCES.md).

## Ce qui devient utilisable

Une personne installe un paquet candidat, ouvre un projet de démonstration, lit une courte discussion enregistrée, inspecte une source et son emplacement exact, puis produit un plan et un mémo dans un nouveau dossier. Aucune connexion modèle n'est nécessaire et aucun appel IA n'est simulé comme étant vivant.

Cette tranche valide aussi les contraintes qui pourraient invalider l'architecture avant le développement du débat réel.

## Entrée et décisions à prendre

- Partir de la spec et préciser la matrice OS/architecture effectivement visée. Ne pas assimiler support des trois OS à support de toutes les architectures possibles.
- Revérifier les versions compatibles de Node 24, Ink, LangGraph, du checkpointer SQLite officiel et de sa famille de pilote natif. Figer cet ensemble et justifier tout écart.
- Définir les emplacements des données applicatives, des secrets futurs et des sorties. Les données durables restent hors du paquet d'installation.
- Utiliser des documents fictifs distribuables et des emplacements temporaires pour les essais d'actions. Un éventuel essai fournisseur ou Langfuse nécessite un compte et une enveloppe déjà autorisés.

## Tranches d'implémentation, dans cet ordre

Appliquer les [exigences transversales TDD et README](EXIGENCES-TDD-ET-README.md) dès la première tranche : écrire et exécuter le test rouge avant le comportement correspondant, puis avancer jusqu'au vert. Mettre en place progressivement le runner et les portes CI avec les premiers scénarios ; ne pas réserver les tests à la fin du plan.

1. **Installer et ouvrir.** Produire un paquet avec Node embarqué et dépendances natives préparées. Afficher un écran anglais, charger une configuration locale minimale et afficher les capacités disponibles. Vérifier le lancement avec un chemin comportant espaces et Unicode.
2. **Ouvrir un projet et une preuve.** Créer un projet de démonstration avec autorisation explicite de ses sources texte/Markdown. Enregistrer identité, empreinte, version, emplacement et extraction ; ouvrir une citation sur l'instantané exact. La lecture n'accorde aucun accès à d'autres projets.
3. **Lire et exporter.** Faire jouer une fixture courte dans le terminal, étiquetée « Recorded example ». Montrer rôles, modèles enregistrés et résultat. Exporter deux nouveaux fichiers UTF-8 sans remplacer une source ou un export existant.
4. **Fermer et rouvrir.** Sauvegarder le projet, les versions, les événements et le point de lecture. Exécuter un minuscule graphe LangGraph avec checkpoint durable, puis vérifier sa réouverture. Le lecteur de fixture et le graphe d'essai ne sont pas présentés comme une réunion réelle.
5. **Éprouver le paquet complet.** Dans ce même mode de distribution, charger le pilote SQLite et FTS5, les workers/actifs PDF.js, Mammoth et le candidat embeddings local. Vérifier extraction PDF/DOCX, entrée terminal pendant un flux, annulation, et export de trace filtrée dans un mode de validation technique séparé.
6. **Qualifier les protections.** Tester des adaptateurs candidats de commande avec cibles temporaires protégées, bornes réseau et fichiers hors copie. Noter séparément la protection possible des MCP locaux et distants. Conserver toutes les actions de commande/MCP indisponibles dans le produit à ce jalon.
7. **Ouvrir la vitrine du projet.** Créer le README public en anglais : promesse précise, statut du premier jalon, installation vérifiée, accès à l'exemple sans compte, première capture réelle et liens vers l'architecture. Présenter clairement les capacités livrées et la suite prévue. Le README accompagne déjà un parcours utilisable.

## Contrats à fixer

- Le client terminal affiche des événements et envoie des commandes au service applicatif ; il ne possède pas l'état métier.
- Définir des schémas versionnés minimaux pour projet, réunion, contexte, proposition, avis, preuve, événement et action. Les données d'exemple passent par ces schémas.
- Séparer les responsabilités de la base métier, des checkpoints et du magasin d'instantanés/artefacts. L'index est reconstructible ; les décisions, versions et reçus ne le sont pas à partir d'un index seul.
- Préparer identifiants stables d'opérations, journal durable et écritures courtes sérialisées. Aucune transaction SQLite ne reste ouverte pendant une attente réseau ou humaine.
- Une absence de fonctionnalité est une capacité indisponible explicite, jamais une permission implicite ou une valeur d'usage nulle.

## Tests d'intégration et E2E obligatoires

- **Intégration :** service projet + instantanés + vrai SQLite/checkpointer ; export dans un répertoire temporaire ; extraction PDF/DOCX depuis les assets prévus. Observer les résultats via les interfaces publiques et réouvrir le service pour vérifier la durabilité.
- **E2E automatisé :** lancer le paquet dans un vrai processus, piloter le terminal, ouvrir l'exemple, inspecter une citation, exporter puis fermer/rouvrir. Exécuter le parcours de lancement sans Node préinstallé sur chaque OS annoncé.
- **Cas négatifs :** source modifiée, export déjà présent, extraction partielle et capacité absente. Introduire chaque test avant son comportement, sans préparer d'un bloc toute la suite des futurs plans.
- **README :** ses instructions d'installation et de lecture de l'exemple doivent correspondre au parcours E2E ; vérifier les liens et la lisibilité de la capture.

## Validation de sortie

- [x] Les tranches sont réalisées en TDD-first avec preuve rouge → vert ; les tests d'intégration et E2E requis passent dans les environnements concernés et leurs contrôles déterministes sont intégrés à la CI.
- [x] Le README anglais initial permet de comprendre et d'essayer ce jalon avec des instructions réellement vérifiées.

- [x] Sur Windows, macOS et Linux, un environnement propre sans Node préinstallé lance le paquet, lit la fixture et rouvre ses données locales après redémarrage.
- [x] Une citation texte retrouve la bonne révision ; une modification de l'original ne modifie pas l'instantané déjà enregistré.
- [x] Deux exports successifs créent des résultats distincts ; les empreintes des originaux restent identiques.
- [x] L'étiquette d'enregistrement est visible pendant la lecture et dans les exports. Le parcours sans compte n'émet aucun appel fournisseur ni trace cloud par défaut.
- [x] La frappe, le collage multiligne, le redimensionnement, Unicode et l'annulation restent utilisables pendant un flux représentatif.
- [x] PDF textuel et DOCX s'extraient depuis le paquet distribué ; un fichier mal interprété produit un avertissement exploitable.
- [x] Le checkpoint, FTS5, le candidat embeddings, le streaming fournisseur et le candidat export filtré ont une preuve d'essai ou un résultat de blocage explicite par environnement. Le streaming réel reste à confirmer obligatoirement en 02 s'il manque des accès de test en 01.
- [x] Le rapport d'isolation distingue ce qui protège réellement les cibles, les prérequis nécessaires et les capacités indisponibles. Une simple copie de répertoire n'est pas considérée comme une barrière.

Réserves consignées à l'acceptation, détaillées dans le [dossier d'acceptation](../docs/plan-01-acceptance.md#accepted-limits-and-reservations) :

- **TDD** : les garanties d'intégrité des instantanés, d'original supprimé et de format refusé n'ont reçu leurs tests qu'à la revue d'acceptation. Ce sont des tests de caractérisation, pas du TDD-first.
- **Flux représentatif** : un rafraîchissement fictif toutes les 200 ms. Le streaming fournisseur sur un long transcript est à qualifier en 02.
- **Candidat embeddings** : non tenté, faute de runtime et de modèle embarqués. Le risque de packaging passe en 05.
- **Isolation** : aucun candidat ne démontre de protection. La cible « protégée » l'est par un attribut lecture seule, et un refus réseau peut n'être qu'un délai dépassé.
- **Contrats** : schémas minimaux calqués sur l'exemple ; dans la projection JSON, les avis ne sont pas attribués individuellement.
- **Configuration** : options CLI et projet enregistré. Les clés et les secrets sont définis en 02.

## Preuves et règle de passage

Conserver les paquets candidats, la matrice d'essai, le jeu fictif, les exports et une note de choix techniques. La note sépare « testé », « candidat » et « indisponible », notamment pour chaque OS.

Le lancement, la persistance, le terminal et le parcours sans compte sur les trois OS sont bloquants pour accepter 01. L'absence d'un embedding facultatif, d'un compte de trace ou d'une isolation de commande n'interdit pas le parcours local ; le repli et la porte de validation restante doivent être consignés. Un essai non réalisé ne peut pas être noté réussi.

## Limite de cette livraison

Ce jalon sert à consulter et exporter un exemple local. Il n'apporte encore ni débat vivant, ni mémoire inter-réunions, ni outils exécutables par les conseillers. L'histoire SaaS complète sera finalisée en 07.
