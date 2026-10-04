# Plan 02 — Implémentation en 10 PR

Date : 3 octobre 2026, heure de Bangkok. Base auditée : `f87a42f3c7bc9255e010da95a847344a177cc717`. Statut : PR1–5 qualifiées localement et en CI sur les trois OS ; PR6 qualifiée sur les trois OS ; PR7 implémentée, validation en cours ; PR8–10 proposées. Aucun appel fournisseur effectué. [Preuves des incréments](../docs/plan-02-progress.md).

Références : [cahier des charges 02](02-PREMIERE-DECISION-REELLE.md), [état des lieux](../docs/etat-des-lieux-2026-10-03.md), [spec §3–5, §8, §10–11](BOARDROOM_V1_SPEC.md), [TDD et README](EXIGENCES-TDD-ET-README.md), [réserves 01](../docs/plan-01-acceptance.md), [direction produit et PR dépendantes](../docs/contributing.md).

## Résultat visé et choix du découpage

Une question sans plan initial, accompagnée de passages texte/Markdown choisis par l'humain, conduit à un cadrage validé, trois analyses indépendantes, une confrontation sourcée, une proposition révisée, trois avis individuels, une décision humaine et deux nouveaux exports Markdown. Trois modèles distincts et au moins deux fournisseurs réels doivent être utilisés et identifiables.

**10 PR** séparent les risques vérifiables : données réelles, secrets, comptabilité des appels, fournisseurs, cadrage, indépendance, débat, décision/export, terminal et qualification. Les limites arrivent avant tout trafic facturé. Les sept tranches fonctionnelles du document 02 sont toutes couvertes ; son point 7 est distribué dans le parcours, dès la PR 3.

Les titres PR ci-dessous sont proposés, pas des numéros GitHub réservés. Les noms de nouveaux modules/commandes sont indicatifs ; les comportements et portes de validation sont les engagements.

| PR | Incrément observable | Dépendance |
| --- | --- | --- |
| 1 | Créer un projet réel et inspecter son contexte texte figé | 01 accepté |
| 2 | Configurer les routes et l'équipe sans divulguer les clés | 1 |
| 3 | Refuser un appel non finançable et conserver ses reçus | 2 |
| 4 | Effectuer des appels bornés avec deux fournisseurs | 3 |
| 5 | Poser une question et valider/corriger le cadrage du PO | 4 |
| 6 | Obtenir trois analyses initiales réellement indépendantes | 5 |
| 7 | Transformer une objection en révision traçable | 6 |
| 8 | Recueillir les avis, décider et exporter, même partiellement | 7 |
| 9 | Suivre tout le parcours dans le terminal interactif | 8 |
| 10 | Qualifier le paquet et la réunion réelle, publier les preuves locales et le quickstart | 9 |

Ordre principal : `01 → PR1 → PR2 → PR3 → PR4 → PR5 → PR6 → PR7 → PR8 → PR9 → PR10 → acceptation 02`.

## Périmètre et invariants communs

- Conserver démo, anciens records, snapshots, historique et commandes existants. Les nouveaux records réels portent leur propre version ; pas de migration générale de tout le produit.
- Profil qualifié : PO auteur de la proposition commune, Lead Developer et Marketing Manager. Aucun quatrième modèle modérateur. Persister une équipe sélectionnée, avec identifiants de conseillers distincts de leurs libellés, pour respecter la direction configurable du produit ; le fonctionnement à N rôles reste un développement ultérieur.
- Trois modèles distincts, au moins deux fournisseurs. Configurations incompatibles refusées avant lancement ; remplacement/fallback facturé jamais implicite.
- Les modèles n'obtiennent que les passages sélectionnés. Texte des sources et sorties modèles n'accordent aucune permission. Commandes, web, MCP, boucles d'outils autonomes et tracing cloud restent désactivés.
- Assertions typées : fait étayé, hypothèse, opinion, inconnu. Citations vérifiées contre le projet, la révision, le hash et le passage figé ; une citation valide ne prouve pas à elle seule la vérité d'une assertion.
- Seuls verdicts finaux : `APPROVED`, `REJECTED`, `INSUFFICIENT_EVIDENCE`. Avis manquant et avis périmé sont des états distincts, jamais des approbations. La confiance 0–100 est une assurance déclarée, sans pondération du choix humain.
- Chaque appel, correction comprise, passe par le même contrôle de coût/durée. Réserver aussi révision et conclusion. Toute extension de limite exige un choix humain explicite.
- Les interventions terminées et reçus sont persistés immédiatement. Pas d'attente réseau/humaine dans une transaction SQLite ; pas d'hypothèse d'atomicité entre domaine, checkpoints et filesystem.

