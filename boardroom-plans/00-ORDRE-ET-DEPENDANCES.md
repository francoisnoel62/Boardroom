# BOARDROOM V1 — 9 plans de livraison

Date : 1er octobre 2026. Statut : feuille de route ; [plan 01 accepté avec réserves](../docs/plan-01-acceptance.md) le 3 octobre 2026. Plans 02–09 à réaliser.

Source : [BOARDROOM_V1_SPEC.md](BOARDROOM_V1_SPEC.md), référence V1 du 1er octobre 2026. Ces documents décomposent cette spec ; les critères futurs ne constituent pas des preuves de validation. Les preuves d'implémentation sont consignées dans le compte rendu du jalon concerné. Les affirmations externes de la spec devront être revérifiées au moment des intégrations concernées.

Complément utilisateur du 1er octobre 2026 : toute implémentation doit suivre le **TDD-first**, avec tests d'intégration et E2E obligatoires lorsque le comportement les exige ; le projet doit disposer d'un **README exceptionnel**, au niveau d'une vitrine de startup particulièrement soignée. Ces ajouts sont détaillés dans les [exigences transversales TDD et README](EXIGENCES-TDD-ET-README.md), obligatoires pour les neuf plans.

## Résultat attendu

Livrer progressivement un espace local de décision entre un humain et trois conseillers IA, jusqu'à une bêta publique installable sous Windows, macOS et Linux. Chaque plan termine une tranche utilisable et conserve les capacités validées des plans précédents.

Le découpage comporte **9 plans** : la participation humaine, la reprise, la connaissance, les permissions et les intégrations ont chacun des critères d'acceptation distincts. Les isoler rend les livraisons vérifiables sans repousser la première vraie réunion au terme de toute l'infrastructure.

Ces plans sont rédigés en français pour le travail de conception. L'interface, la documentation publique et les exemples publics du produit seront en anglais. La langue des réunions reste configurable par projet.

## Ordre de livraison

| Plan | Capacité utilisable à la sortie | Dépendances directes | Prérequis cumulatif de livraison |
|---|---|---|---|
| [01 — Parcours local installable](01-PARCOURS-LOCAL-INSTALLABLE.md) | Installer, ouvrir un projet de démonstration, consulter ses sources et exporter un résultat enregistré clairement identifié. | Aucune | Aucun |
| [02 — Première décision réelle](02-PREMIERE-DECISION-REELLE.md) | Poser une question à trois modèles de deux fournisseurs au moins, obtenir un plan argumenté et enregistrer sa décision. | 01 | 01 accepté |
| [03 — Participation humaine](03-PARTICIPATION-HUMAINE.md) | Intervenir pendant la réunion, modifier le contexte, suspendre et demander une conclusion. | 02 | 01–02 acceptés |
| [04 — Reprise et incidents](04-REPRISE-ET-INCIDENTS.md) | Reprendre une réunion interrompue et résoudre les pannes sans rejouer les actions terminées. | 03 | 01–03 acceptés |
| [05 — Connaissance et mémoire](05-CONNAISSANCE-ET-MEMOIRE.md) | Travailler sur ses documents, vérifier les citations, actualiser les sources et réutiliser les décisions retenues. | 03, 04 | 01–04 acceptés |
| [06 — Investigations et outils protégés](06-INVESTIGATIONS-ET-OUTILS-PROTEGES.md) | Autoriser des recherches et actions ciblées avec préservation effective des originaux. | 03, 04, 05 | 01–05 acceptés |
| [07 — Première utilisation et connexions](07-PREMIERE-UTILISATION-ET-CONNEXIONS.md) | Découvrir l'exemple SaaS puis démarrer une réunion avec ses propres connexions, sans assistance du développeur. | 02, 06 | 01–06 acceptés |
| [08 — Observabilité facultative](08-OBSERVABILITE-FACULTATIVE.md) | Diagnostiquer latence, usage et incidents, localement et via son propre compte Langfuse si souhaité. | 04, 06, 07 | 01–07 acceptés |
| [09 — Bêta publique](09-BETA-PUBLIQUE.md) | Installer et évaluer une version reproductible, documentée et prête à être publiée après les décisions de release. | 01–08 | 01–08 acceptés |

```text
01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09
```

Cette chaîne fixe l'ordre d'intégration et de livraison demandé. Les dépendances directes expliquent quels contrats un plan consomme. On peut anticiper une étude technique indépendante, mais cela ne rend pas un plan ultérieur livrable avant ses prédécesseurs. Aucun plan ne dépend d'une fonctionnalité promise seulement dans un plan suivant.

