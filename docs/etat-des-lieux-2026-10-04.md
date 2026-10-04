# État des lieux de Boardroom — 4 octobre 2026

## Conclusion PO et lead développeur

**Le socle déterministe de décision est implémenté et fusionné. La participation humaine pendant les phases reste à construire.** Le plan 01 est accepté avec réserves ; le plan 02 n'est pas encore accepté, car sa campagne complète avec trois modèles réels de deux fournisseurs n'a pas été effectuée. Une fusion, une CI verte et des réponses HTTP de test ne remplacent pas cette preuve produit.

L'audit a d'abord révélé un décalage substantiel du site et de plusieurs documents : ils présentaient encore les appels live comme absents, et certains promettaient qu'aucune donnée ne quittait la machine. Les corrections de cette branche décrivent le parcours effectivement implémenté, ses autorisations et ses limites de qualification. Le [plan d'implémentation 03 en 10 PR](../boardroom-plans/03-PLAN-IMPLEMENTATION-EN-10-PR.md) couvre ensuite toutes les exigences du cahier des charges, avec dépendances, critères d'acceptation et preuves attendues.

## Base exacte et méthode

- Branche de référence : `main`, commit `ac9111ffc7c7b2ea5508679600628697641f3b5a`, fusion de la PR #21 le 4 octobre 2026 à 20:27:28, heure de Bangkok. `git ls-remote origin refs/heads/main` a confirmé l'identité avec le checkout local. Arbre suivi propre au départ ; historique Git complet, non shallow.
- Dernière fusion : correction des quatre blocages relevés sur 02 — horloge des tarifs, sous-ensembles de schéma fournisseur et preflight, réserves calculées selon l'équipe, intégration finale. Les PR #8–14, #16, #17, #19 et #21 apportent les dix incréments et leur correctif ; le site et ses correctifs arrivent via #15, #18 et #20.
- Surface documentaire initiale : **73 fichiers Markdown/MDX suivis**, plus les textes Astro/TypeScript du site et le texte de release du workflow. Contrôle des affirmations de disponibilité, confidentialité, commandes, contrats, architecture, statuts et liens. Les spécifications et anciennes preuves sont distinguées des guides de la version courante ; les essais historiques ne sont pas antidatés ni remplacés.
- Sources de vérité : code et branchement dans le service/CLI, schémas, tests et scripts de qualification, historique Git, résultats GitHub du commit exact, puis contenu réellement servi par Vercel. Aucun compte fournisseur ni secret réel n'a été utilisé ; aucun appel modèle payant n'a été lancé.
- Corrections préparées sur `codex/main-audit-plan-03`. Cet audit documente des changements de dépôt ; il ne certifie pas leur mise en production avant fusion et déploiement.

## Vérification du site publié