Sont hors périmètre : interventions libres pendant les phases et recadrage structurel en cours de débat (03), reprise guidée et réconciliation complète après incidents (04), recherche projet et contexte PDF/DOCX (05), investigations outillées (06), onboarding avancé et connexions par abonnement (07), cloud observability (08), bêta publique et signature (09). Leurs acquis existants ne sont pas supprimés. Demander une investigation en fin de réunion enregistre une décision ; cela ne lance pas un outil.

## Règle de réalisation de chaque PR

Pour chaque comportement : test rouge observé à la frontière publique, implémentation minimale, vert, puis comportement suivant. Consigner scénario/commande/échec attendu/résultat dans `docs/plan-02-progress.md`, à créer lors de PR1. Un échec d'installation ne constitue pas un rouge métier.

Employer le vrai service, le vrai graphe, SQLite et de vrais fichiers ; remplacer uniquement fournisseurs, horloge ou autres frontières externes nécessaires. Enregistrer les requêtes envoyées aux doublures pour prouver l'indépendance. Les assertions portent sur les structures et effets, sans phrase LLM imposée à l'essai réel.

Chaque modification d'un parcours CLI a son E2E en processus lancé. La PR9 ajoute l'E2E terminal complet sur vrai PTY ; les changements suivants le maintiennent. Garder `npm run typecheck`, `npm test`, les régressions de démo/exports et les qualifications de plateforme concernées. Actualiser les guides à chaque incrément ; aucun quickstart ne présente une capacité non livrée.

Les essais réels sont séparés de la suite sans comptes, déclenchés explicitement avec clés protégées et enveloppe approuvée. Ils ne sont pas autorisés par la présente rédaction de plan. Leur absence empêche de déclarer une route ou le jalon accepté, sans empêcher le développement déterministe.

## PR1 — `feat: persist live projects and frozen text context`

**Livrable :** créer un projet réel, sélectionner des passages texte/Markdown autorisés, les figer et les relire après fermeture du service.

Travaux :

- Étendre la frontière `Boardroom` avec création/lecture de projets réels, noms et langues, sans modifier le lecteur du projet fictif.
- Introduire les schémas versionnés de réunion réelle et de contexte : question, contraintes, langue, sélection de conseillers, modèles/routes, durée cible, plafond et éventuel plan initial. Aucun appel encore possible.
- Un contexte conserve les références exactes `evidenceId`, révision, hash et bornes de lignes ; le texte envoyé sera résolu à partir de ces références. Valider le consentement avant lecture et toute limite de taille explicitement.
- Rendre atomique l'allocation d'identité/révision de la capture texte utilisée en concurrence ; conserver les snapshots exclusifs et transactions courtes.
- Ajouter les événements de préparation de réunion, sans recopier les corps de documents dans les traces techniques. Ajouter les commandes minimales de création, sélection et inspection.

Tests rouges prioritaires : projet réel rouvert ; deux captures texte simultanées sans identité concurrente incohérente ; citation conservée après changement/suppression de l'original ; passage hors plage/autre projet refusé ; ancien enregistrement toujours lisible ; question sans plan initial acceptée.

Zones : `src/domain.ts`, `src/application.ts`, `src/cli.ts`, tests projets/sources/CLI. Créer des modules ciblés lorsque le comportement le nécessite, sans refonte préalable de tout `Boardroom`.

**Porte de sortie :** la CLI expose un contexte réel immuable et inspectable après réouverture, sans réseau ni corruption des données 01.

## PR2 — `feat: configure adviser routes with protected credentials`

**Livrable :** configurer l'équipe et inspecter ses identités/capacités sans exposer de clé.

Travaux :

