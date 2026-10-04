# Plan 02 — Une première décision réelle de bout en bout

Statut : à réaliser. Dépendance : [plan 01](01-PARCOURS-LOCAL-INSTALLABLE.md) accepté. Suite : [plan 03](03-PARTICIPATION-HUMAINE.md). Références : spec §3–5, §8, §10–11. [Ordre général](00-ORDRE-ET-DEPENDANCES.md).

Mise à jour du 4 octobre 2026 : les dix incréments et la PR corrective 11 sont fusionnés sur `main` (`ac9111f`). Le parcours déterministe complet est implémenté ; « à réaliser » désigne ici l'acceptation encore ouverte, pas une absence de code. La campagne avec trois modèles réels de deux fournisseurs, ses preuves et les réserves TDD restent à traiter dans le [dossier d'acceptation](../docs/plan-02-acceptance.md). [État des lieux courant](../docs/etat-des-lieux-2026-10-04.md).

## Ce qui devient utilisable

Avec ses clés API, l'utilisateur pose une question sur un petit contexte texte/Markdown, échange avec trois conseillers, obtient un nouveau plan et un mémo, puis consigne sa décision. La réunion utilise réellement trois modèles distincts de deux fournisseurs au moins.

## Entrée

Disposer du paquet, des instantanés et de la persistance de 01. Sélectionner les deux premiers fournisseurs après vérification de leurs interfaces officielles ; confirmer les modèles disponibles sur les comptes utilisés. Les clés de test et le budget des essais doivent être autorisés.

Le périmètre initial de connaissance est volontairement réduit à un ensemble de passages explicitement sélectionnés. PDF/DOCX et recherche à l'échelle d'un projet seront livrés en 05. Les commandes, recherches web et MCP restent bloqués jusqu'en 06.

## Tranches d'implémentation, dans cet ordre

Chaque comportement ci-dessous commence par un test rouge, puis son implémentation minimale jusqu'au vert, conformément aux [exigences transversales TDD et README](EXIGENCES-TDD-ET-README.md).

1. **Configurer une vraie connexion.** Mettre les secrets hors configuration partageable, exports et logs. Décrire pour chaque route modèles, streaming, sorties structurées, outils, annulation et métriques disponibles. Associer un modèle au PO, au Lead Developer et au Marketing Manager.
2. **Cadrer la question.** Enregistrer question, contraintes, langue, contexte figé, modèles, durée cible et budget. Une question avec contexte suffit ; le PO propose un cadrage et, si nécessaire, une proposition initiale. Attendre la validation ou correction humaine du cadrage avant le travail conséquent.
3. **Obtenir trois analyses indépendantes.** Distribuer le même socle factuel sans divulguer les conclusions initiales des autres conseillers. Valider les structures produites avant de modifier l'état métier ; permettre une correction bornée d'une sortie invalide, sinon signaler l'échec.
4. **Confronter puis réviser.** Relier chaque objection à une assertion ou un élément de proposition. Le PO est l'auteur de la proposition commune ; les deux autres conseillers peuvent contester et proposer des amendements. Le programme contrôle les phases et limite les répétitions sans apport.
5. **Recueillir les avis finaux.** Figer une version immuable de proposition et recueillir trois avis sur cette même version : verdict, confiance 0–100, justification, incertitude critique, conditions et références. Une modification matérielle invalide l'actualité des avis sans les effacer.
6. **Décider et exporter.** Présenter changements, preuves, objections, inconnues et avis individuels. Enregistrer séparément acceptation, rejet, modification, report ou demande d'investigation de l'humain. Écrire un plan et un mémo Markdown, plus un JSON expurgé facultatif.
7. **Borner le fonctionnement.** Intégrer dès ce parcours le budget, la durée cible, la réserve de révision/conclusion, la conclusion anticipée et l'arrêt propre. Persister chaque intervention terminée et reçu d'appel. En cas de panne avant 04, proposer au minimum l'arrêt avec résultat partiel ; ne pas relancer aveuglément.

## Invariants du débat et de l'usage