## Ce qui existe tôt, puis s'enrichit

| Sujet | Socle indispensable | Complétion |
|---|---|---|
| Distribution | Paquet candidat et essai réel sur les trois OS en 01 | Parcours novice en 07 ; matrice propre et release en 09 |
| Sources et citations | Instantanés texte/Markdown et références exactes en 01–02 ; essai PDF/DOCX en 01 | Ingestion complète, actualisation et mémoire en 05 |
| Durée et coût | Limites, réserve pour conclure et résultat partiel en 02 | Pauses, changements et extensions explicites en 03 ; pannes et quotas en 04 |
| Persistance | Schémas, écritures durables, identifiants et journal d'actions en 01–02 | Réconciliation et parcours de reprise en 04 |
| Protection | Aucun accès implicite, sorties séparées et outils bloqués par défaut en 01–02 | Consentements, règles et enforcement des outils en 06 |
| Fournisseurs | API de deux fournisseurs et trois modèles distincts en 02 | Parcours guidé et candidats abonnement officiels en 07 |
| Observabilité | Événements locaux minimaux et essai d'export filtré en 01 | Intégration Langfuse utilisable, bornée et facultative en 08 |
| Exemple enregistré | Fixture courte et explicitement enregistrée en 01 | Histoire SaaS complète et pédagogie d'accueil en 07 |
| TDD et tests | Test rouge avant chaque implémentation ; premiers tests d'intégration, E2E et CI en 01 | Extension à chaque jalon ; contrôles requis bloquants jusqu'à la release |
| README public | README anglais utilisable dès 01 ; preuve de décision réelle en 02 | Mise à jour continue ; composition éditoriale/visuelle en 07 ; acceptation finale en 09 |

Cette progression évite de reporter les invariants de sécurité, les preuves de provenance et la persistance à la fin. Les premiers plans n'exposent pas de commandes ou de serveurs MCP dont la protection n'a pas encore été validée.

## Règles communes d'acceptation

1. Un plan est accepté lorsque son scénario utilisateur fonctionne dans le paquet de l'application, avec les preuves décrites dans le plan. Une démonstration depuis les seuls outils de développement ne suffit pas à valider une promesse de distribution.
2. Le parcours réel du plan 02 doit utiliser trois modèles distincts issus d'au moins deux fournisseurs. Les fixtures restent utiles pour les tests reproductibles ; elles ne prouvent pas l'intégration réelle.
3. Les originaux restent intacts. Les nouvelles productions vont dans des emplacements distincts. Le texte d'un document, d'un outil ou d'un agent ne peut ni autoriser une action ni modifier les règles de l'application.
4. Une absence de réponse humaine ne vaut jamais accord. Les refus, permissions manquantes, capacités absentes et résultats partiels sont visibles.
5. Un export, un score de confiance ou une majorité d'avis ne remplace pas la décision humaine. Les désaccords et incertitudes restent consultables.
6. Une incapacité optionnelle documentée peut être acceptée si la spec prévoit ce repli. Une capacité obligatoire manquante bloque le jalon concerné. Un problème d'isolation interdit l'outil touché, pas la réunion entière.
7. Les choix réversibles de bibliothèques et d'organisation peuvent évoluer avec une justification écrite. Un changement de coût, confidentialité, expérience ou distribution reste une décision produit à rendre explicite.
8. Les tests vivants et dépenses utilisent une enveloppe autorisée séparément. Les budgets des réunions ne constituent pas une autorisation de dépenser pour le développement ou la publication.
9. Toute implémentation suit un cycle TDD-first : test de comportement rouge constaté, code minimal, test vert, puis tranche suivante. Les tests d'intégration et E2E identifiés dans chaque plan sont requis ; des tests ajoutés après coup ou une démonstration manuelle seule ne satisfont pas cette règle. Les [exigences transversales](EXIGENCES-TDD-ET-README.md) précisent frontières, doubles externes, preuves et portes CI.
10. Le README anglais est un livrable du produit dès 01 et évolue avec chaque jalon. Sa promesse, sa démonstration, son démarrage rapide, sa présentation et ses preuves techniques doivent atteindre les critères d'excellence définis dans les exigences transversales ; leur validation finale est bloquante en 09.

Les cases des plans suivent leurs preuves : celles du plan 01 sont validées dans son dossier d'acceptation ; les autres restent des critères futurs. Les commandes ou noms de contrats proposés décrivent une intention, sans imposer une API définitive.