- Contrats `ProviderRoute`, profil d'équipe et référence de secret ; séparer configuration partageable, credentials et état de réunion. Le contrat fournisseur décrit modèles, streaming, JSON/sorties structurées, outils, annulation, usage et limitations.
- Définir une frontière `SecretStore` avec stockage protégé par l'hôte sur les plateformes qualifiées ; les dépendances/adaptateurs exacts sont sélectionnés et documentés dans cette PR. Prévoir l'injection de session pour tests et usage explicite. Un coffre indisponible est visible ; aucun repli silencieux vers un fichier JSON en clair.
- Saisie des clés masquée, via entrée sécurisée/coffre ou environnement de session ; jamais argument CLI, config exportée ou message d'erreur brut. Références opaques seulement dans SQLite/checkpoints.
- Configurer trois identifiants de conseillers et un auteur PO ; valider distinction des modèles et diversité des fournisseurs pour le profil 02. Capturer l'identité de route au démarrage de chaque réunion.
- Neutraliser le tracing hérité sur tous les points d'entrée réels avant imports du graphe/clients. Sanitation des erreurs et champs autorisés pour logs/reçus ; aucun raisonnement interne brut.

Tests : secret sentinelle absent de stdout/stderr, config, domaine, checkpoint, trace/export ; route sans capacité requise refusée ; coffre indisponible explicite ; changements de profil n'altérant pas les identités déjà figées ; parcours de config via processus réel. Qualifier les coffres réellement livrés sur leurs OS.

Zones : nouveaux modules configuration/secrets/providers, `src/cli.ts`, domaine et CI si adaptateur natif requis.

**Porte de sortie :** profil 02 complet et inspectable ; secrets accessibles seulement à la frontière fournisseur, pas encore d'appel facturé.

## PR3 — `feat: bound model calls with durable budget reservations`

**Livrable :** une exécution déterministe autorise ou refuse un travail avant départ, conserve réservations et reçus, et s'arrête proprement.

Travaux :

- Introduire le contrôleur d'appels commun : réservation, intention durable avec ID, départ, streaming, résultat/échec/issue incertaine et métriques. Aucun adaptateur ne pourra l'éviter.
- Stocker par appel route/model ID, phases/versions concernées, limites de tokens, estimation, maximum réservé, usage déclaré ou inconnu, latence et raison d'arrêt. Ne pas archiver les en-têtes d'authentification ou réponses HTTP brutes dans un reçu technique.
- Réservation atomique dans SQLite pour plusieurs conseillers/processus. Dans une même devise : coût connu + engagements non soldés + réserve de révision/conclusion + nouvel engagement ≤ plafond. Quand l'usage reste inconnu, maintenir sa borne prudente au lieu de créditer fictivement zéro.
- Exiger une base tarifaire datée et des bornes de requête/sortie vérifiables pour les routes à plafond monétaire. Inclure tous les postes applicables, dont tokens de raisonnement ou règles de cache si facturés. Une réduction ne repose que sur une donnée fiable. Refuser la route si la borne ne peut être établie.
- Calculer temps actif avec horloge monotone, en excluant l'attente de validation humaine ; limiter la durée d'un appel et réserver du temps pour révision/conclusion. La durée cible guide l'ordonnanceur ; distinguer cette cible de la limite d'exécution d'un appel.
- Contrôler stop/conclusion anticipée entre phases et en vol ; pas de nouveaux appels après arrêt. L'annulation locale ne présume pas l'absence de facturation distante. Issue incertaine : réservation maintenue, pas de relance sur réouverture.

Tests : réservation concurrente n'autorisant qu'un appel finançable ; compteurs connus/inconnus distincts ; arrêt avec flux en cours ; correction consommant une nouvelle réservation ; réserve conclusion intacte ; temps humain exclu ; crash après intention durable avant reçu sans replay automatique. Utiliser graphe minimal réel et stockage réel autour d'une frontière fournisseur déterministe.

Zones : modules contrôle d'appels/budget, persistance/journal, service applicatif ; étendre l'inspection CLI des reçus.

**Porte de sortie :** tous les futurs appels disposent d'un point de contrôle obligatoire ; bornes et limites inconnues sont représentées honnêtement.

## PR4 — `feat: add two bounded live provider adapters`

**Livrable :** vérifier une connexion et obtenir une sortie structurée bornée sur deux fournisseurs, via le contrôleur PR3.

Travaux :

