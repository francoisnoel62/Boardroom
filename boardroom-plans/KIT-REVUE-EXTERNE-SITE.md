# Kit de revue externe du site

Date : 3 octobre 2026. Statut : **prêt, aucune session menée**. Ce kit sert aux deux critères de sortie du [plan du site](SITE-VITRINE-ET-DOCUMENTATION.md) qui ne peuvent pas être vérifiés par la CI : le test éditorial des 30 secondes (sortie de phase 2) et la revue externe par un·e fondateur·rice et un·e recruteur·se (sortie de phase 5). Les consignes destinées aux testeurs sont en anglais, comme le site.

Les résultats sont consignés dans ce fichier, tels quels, y compris les échecs. Aucun résultat n'est publié sur le site, et aucune citation de testeur n'y apparaît sans son accord écrit.

## Préparer une session

- Construire le site depuis `main` (`cd site && npm ci && npm run build && npm run preview`) ou utiliser l'artefact `site-dist` de la CI, et noter le commit.
- Navigateur en navigation privée, fenêtre de 1366 × 900 ou téléphone réel ; mode clair ou sombre selon le réglage du testeur.
- Le testeur ne connaît pas le projet. L'animateur ne commente pas la page pendant le test et ne répond pas aux questions avant la fin.

## Test des 30 secondes (sortie de phase 2)

Cinq personnes extérieures. Réussite : **au moins 4 sur 5** restituent les quatre éléments (public, problème, résultat, comment essayer).

Script lu au testeur :

> I'm going to show you a web page for 30 seconds. Look at it as you normally would; you can scroll. Then I'll hide it and ask you four questions. There are no wrong answers: we are testing the page, not you.

Après 30 secondes, page masquée :

1. Who is this product for?
2. What problem does it solve for them?
3. What do they get at the end?
4. How could they try it today?

Grille (une ligne par testeur) :

| Date | Commit | Profil | Public | Problème | Résultat | Comment essayer | Remarques verbatim |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

Réponses attendues : fondateurs et responsables techniques qui préparent une décision produit ; être challengé avant d'engager des semaines de travail, au lieu d'une IA qui approuve ; un plan argumenté et un mémo exportés, désaccord conservé ; explorer l'exemple enregistré (Quickstart) — pas de téléchargement public avant la bêta.

## Revue externe (sortie de phase 5)

Deux sessions de 30 minutes : une personne fondatrice ou responsable technique de start-up, une personne qui recrute des ingénieur·es. Réussite : chacune accomplit sa tâche sans aide et ne relève aucune affirmation qu'elle juge invérifiable ou trompeuse ; tout point bloquant est corrigé avant de clore la phase.

Script fondateur·rice :

> You are deciding whether Boardroom is worth an hour of your time this week. Starting from the home page, find out what it does today, what it does not do yet, and how you would try it. Think aloud. Stop when you have decided, and tell me why.

Script recruteur·se :

> You received a link to this project from a candidate. In ten minutes, find evidence of how it is engineered: decisions, tests, limits. Then tell me what you would ask the candidate in an interview, and whether anything on the site seemed overstated.

Questions de fin (les deux profils) :

1. What, if anything, did you not believe?
2. What was missing for you to decide?
3. Which page would you send to a colleague, and why?

Grille :

| Date | Commit | Profil | Tâche accomplie sans aide | Parcours suivi | Affirmations mises en doute | Manques | Décision et raison |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## Après chaque session

- Ouvrir une issue par point bloquant (étiquette `documentation`), avec la citation verbatim et le commit testé.
- Une correction du récit ou de la home relance le test des 30 secondes sur cinq nouvelles personnes.
- Mettre à jour le statut de ce fichier et celui du [plan du site](SITE-VITRINE-ET-DOCUMENTATION.md) uniquement quand le critère est atteint.
