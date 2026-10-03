# État des lieux de Boardroom — 3 octobre 2026

## Périmètre et conclusion

Audit du checkout au commit `f87a42f3c7bc9255e010da95a847344a177cc717` : fusion de la PR #7, le 3 octobre 2026 à 15:04:30, heure de Bangkok. L'arbre suivi était propre au début de l'audit ; ce checkout est en HEAD détachée. Cet état des lieux porte sur le code local et les preuves conservées dans le dépôt. Les statuts GitHub actuels et les comptes fournisseurs n'ont pas été consultés.

**Le plan 01 est déclaré accepté avec réserves, et le code fournit effectivement un parcours local enregistré. Le plan 02 n'est pas implémenté : aucune réunion réelle ne peut encore être lancée.** Le principal chantier est le moteur métier et son orchestration, au-delà du branchement d'API.

Le [document 02](../boardroom-plans/02-PREMIERE-DECISION-REELLE.md) du dépôt et celui fourni depuis le checkout du Bureau ont un contenu identique. Il sert de cahier des charges pour la future implémentation. La demande présente couvre l'audit et la rédaction du plan ; elle ne déclenche ni développement fonctionnel, ni appels payants, ni création de PR GitHub.

Le découpage proposé se trouve dans le [plan d'implémentation en 10 PR](../boardroom-plans/02-PLAN-IMPLEMENTATION-EN-10-PR.md).

## Ce qui fonctionne et ce qui manque

| Domaine | État constaté | Preuves et conséquences pour 02 |
| --- | --- | --- |
| Runtime et distribution | TypeScript/ESM ; Node 24.12.0 qualifié ; paquet par plateforme avec runtime et dépendances natifs copiés | [package.json](../package.json), [packager](../scripts/package.mjs). Les preuves conservées couvrent Windows x64, Linux x64, macOS arm64 ; aucune release publique n'est annoncée |
| Service applicatif | `Boardroom` possède l'état, le stockage, la lecture de preuves et les exports | [application.ts](../src/application.ts). Réutilisable, mais les commandes de réunion réelle restent à créer |
| Projets | Un seul projet fictif `launch-ledger` ; schéma limité à `recorded: true`, langue `en` | [domain.ts](../src/domain.ts), `openDemo()`. Créer des projets et réunions réels, sans convertir la démo en réunion réelle |
| Sources texte/Markdown | Capture autorisée au niveau du service, snapshots SHA-256, révisions, citations par lignes et détection d'original modifié/manquant | `captureSource()` et `resolveCitation()`. Une CLI de sélection des passages et un contexte de réunion figé manquent. La capture texte alloue actuellement sa révision hors transaction : sécuriser les captures concurrentes utilisées en 02 |
| PDF/DOCX | Extraction réelle, snapshots distincts, pages PDF et blocs DOCX, états partiel/échec visibles | [extraction.ts](../src/extraction.ts), tests documentaires. Acquis de 01 à conserver ; pas à intégrer au contexte des réunions réelles de 02 |
| Persistance | SQLite WAL, délai d'attente fini, table de records validés et journal append-only | [application.ts](../src/application.ts). Les transactions de lecture/playback/export existent ; pas de coordinateur général de travaux asynchrones ni de registre d'appels modèles |
| Débat et versions | Projection de la fixture vers contexte v1, propositions v1/v2 et avis | `recordedDecision()`. Ces éléments sont reconstruits depuis l'enregistrement, pas des objets de débat réel persistés indépendamment |
| Avis | Les trois verdicts requis sont déjà représentables dans la projection | `AdviserViewSchema`. Chaque `statement` reprend le même message final fictif ; pas de confiance, incertitude critique, conditions ni liens métier structurés individuels |
| Décision humaine | Toujours `pending` | Schémas et CLI `decision`. Aucun chemin pour accepter, rejeter, modifier, reporter ou demander une investigation |
| Exports | Deux Markdown distincts, création exclusive, intention durable et reçus avec hashes ; issue incertaine visible et sans relance automatique | `prepareRecordedExport()`. Bon socle ; le contenu est celui de la fixture, avec décision humaine en attente. Export réel/partiel et JSON expurgé à ajouter |
| LangGraph | Dépendance installée et checkpoint SQLite réellement rouvert dans une sonde | [technical-validation.ts](../src/technical-validation.ts). Le graphe ne fait qu'incrémenter un compteur ; ce n'est pas le moteur de réunion |
| Terminal | Affichage Ink de la démo ; sonde de saisie, paste, Unicode, resize et annulation | [terminal.tsx](../src/terminal.tsx), [terminal-validation.tsx](../src/terminal-validation.tsx). Pas de conversation interactive connectée au service ; la sonde fait alterner deux lignes toutes les 200 ms |
| Fournisseurs | Aucun adaptateur ni authentification ; `liveMeetings: unavailable` | [application.ts](../src/application.ts), [cli.ts](../src/cli.ts), dépendances. Configuration partageable, coffre de secrets, capacités, sorties structurées et métriques à livrer |
| Coût et durée | Aucun ordonnanceur ni réservation opérationnelle | Aucun état/contrat correspondant dans le moteur actuel. Les limites doivent précéder les premiers appels facturés |
| Confidentialité technique | Trace locale avec champs autorisés ; cloud désactivé | `exportFilteredTrace()`. Les variables de tracing héritées ne sont neutralisées que dans `doctor` : protéger tout le futur processus réel avant import des clients/graphe |
| Outils et isolation | Commandes/MCP indisponibles ; sondes de protection bloquées ou échouées | [acceptation 01](plan-01-acceptance.md). Aucune protection opérationnelle certifiée. Leur activation appartient à 06 |
| Recherche et mémoire | FTS5 testé comme capacité ; embeddings absents | Sonde technique. Pas de recherche métier à l'échelle d'un projet ; cela reste en 05 |
| Tests et CI | 48 tests déclarés dans la suite ; vrais fichiers, SQLite, processus et PTY ; matrice avec jobs d'installation séparés | [tests](../tests), [CI](../.github/workflows/ci.yml). Les preuves conservées concernent le mode enregistré, pas une réunion multi-fournisseur |
| Documentation | README anglais soigné, récit fictif explicite, guides et preuves d'acceptation | [README](../README.md), [guide](getting-started.md). Aucune preuve distribuable de débat réel ni quickstart réel |

## Validation de cet audit

Le runtime observé est Node `v24.12.0`, npm `11.6.2`, sur Windows x64. Le dépôt ne contenait pas de `node_modules` au départ.

- `npm ci --no-audit --no-fund` : téléchargements refusés par l'environnement (`EACCES` sur le registre npm), puis tentative interrompue. Cela ne constitue pas une installation propre réussie.
- Repli : réutilisation des dépendances présentes dans `C:\Users\François\Desktop\dev\Boardroom`, après comparaison des JSON parsés de `package-lock.json` : identiques. La différence de hash brut venait du format des fichiers.
- `npm run typecheck` : vert après copie complète des dépendances.
- `npm test` : **48/48 tests verts**, zéro échec, zéro ignoré ; durée totale environ 98,5 secondes. Cette exécution couvre aussi le candidat Windows embarquant Node et SQLite, les citations, exports, checkpoints, processus concurrents et vrais PTY. Elle utilise les dépendances locales réutilisées ; elle ne valide pas une réinstallation propre depuis le registre.
- Commande `node dist/cli.js status --data-dir .boardroom/audit-2026-10-03` : mode enregistré disponible, réunions réelles et commandes/MCP indisponibles, cloud désactivé, conformément au code.
- Vérification documentaire : les 26 liens locaux des deux nouveaux documents sont résolus ; le plan comporte exactement dix sections de PR.

Les [preuves d'acceptation de 01](plan-01-acceptance.md) retiennent les campagnes CI sur `94c0409` et `7d60a91`, les trois plateformes, les exports et les hashes des candidats. Ce sont des preuves historiques conservées ; elles ne certifient pas de futures modifications de 02. La CI courante n'a pas été relancée lors de cet audit.

## Réserves de 01 qui affectent directement 02

1. **Contrats façonnés par la démo.** Ajouter de nouveaux contrats réels versionnés ; conserver les lecteurs des records existants. Ne pas réutiliser le parsing par expression régulière de la fixture pour interpréter des sorties modèles.
2. **Graphe et journal distincts.** Le futur moteur doit utiliser le vrai LangGraph, tout en gardant les records et reçus locaux comme références métier. Un checkpoint n'est pas une preuve qu'un appel externe peut être rejoué.
3. **Terminal peu représentatif du streaming réel.** Qualifier un historique long, des flux concurrents, l'interruption en vol et la saisie humaine.
4. **Aucune base pour promettre un plafond monétaire.** Vérifier tarifs, bornes d'entrée/sortie, postes facturés et comportement d'annulation route par route. L'usage inconnu conserve une réservation prudente.
5. **Aucune intégration fournisseur validée.** Vérifier les interfaces officielles et modèles disponibles sur les comptes effectivement utilisés ; aucun nom de modèle choisi sur sa seule présence dans une documentation.

Les réserves concernant embeddings, sandbox, MCP, installation publique, signature, licence et reproductibilité complète restent dans leurs jalons respectifs. Elles ne sont pas transformées en prérequis artificiels au débat texte de 02.

## Direction produit à réconcilier

[Contributing](contributing.md) précise, depuis le 3 octobre, que le CEO choisit la taille de son équipe, ses rôles et ses modèles. Le document 02 conserve un scénario d'acceptation à trois conseillers : PO, Lead Developer et Marketing Manager.

Proposition pour 02 : persister une sélection de conseillers avec identifiants stables et désigner explicitement l'auteur de proposition ; livrer et qualifier d'abord le profil de trois rôles prescrit. L'API de configuration ne doit pas ériger ces trois chaînes en identité universelle du produit. Le débat arbitraire à N conseillers et l'éditeur de rôles ne sont pas annoncés comme disponibles dans ce jalon.

## Priorité

Le dépôt est suffisamment équipé pour commencer 02 sans remplacer le runtime, le stockage, le checkpointer ou le terminal. La première livraison doit ouvrir un projet réel et figer des passages ; les suivantes établissent les connexions et le budget, puis le parcours de décision. L'acceptation finale dépend d'une réunion réellement exécutée avec trois modèles distincts et deux fournisseurs au moins.