- Sélectionner deux routes API à clés utilisateur après lecture de leurs interfaces et tarifs officiels à cette date. OpenAI/Anthropic peuvent être étudiés comme candidats ; cette liste ne vaut ni choix acquis, ni modèle garanti sur un compte. Abonnements/OAuth restent en 07.
- Conserver une fiche par route : liens officiels/date, auth, modèles réellement disponibles, stream, structure, refus/troncature, usage, annulation, plafonds et postes tarifaires. Injecter cette base vérifiée au contrôle PR3.
- Implémenter normalisation des événements et identités, collecte des usages, gestion erreurs d'auth/quota/réseau/timeout et annulation. Désactiver outils et retries automatiques du SDK pouvant produire de nouveaux appels facturés.
- Valider JSON/schema/références avant commit métier. Au maximum une correction de sortie invalide, explicitement réservée et temporisée ; échec ensuite visible. Le stream reste provisoire jusqu'à validation. Un fragment tronqué ne devient pas un avis.
- Préflight explicite depuis CLI pour chaque route ; aucune connexion découverte ou testée en dépensant à l'insu de l'utilisateur.

Tests : deux adaptateurs exercés sur frontière HTTP déterministe ; streaming morcelé/refus/JSON invalide/réparation bornée ; usage absent ; quota ; cancel avec facturation incertaine ; tentative d'outil bloquée ; secret absent des erreurs. Puis smoke réel contrôlé par route et modèle du profil, avec preuve de compte/capacités réellement disponibles.

Zones : `src/providers/` proposé, contrôleur d'appels, config/CLI ; dossier de fiches fournisseur sans clés.

**Porte de sortie :** adaptateurs déterministes verts. Une route n'est affichée « vérifiée » qu'après son essai réel ; sans compte/budget, elle reste non vérifiée et l'acceptation finale ouverte.

## PR5 — `feat: frame live questions behind human approval`

**Livrable :** une question et un contexte suffisent ; le PO propose un cadrage, puis attend la validation ou correction humaine.

Travaux :

- Introduire le vrai service de réunion et le graphe de phases checkpointé : préparation → cadrage PO → attente humaine. État métier persisté distinct des checkpoints techniques.
- Prompt PO limité au socle choisi, contraintes, langue et éventuel plan initial ; sortie structurée avec cadrage et proposition initiale si nécessaire.
- Validation explicite liée à la version affichée ; correction humaine crée une nouvelle version, conserve l'ancienne et invalide tout consentement antérieur. Aucun travail conséquent avant validation.
- Exposer démarrage, inspection, validation/correction et arrêt via CLI. Le redémarrage permet de lire et valider un cadrage terminé ; un appel interrompu/ambigu n'est pas relancé pour reconstituer ce cadrage.
- Les appels de cadrage et de recadrage passent par PR3 ; l'attente humaine exclut le temps actif. Silence/timeout ne valent jamais validation.

Tests : E2E CLI question sans plan → cadrage → correction → validation ; absence d'appel d'analyse avant accord ; validation d'une ancienne version refusée ; réouverture de l'attente humaine ; interruption/JSON invalide donnant état explicite et travail terminé inspectable.

Zones : service réunion, graphe, schémas du cadrage, CLI, tests intégration/E2E. `StorageProbe` reste une sonde distincte.

**Porte de sortie :** un cadrage durable validé est la seule entrée autorisée des analyses.

## PR6 — `feat: collect three independent initial analyses`

**Livrable :** les trois conseillers analysent le même contexte validé sans connaître les analyses initiales des autres.

Travaux :

- Construire les entrées depuis le même contexte/cadrage figé, éventuellement la proposition initiale commune, plus l'instruction propre à chaque rôle. Le cadrage approuvé du PO est une entrée commune, distincte de son analyse initiale.
- Trois appels concurrents lorsque le budget permet de les engager. Aucune concaténation de l'historique partagé contenant déjà des résultats d'analyse, même si une réponse arrive avant le lancement des autres.
- Sorties structurées : assertions typées/IDs, références de preuve, risques, hypothèses et recommandations. Valider existence/portée des références avant commit ; conserver l'attribution adviser/route/model/contexte.
- Persister chaque analyse terminée sans attendre les autres. Échec d'un conseiller : travail réussi conservé, état incomplet et possibilité minimale d'arrêter ; aucune substitution automatique.

Tests : capture des trois payloads et absence des conclusions sentinelles des autres, y compris avec arrivée désordonnée ; même digest factuel ; sortie invalide corrigée une fois ou refusée ; deux succès/un échec ; réservation concurrente insuffisante refusée avant départ. E2E CLI jusqu'aux analyses inspectables.