- Ni quatrième conseiller modérateur, ni substitution de la réunion par un modèle unique.
- Les assertions conservent leur type : fait étayé, hypothèse, opinion ou inconnu. Les citations pointent vers les versions de sources héritées de 01.
- `APPROVED`, `REJECTED` et `INSUFFICIENT_EVIDENCE` sont les seuls verdicts finaux. Une absence d'avis est une absence, jamais une approbation.
- La confiance exprime l'assurance déclarée du conseiller ; elle ne devient ni probabilité de succès ni poids dominant la décision humaine.
- Deux approbations et un rejet constituent une conclusion possible. Le désaccord ne déclenche pas de prolongation automatique.
- Réserver le coût des travaux déjà engagés et de la conclusion avant de planifier de nouveaux appels. Documenter la stratégie conservatrice, les limites de sortie et la base tarifaire vérifiée. Refuser une route incompatible avec le plafond exigé plutôt que promettre une garantie impossible.
- Distinguer estimation et usage déclaré par le fournisseur. Une donnée inconnue s'affiche comme inconnue. Aucun dépassement ni changement de route facturée ne s'autorise implicitement.

## Tests d'intégration, E2E et README

- **Intégration obligatoire :** service réunion + graphe réel + stockage réel + schémas + exports ; seules les frontières fournisseurs sont remplacées pour la suite déterministe. Couvrir indépendance des analyses, versions des avis, dissensus, validation des sorties et réservations de budget concurrentes.
- **E2E automatisé obligatoire :** via le terminal réellement lancé, partir d'une question, valider le cadrage, obtenir la proposition, enregistrer une décision humaine et lire les deux exports. Ajouter les parcours limite atteinte et avis manquant avant leur implémentation.
- **E2E vivant obligatoire :** exécuter ce parcours avec les trois modèles et deux fournisseurs réels. Les tests déterministes ne peuvent pas certifier ces connexions.
- **README :** ajouter le quickstart du mode réel, les prérequis/coûts et une preuve concrète source → objection → plan amélioré, capturée sur un exemple distribuable.

## Validation de sortie

- [ ] Les comportements sont réalisés en TDD-first ; les suites d'intégration/E2E requises sont vertes, l'essai réel est effectué et le README décrit le mode réel vérifié.

- [ ] Une réunion réelle complète utilise trois modèles distincts et au moins deux fournisseurs ; les identités sont visibles dans la conversation et la trace de validation.
- [ ] Une question sans plan initial aboutit à une proposition après cadrage humain.
- [ ] La capture des entrées envoyées aux modèles prouve l'absence de conclusions croisées durant les analyses initiales.
- [ ] Une objection sourcée entraîne une révision traçable de proposition ; les sources et anciennes versions restent inspectables.
- [ ] Tous les avis finaux référencent exactement la même version. Les cas de rejet et de preuve insuffisante sont correctement rendus et exportés.
- [ ] Une décision humaine différente de l'avis majoritaire est enregistrée sans effacer les objections.
- [ ] Une limite atteinte ou un conseiller manquant produit un résultat partiel explicite. Les appels concurrents sont comptabilisés avant d'autoriser le suivant.
- [ ] Une défaillance ou une sortie invalide ne fabrique pas d'avis ; les éléments terminés restent persistés et exportables.
- [ ] Les exports ne contiennent ni clé, ni secret de configuration, ni original remplacé. L'historique et les traces techniques sont consultables sur demande, sans exposer un raisonnement interne brut.

## Preuves et règle de passage

Conserver une réunion réelle expurgée, la chaîne source → objection → révision → avis → décision et les deux exports. Ajouter des scénarios déterministes pour dissensus, plafond, usage inconnu et sortie invalide : ils complètent l'essai vivant.

Le jalon n'est pas accepté sans la réunion multi-fournisseur réelle ni sans garde-fous effectifs de durée et de coût. Si les garanties tarifaires ou d'annulation restent incertaines, documenter et résoudre cette incertitude avant de déclarer le plafond opérationnel.

## Limite de cette livraison

L'utilisateur peut cadrer, suivre, arrêter et décider. Les interventions pendant les phases, la reprise guidée et l'investigation outillée seront ajoutées ensuite ; elles ne sont pas annoncées comme déjà disponibles.