Le dépôt indique [boardroom-phi.vercel.app](https://boardroom-phi.vercel.app) comme site public. Le statut Vercel du commit audité est `success`. Une lecture HTTP de [la première réunion réelle](https://boardroom-phi.vercel.app/docs/first-real-meeting/) a confirmé les textes obsolètes « Live meetings are not available in this build » et « Nothing is sent in the current build ». Il s'agit donc d'une dérive du contenu livré, pas seulement d'un ancien fichier non publié.

Le site généré ici corrige ces affirmations. La CI d'origine contrôlait l'existence des preuves et l'accord entre certaines listes, mais ne détectait pas leur obsolescence sémantique. Les pages éditoriales doivent être relues quand une capacité change, même si la référence CLI est générée.

## État fonctionnel vérifié

| Domaine | État au commit audité | Preuve / conséquence |
| --- | --- | --- |
| Exemple sans compte | Replay fictif, sources texte/PDF/DOCX, citations exactes, exports et historique utilisables | `src/application.ts`, `src/extraction.ts`, tests recorded/document/journal ; plan 01 accepté avec réserves |
| Projets et préparation live | Projet réel, contexte texte sélectionné et figé, équipe/version/routes préservées | `src/live-domain.ts`, `prepareTeamMeeting`, `readMeetingContext` ; contexte métier fixé à v1 |
| Connexions et secrets | Trois modèles distincts, deux fournisseurs ; coffre hôte ou injection de session explicite | `src/routes.ts`, `src/secrets.ts`, CLI credentials ; aucune déclaration ne prouve l'accès du compte |
| Appels fournisseurs | Adaptateurs OpenAI Responses et Anthropic Messages, flux provisoire, validation locale, correction bornée | `src/providers/`, `callStructured` ; aucune qualification complète sur comptes réels conservée |
| Bornes | Réservations avant départ, coûts inconnus conservés, réserves de révision/conclusion calculées | `src/call-control.ts`, `src/reserves.ts` ; pour l'équipe du quickstart, plancher de réservation 6,37 USD et 390 s, pas coût prévisionnel |
| Cadrage | PO puis approbation humaine explicite, correction versionnée et consentement invalidé | `src/live-framing.ts` ; aucune analyse sur cadrage non approuvé |
| Analyses | Trois entrées indépendantes sur même base, envoi concurrent après réservation du lot, sauvegarde de chaque succès | `src/live-deliberation.ts`, tests analyses ; pas encore de dépendances fines entre tâches |
| Débat | Proposition, objections ciblées/sourcées, révisions conservées, dispositions et arrêt borné | `src/live-debate.ts` ; la validité d'une citation ne prouve pas sa pertinence |
| Avis et décision | Avis sur version/hash précis, trois verdicts distincts, choix humain séparé, anciens avis marqués obsolètes | `src/live-decision.ts` ; modification humaine possible, nouveaux avis encore demandés explicitement |
| Terminal live | Parcours complet, saisie multilignes en flux, inspection, stop, conclusion, export | `src/live-terminal-session.ts`, `src/live-terminal.tsx` ; pendant `busy`, les interventions libres et corrections sont refusées |
| Temps et pilotage | Durées monotones des appels, exclusion de l'attente humaine, arrêt/conclusion | `ExecutionSchema` contient `active`, `concluding`, `stopped` ; absence de pause/reprise et d'extension |
| Persistance et export | Domaine SQLite, checkpoints de phase distincts, intentions/reçus, nouveaux fichiers, redaction de clés connues | Pas de transaction atomique SQLite/fichiers ; pas de reprise aveugle ; relecture requise avant partage |
| Distribution | Paquets avec Node 24.12.0 et dépendances natives, trois cibles qualifiées déterministement | CI producteurs + installations indépendantes ; aucune release GitHub publiée au contrôle |
| Plans suivants | Reprise guidée, mémoire/retrieval étendu, outils protégés, abonnements, cloud traces et bêta restent à réaliser | 04–09 ; aucune activation d'outil ou promesse de sandbox anticipée |

## Audit documentaire et corrections

| Impact | Écart constaté | Correction et source de validation |
| --- | --- | --- |
| Élevé | Site, sécurité et confidentialité annonçaient l'absence de connexions modèles / aucune donnée envoyée | README, `SECURITY.md`, pages accueil/sécurité/privacy, guide des données : distinguer replay local et appels autorisés vers les fournisseurs ; confronter `src/cli.ts`, `prepareStructured`, adaptateurs et stockage de secrets |
| Élevé | Première réunion, cycle et verdicts live présentés comme non implémentés | Guide utilisable avec liens de configuration, phases, plafonds et limites ; statut `Preview`, aucune annonce d'acceptation réelle ; confronter CLI, service et `docs/plan-02-acceptance.md` |
| Moyen | Roadmap et plan 02 ne rendaient pas visible l'implémentation fusionnée | Préciser « prochaine porte d'acceptation » et mise à jour du suivi français ; garder les cases d'acceptation non validées et les réserves |
| Moyen | Anciennes preuves PR utilisées alors que le commit final est vert | Lier le dossier 02 aux workflows exacts de `main`, avec les six jobs vérifiés |
| Moyen | Architecture du site limitée au graphe de probe ; guides encore formulés par incréments passés | Montrer les phases LangGraph live, checkpoints distincts, contrôle des appels et nature des données ; documenter la distinction horloge/pauses futures |
| Moyen | Guide `doctor`, codes de sortie et stockage incomplets après 02 | `implemented-unverified`, codes des phases live, `--with-json`, emplacement libre des exports, contrats live distincts du replay |
| Moyen | Brand kit, `llms.txt`, README du site et texte de release figés sur « recorded only » ou « non déployé » | Alignement avec le live implémenté, l'hébergement Vercel et l'absence de release ; aucun lancement de release effectué |
| Faible | Notes techniques et état des lieux du 3 octobre pouvaient être lus comme état courant | Bornage historique, liens vers la qualification et l'état présent ; conservation des résultats et limites d'origine |
| Technique | Le build documentaire ne lisait pas correctement l'aide CLI sur un checkout CRLF ; le test des sources des articles supposait LF | Normaliser les fins de ligne à la lecture et tester LF/CRLF ; défaut reproduit avant correction |
| Technique | Le vérificateur des commandes documentées terminait par un crash natif en copiant un candidat depuis un chemin Windows avec accents | Remplacer `cpSync` récursif par la copie dossier/fichier déjà employée par le packager ; test de régression avec espaces, accents et ressource imbriquée, puis 22 commandes réelles contre le candidat |

Les guides spécialisés 02 (préparation, routes, preflight, analyses, débat, décisions, terminal, qualification) ont été confrontés aux commandes et contrats qu'ils décrivent. Les versions/tarifs du catalogue restent ceux du code daté, pas une nouvelle certification de prix externes. Les preuves 01, les fixtures et exports conservés restent historiques. Les plans 03–09 et exigences transversales restent des engagements futurs. Le plan initial du site conserve son point de départ en le signalant explicitement comme historique ; les décisions prises et les statuts courants sont visibles en tête.

## Vérifications et preuves

### CI du `main` exact

| Contrôle distant | Résultat observé |
| --- | --- |
| [Produit : run 37205684977](https://github.com/francoisnoel62/Boardroom/actions/runs/37205684977) | Succès ; `verify` Windows x64, Linux x64, macOS arm64 et `installed` sur ces trois mêmes cibles |
| [Site : run 37205684810](https://github.com/francoisnoel62/Boardroom/actions/runs/37205684810) | Succès ; check, unitaires, build, contrôles statiques, E2E/accessibilité et budgets Lighthouse |
| Vercel | Statut de déploiement `success` ; contenu publié lu et dérive éditoriale confirmée |
| GitHub Releases | 0 release au moment de l'audit |

### Exécution locale de la branche corrigée

Résultats finaux sous Windows x64, Node 24.12.0 et npm 11.6.2. Les logs détaillés sont conservés localement dans `.boardroom/audit-2026-10-04/` (ignoré par Git). Les résultats des trois OS ci-dessus concernent le commit de référence ; les corrections de cette branche ont été exécutées localement sous Windows et devront repasser la CI après publication.

| Contrôle | Résultat |
| --- | --- |
| Produit : typecheck et suite complète | Typecheck vert ; **143/143**, zéro échec, test ignoré ou annulé ; vrais processus, PTY, paquet et coffre hôte requis |
| Site : `npm run check` | **0 erreur, 0 avertissement, 0 hint** sur 86 fichiers |
| Site : `npm run test:unit` | **66/66**, aucun échec ou test ignoré, dont les régressions CRLF et copie de candidat |
| Site : build et `npm run test:build` | **10/10**, liens/ancres, métadonnées, ressources, confidentialité et release de fixture verts |
| Site : E2E/accessibilité desktop/mobile, clair/sombre | **171 réussis, 1 non applicable** : le contrôle des liens de navigation desktop est explicitement ignoré sur mobile, où ils figurent dans le footer testé séparément |
| Site : Lighthouse | **7 URL × 3 mesures = 21 rapports** ; toutes les assertions et tous les budgets passent, aucune assertion en échec |
| Paquet et commandes documentées | Candidat produit ; **22 commandes exécutées, 0 échec**, depuis le checkout et une copie du paquet |
| Vérification visuelle complémentaire | Accueil et guide live, 1365/390 px, clair/sombre : 8 captures, aucun débordement horizontal ni violation axe sérieuse/critique |
| Liens Markdown du dépôt | **75 fichiers** après ajout du rapport et du plan, **0 lien relatif cassé** ; `git diff --check` vert |

L'environnement local était incomplet : `@napi-rs/keyring` absent, puis réinstallation bloquée par un `conpty.node` chargé sous Windows. Les dépendances ont été restaurées sans modifier le lockfile et le binaire SQLite reconstruit pour Node 24.12.0. Les échecs provoqués par l'absence de ce binaire ne sont pas présentés comme des régressions produit. Les tests nécessitant de vrais processus/PTY/coffres ont été exécutés hors du bac à sable Windows.

**Régression rouge → vert conservée :** `node --test tests/unit/cli-reference.test.ts tests/unit/field-notes.test.ts` échouait avec `The CLI help text has no Usage section` et une liste de sources vide. Les nouveaux cas reproduisent le défaut avec des entrées CRLF explicites même sur Linux. Après normalisation, toute la suite unitaire du site passe. Aucun test n'a été neutralisé pour obtenir ce résultat.

**Deuxième régression rouge → vert :** le nouveau test de `doc-commands.test.ts` échouait avec le code de sortie natif Windows `3221226505` lors de la copie récursive du candidat. La copie explicite passe ce même test puis l'exécution complète des commandes publiées. Le vérificateur utilise toujours une copie isolée : les sorties des exemples ne sont pas écrites dans le paquet d'origine. Les logs rouges et verts sont conservés avec l'audit.

La vérification distante finale confirme que `main` est resté sur `ac9111f` pendant l'audit. La campagne modèle réelle reste non exécutée et distincte de ces suites automatisées vertes.

## Risques et décisions avant 03

1. **Accepter 02 sur comptes réels.** Vérifier schémas, identité/modèles, usage, annulation et pertinence du débat, avec comptes et budgets séparément autorisés. La réserve TDD de l'incrément terminal 9 ne peut pas être effacée rétrospectivement.
2. **Renouveler les tarifs si nécessaire.** Le catalogue refuse les appels après le 14 octobre 2026 UTC. La procédure de revue est documentée dans [provider-preflight.md](provider-preflight.md). Cela n'autorise ni une extension automatique du catalogue ni des dépenses de qualification.
3. **Construire une vraie gestion des dépendances.** Les contextes sont v1 et les phases regroupent les travaux par cadrage/proposition. Une simple file de messages ou un redémarrage global ne satisfait pas 03. Il faut des tâches/tentatives durables, des invalidations ciblées et un arbitrage transactionnel.
4. **Séparer temps actif, pause et coût.** Le compteur actuel suit les intervalles d'appels. Une pause produit requiert un contrat propre ; des appels déjà envoyés peuvent encore coûter pendant cette pause.
5. **Éviter le mélange de versions.** Chaque réutilisation d'un travail indépendant doit démontrer la compatibilité de ses dépendances, sans réécrire sa provenance. Les avis finaux restent liés à une proposition actuelle unique.
6. **Intégrer documentation et tests à chaque PR.** La dérive observée montre que des chemins de preuves existants et des tests verts ne suffisent pas à certifier une phrase marketing. Toute évolution live doit mettre à jour README, guides, claims, confidentialité et plan d'acceptation concernés.

## Suite recommandée

Appliquer les corrections auditées, terminer la campagne réelle 02 avec les autorisations nécessaires, puis suivre [les 10 PR de participation humaine](../boardroom-plans/03-PLAN-IMPLEMENTATION-EN-10-PR.md). La matrice en fin de ce plan attribue chaque critère du document 03 à une PR et à une preuve précise. Aucun développement de 03, aucune fusion, aucune publication de release et aucun appel fournisseur réel ne sont effectués par le présent audit.