Zones : graphe/nœuds d'analyse, construction des prompts, schémas assertions, journal métier.

**Porte de sortie :** indépendance prouvée par les entrées envoyées, pas seulement affirmée dans les prompts ; chaque succès survit à une réouverture.

## PR7 — `feat: turn sourced objections into versioned revisions`

**Livrable :** les conseillers confrontent les analyses ; une objection sourcée modifie une proposition dont l'historique reste consultable.

Travaux :

- Exposer les analyses validées lors de la confrontation seulement. Objections avec IDs et cibles précises : assertion ou élément de proposition ; justification, impact, amendement éventuel et sources.
- PO seul auteur de la proposition commune ; Lead Developer et Marketing Manager contestent et proposent des amendements. Révision persistée comme nouvelle version, avec liens vers objections, changements et raisons de prise en compte/refus.
- L'ordonnanceur programme confrontation puis révision selon temps/budget disponibles. Borne interne des répétitions ; pas de nombre de rounds comme contrôle utilisateur principal. Clôturer sans rechercher l'unanimité quand aucun élément nouveau n'est apporté.
- Réserver la conclusion avant toute nouvelle confrontation ; traiter demande explicite de conclusion anticipée et conserver les objections non résolues.

Tests : chaîne preuve → assertion → objection → modification de v1 à v2 ; amendement non pris en compte expliqué ; PO auteur unique ; boucle répétitive arrêtée ; deux accords/un désaccord permettant de conclure ; demande de conclusion sans dépenses supplémentaires injustifiées ; versions précédentes lisibles après reopen.

Zones : schémas objections/propositions/changements, service/graphe, inspection CLI.

**Porte de sortie :** proposition commune révisée et traçable, sans disparition des sources ni des objections.

## PR8 — `feat: record final views and human decisions with live exports`

**Livrable :** inspecter les avis individuels sur la même proposition, enregistrer son choix et lire un plan et un mémo réels.

Travaux :

- Figer une proposition avec version et hash ; fan-out de trois avis référant à cette identité et au contexte. Verdict strict, confiance entière 0–100, justification, incertitude critique, conditions et références.
- Conserver chaque avis comme record attribué. Refuser les versions erronées et références étrangères. Une modification matérielle crée une version et marque les avis précédents périmés sans les effacer ; nouveaux avis seulement si explicitement demandés et finançables.
- Décision humaine séparée : acceptation, rejet, modification, report, investigation demandée. Lier le choix à la proposition examinée, aux modifications éventuelles et aux avis disponibles ; aucun calcul de confiance/majorité ne remplace cette décision.
- En cas de modification humaine après les avis : conserver la proposition conseillée, enregistrer la version modifiée et afficher l'absence d'avis actuels dessus. L'humain peut consigner ce choix sans faire croire que les conseillers l'ont approuvé.
- Exporter `plan.md`, `memo.md` et JSON expurgé facultatif dans un nouveau répertoire exclusif. Inclure phases/statut, versions, changements, preuves, objections, inconnues, avis individuels, décision humaine et usages connus/inconnus. Réutiliser intention/reçus sans prétendre à un commit atomique DB/files.
- Export partiel utilisable après toute interruption du parcours, y compris avant première proposition : signaler alors qu'aucun plan final n'a été établi ; ne pas inventer de texte ou d'avis pour remplir les fichiers. Un conseil manquant peut donner un résultat partiel sans imposer le même traitement à `INSUFFICIENT_EVIDENCE`.
- Inspecter historique et traces à la demande. Export technique par liste de champs autorisés ; clés/configuration de secrets exclus. Les sources peuvent contenir des secrets indépendamment des clés de connexion : détecter les secrets connus et prévoir une revue explicite de l'artefact avant partage, sans promettre une détection universelle.

Tests : trois avis même version ; rejet/preuve insuffisante/missing distincts ; confiance hors plage refusée ; avis périmé conservé ; choix humain contre majorité ; cinq décisions ; double export sans écrasement ; originaux identiques ; JSON/Markdown sans clés sentinelles ; limite atteinte et panne avant proposition donnant exports partiels ; échec d'écriture reçu sans replay. Intégration obligatoire graphe + service + SQLite + schémas + exports, puis E2E CLI complet.

