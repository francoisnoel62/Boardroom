# Site vitrine, téléchargement gratuit et documentation — plan détaillé

Date : 3 octobre 2026. Statut : **phases 0 à 5 réalisées** le 3 octobre 2026, sauf les revues humaines — décisions D1–D5 (Apache-2.0, pas de developer preview avant la bêta, pas de mise en ligne, aucune mesure d'audience) ; fondations et design system ; page d'accueil (capture rejouable, FAQ) ; documentation v1 (référence CLI et JSON générée depuis le code, commandes documentées exécutées en CI, chaque page lisible en Markdown, lien de retour par page) ; chaîne de téléchargement (installeurs testés sur 3 OS, workflow de release en brouillon, `/download` et `/welcome` qui suivent l'état réel des releases) ; pages `/engineering`, `/roadmap`, `/changelog`, `/brand`, `/privacy`, `/security`, `SECURITY.md` et deux Field notes, dans [`site/`](../site/README.md), non déployés. **Restent à mener avec des personnes extérieures** : le test des 30 secondes (sortie de phase 2) et la revue fondateur·rice/recruteur·se (sortie de phase 5), selon le [kit de revue](KIT-REVUE-EXTERNE-SITE.md). Aucune release n'est publiée : la première est prévue avec la bêta (plan 09). Images OG, liens « Open in Claude » et docs versionnées attendent un domaine et une première release. Phase 6 alignée sur le plan 02. [Ordre et dépendances](00-ORDRE-ET-DEPENDANCES.md) · [Exigences transversales TDD et README](EXIGENCES-TDD-ET-README.md) · [Spec V1](BOARDROOM_V1_SPEC.md).

Ce document est une **piste parallèle** aux neuf plans de livraison, pas un dixième jalon. Le site est une vitrine marketing statique et une documentation publique : il ne contredit pas la règle « pas de GUI/web » du produit, qui reste une application terminal locale. Comme le reste du travail de conception, ce plan est rédigé en français ; le site, sa documentation et ses exemples seront **en anglais**.

---

## 0. En une page

**Ambition.** Un site au niveau des meilleurs sites produit tech (Linear, Stripe, Vercel, Raycast) et une documentation au niveau des meilleures références 2026 (Stripe Docs, Tailwind, Supabase, Astro), qui transforme un visiteur en utilisateur en moins de cinq minutes : comprendre → voir la vraie salle → télécharger gratuitement → lancer `boardroom demo`.

**Idée directrice.** Le produit est sobre, local et fondé sur la preuve. Le site doit l'être aussi. Sa force ne viendra pas d'effets spectaculaires mais d'un **moment signature authentique** : la vraie réunion enregistrée, rejouée depuis l'enregistrement VT réel (`docs/media/recorded-example.cast`), synchronisée au défilement avec le récit « cinq intégrations → deux ingénieurs → une intégration → désaccord conservé ».

**Recommandation technique.** Astro 7 + Starlight (documentation) + CSS natif à tokens, site 100 % statique dans un dossier `site/` du même dépôt, recherche Pagefind locale, hébergement avec prévisualisation par PR, binaires distribués par GitHub Releases avec sommes de contrôle et attestations de provenance.

**Trois différenciateurs de niveau « senior » :**

1. **Documentation testée comme du code** : chaque commande publiée est exécutée en CI contre le paquet de release, chaque capture terminal est régénérée par la campagne d'installation sur les trois OS.
2. **Référence générée depuis le produit** : CLI et schémas JSON (Zod → JSON Schema) ne peuvent pas diverger de l'application.
3. **Registre des affirmations** : chaque promesse marketing pointe vers une preuve (test, document d'acceptation, capture) vérifiée en CI. Aucun chiffre, logo ou témoignage inventé.

**Ce qui bloque le bouton « Download » :** la licence du projet et la décision de publier une *developer preview* (voir §14). Tout le reste peut avancer sans attendre.

---

## 1. Point de départ : ce que le site peut promettre aujourd'hui

| Fait vérifié dans le dépôt | Conséquence pour le site |
|---|---|
| Plan 01 accepté avec réserves : exemple enregistré, preuves texte/PDF/DOCX, export, historique, paquets sur Windows x64, Linux x64 et macOS arm64 ([acceptation](../docs/plan-01-acceptance.md)). | On peut montrer et faire télécharger **l'exemple enregistré**. On ne peut pas montrer une réunion vivante : elle arrive au plan 02. |
| Aucune release publique ; les candidates sont des artefacts CI qui peuvent exiger une connexion GitHub ([guide](../docs/getting-started.md)). | Il faut une vraie chaîne de release (§7) avant un bouton de téléchargement grand public. |
| Licence non décidée ; signature et notarisation non réalisées. | Décision D1 bloquante. Les avertissements Gatekeeper/SmartScreen doivent être anticipés dans l'UX (§7.3). |
| Vision clarifiée le 2026-10-03 : une équipe dont la taille, les rôles et les modèles sont choisis par le CEO humain ([contributing](../docs/contributing.md)). Le V1 et l'exemple utilisent trois rôles. | Le site sépare nettement **la vision** (« Build your room ») et **le disponible** (« Available today »). |
| Culture de preuve explicite : pas d'éléments de crédibilité inventés, statut fictif toujours visible ([exigences §5](EXIGENCES-TDD-ET-README.md)). | Chaque section porte un statut honnête ; registre des affirmations (§11.2). |
| Pas de compte ni de backend BOARDROOM ; données locales ; clés modèles fournies par l'utilisateur ([spec §1](BOARDROOM_V1_SPEC.md)). | Site statique, sans pisteur tiers ni cookie ; la confidentialité du site doit être au niveau de celle du produit. |

**Actifs déjà réutilisables :** illustration `docs/media/boardroom-hero.svg` (palette et ton), enregistrement VT réel `recorded-example.cast`, texte accessible `terminal-screen.txt` et `demo-transcript.txt`, fixture `assets/demo/meeting.json`, source fictive `assets/demo/context.md`, exports réels `docs/validation/recorded-export/{plan,memo}.md`, documents d'architecture et d'acceptation, slogans du README.

---

## 2. Objectifs et indicateurs

| Objectif | Indicateur | Cible initiale | Mesure (sans pister l'utilisateur) |
|---|---|---|---|
| Faire comprendre en 30 s | Test éditorial « 30 secondes » de la grille README, appliqué à la home | 4 testeurs sur 5 restituent public, problème, résultat, comment essayer | Tests utilisateurs modérés (5 personnes), répétés à chaque refonte majeure |
| Convertir en téléchargement | Clics Download / visiteurs uniques de la home | ≥ 8 % (référence à recaler après 30 jours) | Événement agrégé, sans cookie |
| Installation réussie | Téléchargements d'actifs de release par OS | Suivi de tendance | `download_count` de l'API GitHub Releases, lu au build |
| Activation | Visites de `/welcome` puis de « First real meeting » | Suivi de tendance | Analytics agrégés |
| Crédibilité recruteur | Parcours Home → Engineering → Evidence | Durée médiane ≥ 2 min sur `/engineering` | Analytics agrégés |
| Qualité | Lighthouse (4 catégories), axe, liens | ≥ 95 partout, 0 violation axe sérieuse, 0 lien cassé | CI bloquante |
| Communauté | Étoiles, *watchers*, issues de qualité | Tendance | API GitHub |

L'application elle-même n'a **aucune télémétrie** et n'en aura pas pour servir le marketing : l'activation se déduit de signaux publics et agrégés uniquement.

---

## 3. Audiences et parcours

| Persona | Ce qu'il cherche | Objection principale | Parcours idéal | Porte d'entrée |
|---|---|---|---|---|
| **Fondateur·rice technique** (cible principale) | Quelqu'un pour challenger sa décision avant d'investir des semaines de code | « Encore un chatbot qui me donnera raison » | Hero → récit de la décision → principes → Download → Quickstart | Home, Show HN, articles |
| **Recruteur·se / hiring manager tech** (cible explicite de la spec) | Évaluer un niveau senior en IA appliquée, vite et par l'usage | « Démo marketing ou vraie ingénierie ? » | Hero → replay → `/engineering` → preuves d'acceptation → installation en 2 commandes | Lien CV/LinkedIn vers `/engineering` |
| **Contributeur·rice open source** | Comprendre l'architecture, la discipline TDD et la feuille de route | « Le projet est-il vivant et bien tenu ? » | Docs Architecture → Roadmap → Contributing → issues | GitHub, docs |
| Dirigeant non technique | Un conseil de direction IA | Terminal = barrière | **Non ciblé en V1** : pas de promesse d'interface graphique | — |

Un **parcours recruteur dédié** est un vrai avantage concurrentiel : `/engineering` raconte en une page les choix (Node embarqué plutôt que Bun, journal durable, reçus d'export, PTY réels en test, campagne d'installation sans Node), avec liens directs vers les preuves.

---

## 4. Positionnement, message et storytelling

### 4.1 Énoncé de positionnement

> Pour les **fondateurs et bâtisseurs techniques** qui prennent seuls des décisions coûteuses à défaire, **BOARDROOM** est **un espace de décision local et open source** où une équipe de conseillers IA que vous composez examine les preuves, conteste votre proposition et vous aide à aboutir à un plan défendable. **Contrairement** à un chatbot qui produit une réponse lisse, BOARDROOM conserve les objections, les preuves manquantes et le désaccord, et **la décision finale reste la vôtre**.

### 4.2 Hiérarchie du message

| Niveau | Message (EN, langue du site) |
|---|---|
| Catégorie | *An open-source decision room for builders.* |
| Promesse | *Great decisions deserve a room.* (existant, à conserver) |
| Sous-promesse | *Assemble AI advisers. Let them challenge your plan with evidence. Leave with a decision you can explain.* |
| Pilier 1 — Le désaccord | *Disagreement earns its place.* Une objection qui résiste reste dans le mémo. |
| Pilier 2 — La preuve | *Evidence stays inspectable.* Chaque argument renvoie à la version exacte de sa source. |
| Pilier 3 — Le jugement | *Human judgment has the final word.* Les avis ne votent pas à votre place. |
| Pilier 4 — Le contrôle | *Your machine. Your models. Your call.* Local, clés personnelles, accès accordés explicitement. |
| Preuves | Capture réelle, export réel, tests 3 OS, documents d'acceptation, code source. |

### 4.3 Cadre narratif

Le récit suit une structure où **l'utilisateur est le héros** et BOARDROOM le guide :

1. **Le héros et son désir** — *You have an idea you can't leave alone.*
2. **Le problème** — externe : la décision arrive avant toute donnée ; interne : *those questions land on the same desk — yours* ; philosophique : une décision importante mérite plus qu'une seule perspective.
3. **Le guide** — empathie (*Before the first line of code, there is a decision.*) et autorité par la preuve, pas par l'adjectif.
4. **Le plan en trois temps** — *Bring the question → Let the room challenge it → Decide with the record.*
5. **L'appel à l'action** — direct : *Download free* ; transitionnel : *Watch the room* (replay).
6. **Ce qui est en jeu** — *Weeks of building the wrong thing.*
7. **La réussite** — *You leave knowing what to build first, what changed, and what still needs to be learned.*

**Fil rouge unique : « Launch Ledger ».** Le même exemple fictif traverse la home, le Quickstart, le README, les images de partage et les articles. Un seul récit mémorable vaut mieux que dix exemples.

### 4.4 Copy deck initial (EN)

| Emplacement | Proposition principale | Variantes à tester |
|---|---|---|
| Eyebrow | *THE MOMENT BEFORE YOU BUILD* | — |
| H1 | *Great decisions deserve a room.* | *Before the first line of code, there is a decision.* |
| Sous-titre | *Bring your toughest question to a team of AI advisers. They examine the evidence, challenge the plan, and keep their objections on the record. You make the call.* | Version courte mobile : *AI advisers that challenge your plan. You make the call.* |
| CTA principal | *Download free* + mention *macOS · Windows · Linux — no account needed* | *Get Boardroom* |
| CTA secondaire | *Watch the room* (lance le replay) | *See a decision change* |
| Section récit | *A launch that found its focus* | — |
| Section confiance | *What stays on your machine* | — |
| Section ingénierie | *Built like infrastructure* | *Engineering you can inspect* |
| CTA final | *Bring the question that matters.* | — |
| Pied de page | *Build something worth believing in.* | — |

### 4.5 Ton et règles éditoriales

- **Ton** : calme, éditorial, précis, confiant sans emphase. Phrases courtes. On montre, on ne vante pas.
- **À proscrire** : *revolutionary, 10x, autonomous, AI-powered everything, unlimited, guaranteed, best-in-class*, ainsi que tout chiffre non sourcé.
- **Statuts obligatoires** sur toute capacité : `Available` · `Preview` · `Planned — Plan 0X` · `Vision` (direction produit qu'aucun plan ne porte encore, comme l'équipe configurable). Une capacité future n'est jamais rédigée au présent.
- **Fiction toujours étiquetée** : *Recorded example — scripted fictional fixture* reste visible près de chaque extrait.
- **Gratuité honnête** : *Boardroom is free and open source (Apache-2.0), with no account, subscription or payment. Live meetings use your own model provider keys; providers bill you directly.*
- Relecture automatisée par Vale (§11) avec un vocabulaire maison.

---

## 5. Architecture de l'information

```text
/                       Home — le récit et le moment signature
/download               Téléchargement gratuit, détection d'OS, vérification
/welcome                Page post-téléchargement : 3 premières commandes, dépannage
/engineering            Parcours recruteur : choix, compromis, preuves
/roadmap                Les 9 plans, statuts réels, prochaine étape
/changelog              Généré depuis GitHub Releases
/field-notes            Articles d'ingénierie (blog)
/brand                  Kit presse : logo, palette, captures réelles, descriptions
/privacy  /security     Confidentialité du site et modèle de sécurité du produit
/docs/…                 Documentation (détail en §8)
/llms.txt, /llms-full.txt, /docs/**/*.md   Versions lisibles par les agents IA
```

**Navigation principale :** Product · Docs · Engineering · Roadmap · Changelog · GitHub (★ compteur réel) · **[Download]**.
**Pied de page :** produit, documentation, projet (licence, sécurité, confidentialité, kit presse), communauté, statut de version courante.

---

## 6. Page d'accueil, section par section

| # | Section | Intention narrative | Contenu et interaction | Source de vérité |
|---|---|---|---|---|
| 1 | **Hero** | Promesse + preuve immédiate | H1 éditorial serif, sous-titre, deux CTA, mention plateformes. À droite (au-dessous sur mobile) : cadre terminal qui démarre le replay au clic, aperçu statique par défaut. | `recorded-example.cast`, `recorded-terminal.jpg` |
| 2 | **La tension** | Créer l'identification | *Before the first line of code, there is a decision.* Trois questions qui « suivent le fondateur » apparaissent une à une. | README |
| 3 | **La salle** | Faire comprendre le concept | La table du hero SVG devient interactive : chaque siège (Product, Engineering, Market, Finance, Logistics, You) révèle la question qu'il apporte. Bascule « Vision : composez votre équipe » / « Available today : exemple à trois rôles ». | Tableau des rôles du README |
| 4 | **Le récit (signature)** | Prouver la valeur | Scrollytelling en 5 étapes : proposition v1 → objection du Lead Developer avec la citation `context.md:4` surlignée dans la source → objection Marketing `context.md:6` → proposition v2 avec **diff visuel** v1/v2 → avis finaux avec `INSUFFICIENT_EVIDENCE` conservé et décision humaine `pending`. Terminal collant à droite, récit à gauche. Sur mobile : cartes empilées générées depuis la fixture, pas de terminal miniature illisible. | `meeting.json`, `context.md` importés au build |
| 5 | **Le dossier de décision** | Montrer le livrable | Deux feuilles « papier » : `plan.md` et `memo.md` réels, hash SHA-256 de la source visible, bouton *View raw*. | `docs/validation/recorded-export/` |
| 6 | **Principes** | Différencier | Quatre principes (§4.2) en grille, chacun avec une micro-illustration et un lien vers le concept dans la doc. | README |
| 7 | **Confiance et flux de données** | Lever l'objection confidentialité | Diagramme : ce qui reste sur la machine (projets, sources, instantanés, historique, exports), ce qui part vers les fournisseurs configurés (contexte sélectionné, au plan 02), ce qui ne part jamais (pas de compte ni de backend BOARDROOM). Statuts par ligne. | Spec §1, §9 ; guide « What happens to your data » |
| 8 | **Built like infrastructure** | Crédibilité ingénierie | Mini-architecture, matrice 3 OS, nombre de tests et statut CI **lus au build**, liens vers acceptation et qualification d'installation. Pas de badge décoratif. | API GitHub, `docs/*` |
| 9 | **Statut et feuille de route** | Honnêteté et désir | Frise des 9 plans : 01 accepté avec réserves, 02 « next: first real decision », suivants planifiés. CTA *Watch releases*. | `boardroom-plans/` (statuts) |
| 10 | **Appel final + FAQ** | Conclure | *Bring the question that matters.* + Download. FAQ : gratuit ? clés nécessaires ? quelles données partent ? quels modèles ? pourquoi un terminal ? quelle licence ? | Docs |

**Règle d'or de la home :** chaque visuel est soit une capture réelle étiquetée, soit une illustration explicitement éditoriale. Aucune fausse interface.

---

## 7. Téléchargement gratuit et distribution

### 7.1 Expérience de la page `/download`

1. **Carte principale auto-détectée** (User-Agent Client Hints, repli UA) : *Download for macOS (Apple silicon)* · version · date · taille · SHA-256 copiable.
2. **Installation en une ligne** (recommandée) avec bouton copier :
   - macOS / Linux : `curl -fsSL https://<domaine>/install.sh | sh`
   - Windows PowerShell : `irm https://<domaine>/install.ps1 | iex`
   - Le script télécharge depuis GitHub Releases, **vérifie le SHA-256**, extrait hors du dossier de données, propose l'ajout au `PATH`, n'exige ni Node ni droits administrateur.
3. **Archives directes** pour les trois cibles qualifiées ; les cibles non qualifiées (macOS Intel, Linux arm64, Windows arm64) sont listées comme *Not yet qualified* avec lien « build from source ».
4. **Vérifier ce que vous installez** : sommes de contrôle, `gh attestation verify` (provenance de build GitHub), SBOM.
5. **Configuration requise** : terminal compatible, espace disque, *no Node.js required*.
6. **Ensuite** : trois commandes (`boardroom demo`, `boardroom export --output ./exports`, `boardroom doctor`), lien Quickstart.
7. **Données et désinstallation** : emplacements par OS (déjà documentés), désinstallation propre.
8. **Gratuité** : *Free and open source. No account. The recorded example makes no model calls.*

Après clic : redirection vers **`/welcome`** (premières commandes, dépannage Gatekeeper/SmartScreen, lien *Star on GitHub*, lien *Field notes*).

### 7.2 Chaîne de release

| Étape | Mise en œuvre | Preuve |
|---|---|---|
| Déclenchement | Tag `v*` → workflow `release.yml` qui réutilise la matrice et les jobs `installed` existants | Exécution CI liée à la release |
| Paquets | Archives par OS/arch nommées `boardroom-<version>-<os>-<arch>.tar.gz` (et `.zip` Windows à étudier) | Journey installée verte sur les 3 OS |
| Intégrité | `SHA256SUMS` publié ; attestation `actions/attest-build-provenance` ; SBOM | Vérification documentée sur `/download` |
| Publication | GitHub Release (*pre-release* pour une developer preview) avec notes et limites | Re-téléchargement et Quickstart refaits (plan 09, étape 7) |
| Site | Rebuild déclenché par la release ; le site lit l'API Releases au build | Page `/download` à jour sans édition manuelle |
| Scripts d'installation | `install.sh` / `install.ps1` versionnés dans le dépôt, servis par le site, **testés en CI** sur les 3 OS | E2E : script → `boardroom doctor --json` |
| Gestionnaires de paquets (plus tard) | Homebrew tap, Scoop, winget | Après la bêta |

### 7.3 Signature, notarisation et premiers lancements

- Le comportement de Gatekeeper sur une archive téléchargée par navigateur (attribut de quarantaine, addon natif non signé) et de SmartScreen **doit être qualifié** avant publication. L'installation par script (`curl`, `irm`) évite l'attribut de quarantaine du navigateur et devient donc la voie recommandée.
- En attendant la signature : section *First launch* honnête par OS, avec la commande exacte à exécuter et l'explication du risque.
- La notarisation Apple (abonnement développeur payant) et un certificat de signature Windows sont des **dépenses à décider** (D6) ; aucun achat sans décision explicite.

### 7.4 Deux régimes de diffusion

| Régime | Quand | Ce que dit le site |
|---|---|---|
| **Developer preview** | Dès les décisions D1 + D2, sur la base du plan 01 | *Developer preview — recorded example only. Live meetings arrive in Plan 02.* Bannière persistante. |
| **Public beta** | Plan 09 accepté | Téléchargement grand public, documentation complète, matrice de capacités. |

---

## 8. Une documentation de classe mondiale

### 8.1 Principes

1. **Diátaxis** : tutoriels (apprendre), guides (accomplir), référence (consulter), explications (comprendre). Chaque page appartient à un seul type.
2. **Docs-as-code** : la doc vit dans le dépôt ; une PR qui change un comportement change sa doc ; la CI refuse une commande documentée qui ne fonctionne plus.
3. **Vérité unique** : tout ce qui peut être généré depuis le produit l'est (§8.4).
4. **Statuts honnêtes** : chaque page et chaque capacité porte `Available`, `Preview` ou `Planned — Plan 0X`.
5. **Prête pour les agents IA** : chaque page existe en Markdown brut, `llms.txt` et `llms-full.txt` publiés, boutons *Copy as Markdown* et *Open in Claude / ChatGPT*.
6. **Temps jusqu'à la première réussite** : le Quickstart mène à `boardroom demo` en moins de 5 minutes.

### 8.2 Arborescence

```text
Get started
  Introduction — ce qu'est Boardroom, pour qui, statut actuel
  Quickstart — installer et lancer l'exemple enregistré (5 min)
  Install — onglets macOS / Windows / Linux, vérification, mise à jour, désinstallation
  Your first real meeting — [Planned — Plan 02]

Concepts (explications)
  The room — CEO humain, sièges, rôles, modèles ; vision vs V1
  Meeting lifecycle — analyse indépendante → confrontation → révision → avis finaux
  Proposals and versions
  Verdicts and confidence — APPROVED / REJECTED / INSUFFICIENT_EVIDENCE ; confiance ≠ probabilité calibrée
  Evidence and citations — instantanés SHA-256, lignes, pages physiques PDF, blocs DOCX
  Disagreement by design
  Duration, budget and usage — [Planned — Plans 02–04]
  Permissions and tools — [Planned — Plan 06]
  Memory — [Planned — Plan 05]
  Your data — local, envoyé aux fournisseurs, jamais envoyé

Guides (how-to)
  Explore the recorded example
  Inspect PDF and DOCX evidence
  Export a plan and decision memo
  Read your history and export receipts
  Inspect the saved decision
  Check your terminal (terminal-check)
  Diagnose your installation (doctor)
  Export a filtered technical trace
  Move or reset your data directory
  Troubleshooting — Gatekeeper, SmartScreen, terminal, chemins Unicode, module natif

Reference
  CLI — une page par commande, générée (§8.4)
  Exit codes — 0, 2 (échec d'extraction), 130 (annulation)…
  JSON output schemas — decision v1, history v1, evidence… générés depuis Zod
  Data directory layout — domain.sqlite, snapshots/, checkpoints.sqlite, exports
  Platform support matrix — cibles qualifiées et non qualifiées
  Capability matrix — sortie de doctor expliquée

Architecture (ingénieurs et recruteurs)
  Overview — frontières publiques
  Durable data
  Playback journal and export receipts
  Dependency and runtime decisions
  Qualification matrix
  Protection and provenance limits
  Decision records (ADR)

Project
  Roadmap — les 9 plans
  Engineering evidence — acceptation, progression, qualification (rendu depuis docs/)
  Contributing — TDD-first, PR dépendantes
  Changelog
  License · Security policy · Brand
```

### 8.3 Fonctionnalités de la documentation

| Fonctionnalité | Pourquoi | Mise en œuvre |
|---|---|---|
| Recherche instantanée ⌘K | Trouver en 2 secondes, hors ligne, sans service tiers | Pagefind intégré à Starlight, index statique |
| Onglets OS synchronisés et auto-sélectionnés | Une seule vérité par plateforme | Composant `Tabs` avec `syncKey`, présélection par OS détecté |
| Blocs de code de qualité | Copier sans erreur | Expressive Code : copier, titres de fichier, lignes surlignées, cadres terminal |
| Terminal rejouable dans les guides | Voir le résultat attendu | Lecteur asciinema sur des `.cast` **régénérés en CI** par la campagne d'installation |
| Badges de statut par page et par section | Ne jamais présenter un futur comme acquis | Frontmatter `status` + composant `<Status>` |
| *Copy page as Markdown*, *Open in Claude / ChatGPT* | Les développeurs lisent la doc avec un assistant | Bouton de page + route `.md` |
| `llms.txt` / `llms-full.txt` | Indexation par les agents | Plugin `starlight-llms-txt` |
| Référence générée | Zéro dérive | Manifeste de commandes CLI + `z.toJSONSchema()` (Zod 4) |
| « Was this page helpful? » sans backend | Boucle de feedback respectueuse | Lien vers une issue GitHub préremplie (page, version) |
| *Edit this page*, date de mise à jour | Confiance et contribution | Natif Starlight, date issue de git |
| Diagrammes lisibles en clair et sombre | Comprendre l'architecture | SVG dessinés avec les tokens du thème ; textes alternatifs |
| Versions de documentation | Un utilisateur de 0.1 lit la doc de 0.1 | `starlight-versions` dès la première release publique |
| Images de partage par page | Partage soigné | `astro-og-canvas` |
| Internationalisation | Communauté francophone | Anglais d'abord (spec) ; français après la bêta via l'i18n Starlight |
| Assistant « Ask the docs » | Réponse conversationnelle | **Phase ultérieure et décision de coût (D9)** : nécessite un service hébergé et un budget d'API |

### 8.4 Sources uniques de vérité

```text
src/cli.ts (texte d'aide, commandes acceptées, codes de sortie) ──► /docs/reference/cli/, exit-codes/
(phase 3 : lu dans la source plutôt qu'un manifeste extrait, pour ne pas modifier l'application depuis la PR du site)
src/domain.ts (Zod) ──► z.toJSONSchema() ──► /docs/reference/schemas/*
qualification/ (CI 3 OS) ──► .cast + screen.txt régénérés ──► lecteurs terminal des guides
assets/demo/meeting.json + context.md ──► récit de la home + tutoriel
docs/validation/recorded-export/ ──► section « dossier de décision »
GitHub Releases API ──► /download, /changelog, versions affichées
package.json (engines), matrice CI ──► Platform support matrix
boardroom-plans/ (statuts) ──► /roadmap, badges Planned
```

Extraire le manifeste de commandes est un changement de code produit : il suit le TDD-first (test rouge sur `--help` et sur le manifeste, puis implémentation).

### 8.5 Gabarits de pages

- **Tutoriel** : objectif · prérequis · étapes numérotées avec résultat attendu (capture réelle) · « what you learned » · étape suivante.
- **Guide** : quand l'utiliser · commande · variantes par OS · sortie attendue · erreurs fréquentes · voir aussi.
- **Référence** : synopsis · options (type, défaut, obligatoire) · codes de sortie · sortie `--json` (schéma) · exemples testés.
- **Concept** : idée en une phrase · pourquoi · comment cela fonctionne (diagramme) · limites actuelles · statut.

### 8.6 Migration des documents existants

| Existant | Devient | Remarque |
|---|---|---|
| `docs/getting-started.md` | Quickstart + Install + guides | Découpé par tâche |
| `docs/architecture.md` | Section Architecture | Découpé en 6 pages |
| `docs/technical-qualification.md`, `installation-qualification.md` | Architecture › Qualification + Engineering evidence | Rendus depuis `docs/` |
| `docs/plan-01-acceptance.md`, `plan-01-progress.md` | Engineering evidence | Restent dans `docs/` (pièces de preuve), affichés en lecture seule |
| `docs/contributing.md` | Project › Contributing | — |
| `README.md` | Reste la vitrine GitHub | Liens vers le site après lancement ; mêmes slogans |

---

## 9. Direction artistique et design system

### 9.1 Concept : « The room at night »

Une salle de conseil calme, tard le soir : surfaces profondes, papier crème, une seule lumière de signal. L'identité dérive directement de l'illustration existante, ce qui garantit la cohérence entre README, site et futur terminal.

### 9.2 Couleurs (tokens)

| Token | Sombre (défaut) | Clair | Rôle |
|---|---|---|---|
| `--surface-0` | `#101924` | `#F5F4EC` | Fond |
| `--surface-1` | `#1D3039` | `#ECEBE1` | Sections |
| `--surface-2` | `#28434A` | `#E1E4DA` | Cartes, table |
| `--line` | `#78938D` | `#9DB1AB` | Traits, bordures |
| `--text-strong` | `#F5F4EC` | `#101924` | Titres |
| `--text` | `#B8C8CC` | `#2C3B44` | Corps |
| `--signal` | `#D8EEAE` | `#4F6B1F` | Accent, CTA, focus |
| `--verdict-approved` | à définir (vert sauge) | — | `APPROVED` |
| `--verdict-rejected` | à définir (corail) | — | `REJECTED` |
| `--verdict-insufficient` | à définir (ambre) | — | `INSUFFICIENT_EVIDENCE` |

Les couleurs de verdict sont aussi codées par un libellé et une icône (jamais par la couleur seule) et devraient, à terme, être partagées avec l'interface terminal. Tous les couples texte/fond sont vérifiés WCAG 2.2 AA dans les deux thèmes.

### 9.3 Typographie (licences libres, auto-hébergées)

- **Display** : un serif éditorial (Instrument Serif ou Newsreader) pour les titres, dans la lignée du Georgia de l'illustration.
- **Texte et interface** : Inter ou Geist.
- **Code et terminal** : police monospace du système (SF Mono, Cascadia Mono/Consolas, DejaVu Sans Mono). Retenu en phase 1 à la place de JetBrains Mono : la capture se lit comme dans le terminal du visiteur, et aucune police de code ne retarde le premier rendu.
- **Documentation** : texte en police système, titres en serif de marque. En CI, Inter et JetBrains Mono faisaient dépasser le budget LCP de la documentation (1,81 s et 1,96 s en mobile simulé).
- Polices auto-hébergées en WOFF2 sous-ensemblées (aucun appel à un CDN de polices, par cohérence avec la confidentialité), display préchargée.

### 9.4 Composants signature

Cadre terminal (chrome minimal, titre « Recorded example — scripted fictional fixture ») · Puce de siège (rôle + modèle) · Badge de verdict · Puce de citation (`context.md:4` → ouvre la source surlignée) · Diff de proposition v1/v2 · Pilule de statut (`Available` / `Preview` / `Planned`) · Feuille « papier » d'export · Callouts docs (note, attention, limite actuelle).

### 9.5 Mouvement

- Le mouvement **explique** (progression du débat, passage v1 → v2), il ne décore pas.
- Animations CSS pilotées par le défilement en amélioration progressive ; View Transitions entre pages ; Motion uniquement dans les îlots interactifs.
- `prefers-reduced-motion` : récit en étapes statiques, aucun défilement automatique.
- Le replay ne démarre jamais seul avec du son ou en boucle infinie ; contrôles pause et vitesse.

### 9.6 Images et illustrations

Captures **uniquement** issues de la version livrée, avec données fictives distribuables et provenance documentée (comme `docs/media/README.md`). Illustrations vectorielles éditoriales dans le style de la table du hero. Pas de photos d'équipe ou de bureaux fictifs, pas de visages générés.

### 9.7 Accessibilité

WCAG 2.2 AA ; navigation clavier complète, focus visible avec `--signal` ; le replay a son équivalent texte (`terminal-screen.txt`, cartes du récit) ; titres hiérarchisés ; attributs `lang` corrects ; tests axe automatisés et passage manuel au lecteur d'écran (VoiceOver, NVDA) avant lancement.

---

## 10. Architecture technique

### 10.1 Stack recommandée

Versions relevées sur npm le 2026-10-03, à re-vérifier au démarrage :

| Besoin | Choix | Pourquoi |
|---|---|---|
| Framework | **Astro 7.3** | Statique par défaut, zéro JS hors îlots, excellent pour un site de contenu, View Transitions natives |
| Documentation | **Starlight 0.42** (peer `astro ^7.2.10`) | Accessibilité, Pagefind, Expressive Code, i18n, thème personnalisable, écosystème de plugins |
| Styles | **CSS natif à tokens** (`tokens.css`) + styles scopés Astro | Retenu en phase 1 à la place de Tailwind 4.3 : Starlight impose ses propres couches CSS, et une dizaine de composants sur mesure restent plus lisibles et plus légers ainsi. Choix réversible |
| Contenu | MDX (`@astrojs/mdx` 8) + collections de contenu typées (Zod) | Validation du frontmatter au build |
| Replay terminal | Texte d'écran capturé rendu tel quel en phase 1 ; `asciinema-player` 3.17 pour les enregistrements plus longs | L'enregistrement actuel affiche l'écran en une seule mise à jour : son texte réel, accessible et net, suffit |
| Animation | CSS d'abord, `motion` 14 dans les îlots | Poids minimal |
| Recherche | Pagefind 1.5 | Statique, hors ligne, sans service |
| Agents IA | `starlight-llms-txt` 0.12 | `llms.txt` / `llms-full.txt` |
| Versions de docs | `starlight-versions` 0.10 | Dès la première release publique |
| Images de partage | `astro-og-canvas` 0.13 | OG par page au build |
| Tests | Playwright 1.63, axe, Lighthouse CI, lychee, Vale | §11 |

**Alternatives écartées :** Next.js + Fumadocs (excellent rendu, mais un runtime React plus lourd pour un site essentiellement statique) ; Mintlify (rendu immédiat mais service hébergé payant, moins de contrôle sur la vérité unique et les tests) ; Docusaurus (plus daté, moins performant par défaut).

### 10.2 Organisation du dépôt

```text
site/
  astro.config.mjs
  package.json                 # dépendances isolées de l'application
  src/
    content/docs/              # documentation MDX (Starlight)
    content/field-notes/       # articles
    pages/                     # index, download, welcome, engineering, roadmap, changelog, brand…
    components/                # Terminal, Seat, Verdict, Citation, ProposalDiff, Status…
    data/                      # loaders : meeting.json, cast, releases, CI, plans
    styles/tokens.css
  public/install.sh  public/install.ps1   # copiés depuis scripts/ au build
  tests/                       # Playwright, axe, contrats de données
  src/data/claims.ts           # registre des affirmations (§11.2)
```

Même dépôt plutôt qu'un dépôt séparé : une PR change le code et sa documentation ensemble, et la CI peut tester les commandes publiées contre le paquet construit dans la même exécution. Les dépendances du site restent isolées de celles de l'application (aucun impact sur le paquet distribué).

### 10.3 Hébergement et déploiement

- **Recommandé : Vercel** (offre Hobby pour un projet personnel non commercial, conditions à vérifier) : prévisualisation par PR, déploiement à chaque merge sur `main` et à chaque release, analytics sans cookie optionnels.
- **Repli sans coût ni compte supplémentaire : GitHub Pages** via Actions.
- Le site est 100 % statique : changer d'hébergeur ne demande aucune réécriture.

### 10.4 Analytics et vie privée

Mesure agrégée sans cookie ni identifiant personnel (Vercel Web Analytics, Plausible ou Umami auto-hébergé, décision D5). Pas de pixel publicitaire, pas d'enregistrement de session, pas de bannière cookie nécessaire si ces conditions sont respectées. Page `/privacy` courte et exacte.

### 10.5 SEO et partage

HTML sémantique, `sitemap.xml`, URLs canoniques, données structurées `SoftwareApplication` (`offers.price = 0`, systèmes supportés réels), cartes Open Graph par page, titres et descriptions écrits à la main pour les pages clés. Requêtes visées : *AI advisory board*, *multi-agent decision making*, *open source AI board of advisors*, *local AI decision tool*, *LLM debate CLI*.

### 10.6 Budgets de performance

| Mesure | Budget (mobile, 4G simulée) |
|---|---|
| LCP | < 1,8 s |
| INP | < 150 ms |
| CLS | < 0,05 |
| JS initial de la home | < 60 ko gzip (le lecteur de replay se charge à l'interaction ou à la visibilité) |
| Poids total de la home | < 900 ko |
| Lighthouse | ≥ 95 dans les 4 catégories |

### 10.7 Sécurité du site

Content-Security-Policy stricte sans script tiers, en-têtes de sécurité standard, scripts d'installation servis en HTTPS uniquement avec somme de contrôle publiée, et revue de chaque modification de `install.sh` / `install.ps1` comme du code de distribution.

---

## 11. Qualité : TDD et portes CI appliqués au site

### 11.1 Contrôles

Le site est du code livré : ses comportements (résolution de la release, détection d'OS, scripts d'installation, générateurs de référence) suivent le **TDD-first** des [exigences transversales](EXIGENCES-TDD-ET-README.md).

| Contrôle | Outil | Bloquant |
|---|---|---|
| Build et types, frontmatter validé | `astro check` | Oui |
| Parcours E2E (home → download → welcome, détection d'OS, copie de commande, recherche) | Playwright | Oui |
| Régression visuelle clair/sombre × mobile/desktop | Captures Playwright | Oui, avec revue des diffs |
| Accessibilité | axe via Playwright | Oui (sérieux et critique) |
| Performance | Lighthouse CI avec budgets | Oui |
| Liens internes et externes | lychee | Oui (internes) ; alerte (externes) |
| Commandes documentées | Extraction des blocs marqués `test` → exécution contre le paquet candidat sur les 3 OS | Oui |
| Scripts d'installation | E2E sur les 3 OS : script → `boardroom doctor --json` | Oui |
| Prose | Vale avec vocabulaire maison (§4.5) | Oui pour les termes interdits |
| Contrats de données | Tests sur les loaders (fixture, cast, releases) | Oui |

### 11.2 Registre des affirmations

`site/src/data/claims.ts` liste chaque affirmation publique avec sa preuve (TypeScript typé plutôt que YAML, pour que la page et les tests partagent le même type) :

```ts
{ id: 'three-platforms', text: 'Qualified on macOS (Apple silicon), Windows x64 and Linux x64',
  status: 'available', evidence: ['docs/installation-qualification.md', '.github/workflows/ci.yml'] },
{ id: 'live-meetings', text: 'Live meetings with three distinct models from at least two providers',
  status: 'planned', evidence: [], plan: '02' },
{ id: 'configurable-room', text: 'Choose the size, roles and models of your advisory team',
  status: 'vision', evidence: ['docs/contributing.md', 'README.md'] },
```

Un composant `<Claim id="…">` affiche le texte et son statut ; la CI échoue si une affirmation n'a pas de preuve résoluble ou si une capacité `planned` est rédigée comme disponible. C'est l'application directe, au marketing, de la culture de preuve du projet.

---

## 12. Plan de lancement marketing

### 12.1 Trois temps alignés sur le produit

| Temps | Déclencheur | Objectif | Actions |
|---|---|---|---|
| **Avant-première** | Site + developer preview (plan 01) | Premiers testeurs, retours, crédibilité recruteur | Lien depuis CV/LinkedIn vers `/engineering`, 2 articles Field notes, partage ciblé auprès de fondateurs techniques |
| **Lancement** | Plan 02 : première vraie décision à trois modèles | Attention et installations | Show HN (*Show HN: Boardroom – an open-source room where AI advisers challenge your plan*), Product Hunt, X/LinkedIn, communautés francophones, vidéo de 60 s d'une vraie réunion |
| **Bêta publique** | Plan 09 accepté | Adoption durable | Notes de version soignées, documentation complète, gestionnaires de paquets, appel à contributions |

Le vrai lancement public attend le plan 02 : lancer sur un exemple enregistré gaspillerait la première impression.

### 12.2 Contenus « Field notes » (déjà vrais, déjà prouvés)

1. *Why we bundle Node instead of compiling with Bun* — dépendance native, ABI, checkpointer.
2. *Crash-safe exports without pretending SQLite and the filesystem are atomic* — intentions, reçus, état `unconfirmed`.
3. *Testing a terminal UI with real pseudoterminals on three OSes* — node-pty, xterm headless, graphèmes.
4. *Citations that can't lie: content-addressed evidence for PDF and DOCX*.
5. *Installing without Node: our clean-machine qualification campaign*.
6. *Disagreement as a feature: why Boardroom never forces consensus*.
7. *TDD-first for an AI product: what red → green looks like in practice*.

Chaque article renvoie au code et aux preuves : ils servent à la fois le référencement, Hacker News et l'évaluation par un recruteur.

### 12.3 Kit de lancement

Images OG, GIF/vidéo courte issus du vrai terminal, captures clair/sombre, description en 50 et 150 mots, logo, palette, FAQ presse, liste des limites actuelles. Tout dans `/brand`.

---

## 13. Feuille de route de réalisation

Estimations en jours de travail effectif pour une personne assistée par IA ; à recaler après la phase 1.

| Phase | Contenu | Livrables | Durée | Sortie |
|---|---|---|---|---|
| **0. Décisions** | D1–D10 (§14), choix des polices, domaine | Fiche de décisions signée | 1–2 j | Décisions D1, D3, D4, D5 prises |
| **1. Fondations et design system** | Squelette `site/`, tokens, typographie, composants signature, CI qualité (§11) | Pages vides mais déployées en prévisualisation, Storybook léger ou page `/design` | 4–5 j | CI verte, Lighthouse ≥ 95 sur squelette |
| **2. Home et récit** | Copy deck, 10 sections, scrollytelling, replay, mobile en cartes | Home complète en prévisualisation | 6–8 j | Test 30 s réussi (4/5), budgets tenus |
| **3. Documentation v1** | IA (§8.2), migration (§8.6), manifeste CLI (TDD), schémas Zod, `llms.txt`, recherche | `/docs` complète pour le plan 01 | 8–10 j | Commandes documentées vertes sur 3 OS |
| **4. Téléchargement** | `release.yml`, sommes de contrôle, attestations, scripts d'installation (TDD), `/download`, `/welcome` | Developer preview publiée (si D1+D2) | 4–6 j | Re-téléchargement + Quickstart réussis sur 3 OS |
| **5. Pages secondaires** | `/engineering`, `/roadmap`, `/changelog`, `/brand`, `/privacy`, `/security`, 2 Field notes | Site complet | 4–5 j | Revue externe (1 fondateur, 1 recruteur) |
| **6. Lancement** | Aligné sur le plan 02 | Kit de lancement, posts | 2–3 j + suivi | Indicateurs §2 suivis |
| **Continu** | Changelog, versions de docs, i18n FR, Field notes, Ask the docs (si D9) | — | — | — |

Total jusqu'à une developer preview présentable : **environ 5 à 7 semaines**. Les phases 1–3 et 5 ne dépendent d'aucune décision bloquante ; la phase 4 dépend de D1 et D2.

---

## 14. Décisions à prendre

**Décisions prises le 3 octobre 2026 :** D1 Apache-2.0 (fichiers `LICENSE` et `NOTICE`, livrés avec chaque paquet) ; D2 pas de developer preview avant la bêta ; D3/D4 pas de mise en ligne pour l'instant ; D5 aucune mesure d'audience. D6 à D10 restent ouvertes (D8 et D10 appliquées par défaut : polices libres, même dépôt).

| ID | Décision | Options | Recommandation | Bloque |
|---|---|---|---|---|
| **D1** | Licence du projet | MIT · Apache-2.0 · AGPL-3.0 | **Apache-2.0** (permissive, licence de brevets explicite, rassurante pour entreprises et recruteurs) | Téléchargement public |
| **D2** | Publier une developer preview avant le plan 09 | Oui (pre-release étiquetée) · Non (site sans téléchargement jusqu'à la bêta) | **Oui**, étiquetée *recorded example only* | Phase 4 |
| D3 | Nom de domaine | Candidats à vérifier : `boardroom.dev`, `getboardroom.dev`, `useboardroom.com`, `boardroom.tools`… | Un `.dev` court ; disponibilité et prix à vérifier (dépense annuelle à approuver) | Mise en ligne publique |
| D4 | Hébergement | Vercel · GitHub Pages · Cloudflare Pages | Vercel pour les prévisualisations ; GitHub Pages en repli | Phase 1 (prévisualisations) |
| D5 | Analytics | Aucun · Vercel Analytics · Plausible · Umami auto-hébergé | Mesure sans cookie, la plus simple disponible | Phase 1 |
| D6 | Signature et notarisation | Aucune pour la preview · Apple Developer + certificat Windows | Aucune pour la preview, avec dépannage honnête ; réévaluer pour la bêta | Bêta |
| D7 | Liste d'attente / newsletter | *Watch releases* GitHub uniquement · Buttondown ou équivalent | *Watch releases* d'abord (aucune donnée personnelle collectée) | — |
| D8 | Polices | Libres (OFL) · commerciales | Libres et auto-hébergées | Phase 1 |
| D9 | Assistant « Ask the docs » | Non · service hébergé avec budget | Non avant la bêta | — |
| D10 | Dépôt | Même dépôt (`site/`) · dépôt séparé | Même dépôt | Phase 1 |

Aucune dépense (domaine, hébergement payant, signature, analytics payants) n'est engagée sans décision explicite, conformément à la spec.

---

## 15. Risques et parades

| Risque | Effet | Parade |
|---|---|---|
| Le site promet plus que le produit | Perte de confiance, surtout chez les recruteurs | Registre des affirmations bloquant, statuts visibles, revue de copy par une personne extérieure |
| La doc dérive du produit | Commandes cassées, abandon au Quickstart | Référence générée, commandes testées en CI, captures régénérées |
| Gatekeeper / SmartScreen bloquent le premier lancement | Abandon à l'installation | Installation par script, section *First launch* qualifiée, signature évaluée pour la bêta |
| Effets visuels qui dégradent performance ou accessibilité | Mauvais Lighthouse, exclusion | Budgets bloquants, mouvement réduit, îlots chargés à la demande |
| Le terminal rebute une partie du public | Moins de conversions | Le récit visuel montre la valeur sans terminal ; ciblage assumé des bâtisseurs techniques |
| Vision (équipe configurable) confondue avec le disponible (3 rôles enregistrés) | Promesse non tenue | Bascule « Vision / Available today » dans la section La salle, libellés explicites |
| Lancement prématuré sur l'exemple enregistré | Première impression gâchée | Avant-première discrète ; lancement public au plan 02 |
| Charge de maintenance du site pour une seule personne | Site obsolète | Tout ce qui change souvent est généré ; le contenu éditorial manuel reste concentré sur la home et `/engineering` |

---

## 16. Critères d'acceptation du site

- [ ] Une personne extérieure identifie en environ 30 secondes le public, le problème, le résultat et comment essayer (4 testeurs sur 5).
- [ ] Le récit montre de façon inspectable une objection sourcée qui change la proposition, et le désaccord conservé, à partir des fixtures réelles.
- [ ] Chaque capture et chaque replay proviennent de la version livrée, avec provenance documentée et statut fictif visible.
- [ ] `/download` détecte l'OS, affiche version, taille et SHA-256 réels, et chaque méthode d'installation est testée en CI sur les trois OS annoncés.
- [ ] Le Quickstart mène d'une machine propre à `boardroom demo` en moins de 5 minutes, vérifié par une personne extérieure.
- [ ] Toutes les commandes documentées passent contre le paquet de release ; la référence CLI et les schémas sont générés.
- [ ] Toutes les affirmations publiques ont une preuve résoluble ; aucune capacité future n'est présentée comme disponible.
- [ ] Lighthouse ≥ 95 dans les 4 catégories, budgets de performance tenus, 0 violation axe sérieuse, 0 lien interne cassé.
- [ ] Rendu vérifié en clair/sombre, mobile/desktop, clavier seul, lecteur d'écran et mouvement réduit.
- [ ] Aucun cookie, pisteur tiers ou appel à un CDN externe ; `/privacy` décrit exactement la mesure en place.
- [ ] Licence, domaine, hébergement et analytics ont fait l'objet d'une décision explicite avant mise en ligne publique.

---

## Annexe — Ce que l'on emprunte aux meilleurs

| Référence | À retenir |
|---|---|
| Linear | Rythme typographique, sobriété sombre, précision du mouvement |
| Stripe / Stripe Docs | Exemples copiables, référence irréprochable, clarté pédagogique |
| Vercel | Page de téléchargement et de démarrage rapide orientée action |
| Raycast / Warp | Faire désirer un outil terminal par la mise en scène du vrai produit |
| Tailwind CSS docs | Recherche instantanée, exemples immédiatement utiles |
| Supabase docs | Onglets par plateforme, guides orientés tâche |
| Astro Starlight | Accessibilité et performance par défaut |
| Documentation Anthropic | Pages disponibles en Markdown, intégration avec les assistants IA |