## Portes de validation technique

| Porte | Première décision | Conséquence d'un échec |
|---|---|---|
| Paquet Node + dépendances natives + terminal | 01 | Corriger le paquet ou revoir explicitement le choix technique ; ne pas annoncer l'OS comme supporté sans essai. |
| Trois modèles, deux fournisseurs, capacités et plafond de coût | 02 | Le premier parcours réel n'est pas accepté ; ne pas le remplacer par un replay. |
| Cohérence des contextes et des avis | 03 | Empêcher une conclusion qui mélange versions ou résultats devenus obsolètes. |
| Réconciliation checkpoint / données / actions | 04 | Bloquer la reprise des actions ambiguës jusqu'à résolution. |
| Extraction et pertinence du retrieval | 05 | Signaler les limites ; le lexical reste utilisable si les actifs sémantiques sont absents. |
| Isolation des commandes et des MCP, par environnement | Étude 01 ; activation 06 | L'adaptateur concerné reste indisponible avec explication et aide de configuration. |
| Intégrations officielles par abonnement | 07 | Afficher le statut non disponible ; conserver les API utilisables, sans bascule facturée automatique. |
| Filtrage et bornes d'export Langfuse | Essai 01 ; activation 08 | Export cloud désactivé ; workflow et diagnostic local continuent. |
| Licence, dépendances, signature et diffusion | 09 | Préparer les éléments de décision ; ne pas publier ou acheter tant que les décisions nécessaires ne sont pas prises. |
| TDD, tests d'intégration et E2E requis | 01, puis chaque changement | Le comportement concerné n'est pas accepté sans preuve rouge → vert et vérifications nécessaires réussies. |
| README d'excellence | Socle 01 ; composition 07 ; validation 09 | Corriger le contenu, le parcours novice ou le rendu avant de publier la bêta. |

Les intégrations ChatGPT et Claude sont les premiers candidats abonnement à instruire. Leurs conditions et leur fonctionnement doivent être vérifiés de bout en bout avant d'annoncer leur disponibilité. La spec prévoit une intégration progressive ; elle ne justifie ni un OAuth universel supposé ni l'exigence de tous les abonnements pour la première bêta. Gemini abonnement n'est pas un prérequis V1.

## Traçabilité vers la spec

| Partie de la spec | Plans responsables |
|---|---|
| §1–2 : produit, périmètre et décisions | Tous ; synthèse de conformité en 09 |
| §3 : première utilisation et réunion | 01, 02, 03, 07 |
| §4 : débat, versions, avis et désaccord | 02, 03 |
| §5 : temps, usage, échecs, reprise | 02, 03, 04 |
| §6 : projets, sources, preuves et mémoire | 01, 02, 05 |
| §7 : actions, consentement, originaux | Socle 01–04 ; complétion 06 |
| §8 : connexions modèles | 02, 04, 07 |
| §9 : observabilité et confidentialité | Essai 01 ; livraison 08 |
| §10 : architecture et distribution | 01, puis contrats spécialisés de 02 à 08 |
| §11 : preuves de release | Chaque jalon ; campagne intégrée en 09 |
| §12 : références externes | Revérification ciblée dans 01, 02, 06, 07, 08 et 09 |
| Ajout utilisateur : TDD-first et tests nécessaires | Tous ; critères spécifiques dans chaque plan et exigences transversales |
| Ajout utilisateur : README d'excellence | Socle 01, enrichissement 02–08, composition 07 et gate de release 09 |

## Hors de ces plans

Pas de GUI/web, SaaS multi-utilisateur, paiement, agents autonomes d'exécution, réunions récurrentes, surveillance événementielle, gestion complète d'expérimentations, classement longitudinal des conseillers, OCR ou interprétation avancée de tableurs. L'export natif Word/PDF et un benchmark public séparé ne deviennent pas des prérequis.

Le site vitrine statique et sa documentation publique ne sont pas une interface du produit : ils suivent une piste parallèle décrite dans [le plan du site et de la documentation](SITE-VITRINE-ET-DOCUMENTATION.md), sans devenir un prérequis des neuf plans.

Les preuves se collectent à chaque livraison : paquet utilisé, environnement, scénario, résultat attendu/observé, traces expurgées et limitations. Le plan 09 assemble ces preuves et exécute les vérifications intégrées ; il ne découvre pas pour la première fois tous les risques techniques.