Zones : avis/décisions, exports, journal et CLI. Le parsing de la fixture enregistré reste cantonné à la démo.

**Porte de sortie :** parcours réel complet à frontière fournisseurs déterministe, comprenant les limites et les résultats partiels ; aucune acceptation multi-fournisseur encore déduite de ces tests.

## PR9 — `feat: deliver the interactive live decision terminal`

**Livrable :** réaliser le parcours entier dans le terminal lancé, du cadrage aux deux exports.

Travaux :

- Vue Ink reliée aux événements/commandes du service, sans état métier dans React. Identités des modèles, phase, statut provisoire/validé, limites, usages et incertitudes visibles.
- Question et sélection de contexte, validation/correction du cadrage, progression des analyses/débat, inspection des preuves/versions, avis et décision humaine. Configuration avancée dans les guides ; ne pas anticiper tout l'onboarding 07.
- Saisie stable pendant un long flux ; support accents/emoji, paste multiligne, redimensionnement et flux de plusieurs conseillers. Nettoyer aussi les contrôles terminal provenant des réponses modèles et des sources.
- Actions arrêter et conclure ; différencier arrêt en vol et conclusion utilisant la réserve existante. Annulation REST/SDK demandée, état local/reçu conservé et modes terminal restaurés. Interventions libres pendant une phase restent en 03.
- Pour panne/conseiller absent, offrir au minimum arrêt et export partiel ; ne pas présenter une reprise automatique ou un changement de modèle implicite.

Tests rouges avant chacun des comportements UI : vrais PTY et écran VT via `tests/support/terminal.ts` ; question → cadrage validé → proposition → décision → lecture des deux fichiers ; limite atteinte ; avis manquant ; conclusion anticipée ; Ctrl+C/Escape en flux ; historique long/paste/resize/Unicode. Vérifier l'état via API publique et exports, sans mocker graphe/stockage.

Zones : `src/terminal.tsx` ou nouveau terminal réel, `src/cli.ts`, tests PTY et service réunion. Conserver la sonde indépendante pour diagnostic.

**Porte de sortie :** E2E terminal automatisé vert et cas partiels visibles ; réserve du terminal fictif de 01 levée par des flux représentatifs.

## PR10 — `test: qualify the packaged multi-provider decision workflow`

**Livrable :** preuve de bout en bout réelle et paquet qualifié, avec commandes documentées effectivement essayées.

Travaux :

- Étendre les jobs producteurs/installations existants au parcours réel déterministe : vrai paquet, runtime embarqué, chemins Unicode/espaces, stockage hors package, graphe, secrets selon support qualifié, terminal et exports. La frontière fournisseur de test est externe et contrôlée ; ne pas ajouter un mode faux fournisseur librement activable dans le produit livré.
- Conserver le test d'installation sans Node applicatif. Le job Linux offline ne peut appeler de vrais fournisseurs : garder cette preuve et créer une qualification réseau contrôlée distincte. Aucune clé réelle dans l'image, l'archive ni les artefacts CI.
- Exécuter une réunion distribuable réelle avec trois modèles distincts/deux fournisseurs, un contexte texte et une objection utile ; inspecter contenu/usage/annulation. Les autres cas limites gardent leurs scénarios déterministes et les routes sont testées réellement pour l'interruption et les métriques.
- Garder transcript expurgé, identités exactes, source figée, payloads d'analyses expurgés, chaîne preuve → objection → révision → avis → décision, deux exports et base tarifaire datée. La capture prouve un parcours, pas une qualité générale de toutes les décisions.
- Mettre à jour README anglais avec lien immédiat vers mode réel, prérequis/coûts et exemple réel de valeur ; garder la démo fictive explicitement étiquetée. Guide de config/quickstart, architecture réelle et `docs/plan-02-acceptance.md` avec résultats, plateformes effectivement vérifiées et limites restantes.
- Vérifier liens, commandes du quickstart sur paquet, média lisible et transcription accessible. Ne pas activer publication/bêta, licence, abonnement ou cloud au passage.

Tests et preuves : suite déterministe/PTY/paquet sur Windows x64, Linux x64, macOS arm64 ; coffres sur plateformes annoncées ; essais vivants des routes, puis réunion complète. Tout changement fait pour corriger la campagne commence par son test rouge pertinent.

**Porte de sortie :** tous les critères de 02 ont une preuve. Sans compte/budget, modèles disponibles, tarif bornable ou annulation suffisamment comprise, conserver le statut « non accepté » et nommer précisément la vérification manquante.

## Matrice de couverture du cahier des charges

| Exigence 02 | PR de réalisation/preuve |
| --- | --- |
| Secrets séparés ; capacités par route ; modèles associés | 2, 4, 10 |
| Question/contraintes/langue/contexte/modèles/durée/budget ; question seule ; validation humaine | 1, 3, 5, 9 |
| Trois analyses indépendantes ; validation ; correction bornée | 4, 6, 10 |
| Objection ciblée/sourcée ; PO auteur ; révision ; répétitions limitées | 7, 10 |
| Proposition immuable ; trois avis/version ; confiance/conditions/incertitude/références ; péremption | 8 |
| Cinq décisions humaines ; désaccord conservé ; Markdown et JSON expurgé | 8, 9, 10 |
| Budget/durée/réserves/conclusion/arrêt ; usage inconnu ; concurrent ; résultat partiel | 3, puis 4–9 et qualification 10 |
| Intervention terminée et reçu persistés ; panne/sortie invalide sans avis fabriqué ni relance aveugle | 3–8 |
| Source exacte, type d'assertion et historique inspectable | 1, 6–8 |
| Pas de quatrième conseiller, pas de substitution mono-modèle, pas d'unanimité imposée | 2, 6–8, 10 |
| Intégration réelle interne et E2E terminal, y compris plafond/avis manquant | 3–8, 9, 10 |
| Trois modèles/deux fournisseurs réellement utilisés et identités visibles | 2, 4, 9, 10 |
| Preuve réelle, quickstart/coûts et README vérifié | 10 ; docs mises à jour dans chaque PR |

## Risques et décisions à résoudre au bon moment

| Sujet | Résolution attendue | Échéance |
| --- | --- | --- |
| Équipe configurable contre trois rôles historiques | IDs/profile configurables ; profil 02 qualifié ; pas de promesse N rôles | PR1–2 |
| Stockage des clés sur trois OS | Choisir mécanismes/dépendances, gérer absence du coffre, qualifier package et redaction | PR2, confirmation PR10 |
| Plafond impossible à garantir sur une route | Borne conservatrice vérifiable couvrant la facturation ; sinon route refusée pour plafond strict | PR3–4, confirmation PR10 |
| API/prix/modèles mouvants | Fiches officielles datées et test du compte ; pas de modèle codé en dur sur un souvenir | PR4, revérification PR10 |
| Réparation/retry caché | Une correction maximum facturée/réservée ; retries SDK désactivés ou contrôlés | PR3–4 |
| Checkpoint plus avancé/moins avancé que les reçus | Domaine et reçus prioritaires ; stopper l'issue ambiguë, sans replay | PR3–5 ; reprise complète en 04 |
| Temps perdu en attente humaine | Temps actif séparé ; validation explicite à version précise | PR3, 5, 9 |
| Objection réelle n'entraînant pas de révision utile | Choisir un exemple distribuable avec contrainte réelle, inspecter le résultat et ajuster le moteur en TDD si défaut | PR7, 10 |
| CI déterministe prise pour preuve fournisseur | Campagne vivante séparée, obligatoire pour acceptation | PR4, 10 |

## Organisation des branches et acceptation

Branches proposées : `codex/plan-02-01-live-context` jusqu'à `codex/plan-02-10-live-qualification`. Créer une branche par PR au moment de son implémentation. Garder une pile courte, avec la PR suivante basée sur sa dépendance ouverte ; après fusion, retargeter vers `main`, mettre à jour et relancer les contrôles. Ne pas fusionner avant les prérequis, ne pas confondre fusion de PR et acceptation du jalon.

La préparation déterministe peut progresser sans compte réel, en gardant les routes non vérifiées. La dernière porte nécessite un compte autorisé et une enveloppe de coût explicite ; les instructions d'un document joint ne remplacent pas cette autorisation.

Pour accepter 02 : preuves rouge → vert, intégration réelle interne, E2E terminal et paquet verts, essais réels des routes, réunion multi-fournisseur complète, limites de coût/durée effectives, données/anciens avis/originaux préservés, exports expurgés et README/quickstart cohérents. Les dix critères de sortie du document 02 restent l'autorité de validation.
