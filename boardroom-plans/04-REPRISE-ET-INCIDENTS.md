# Plan 04 — Reprendre une réunion et résoudre les incidents

Statut : à réaliser. Dépendance : [plan 03](03-PARTICIPATION-HUMAINE.md) accepté. Suite : [plan 05](05-CONNAISSANCE-ET-MEMOIRE.md). Références : spec §5, §7, §8 et §10. [Ordre général](00-ORDRE-ET-DEPENDANCES.md).

## Ce qui devient utilisable

Après un arrêt, une panne de modèle ou une fermeture brutale, l'utilisateur retrouve sa réunion au dernier point cohérent. Il choisit comment continuer et retrouve les travaux achevés sans duplications. Un résultat d'action incertain est traité comme un incident explicite.

## Entrée

Les plans 01–03 ont déjà introduit événements persistés, identifiants d'actions, versions et checkpoints. Ce plan ajoute la réconciliation et les parcours de résolution. Il ne peut pas réparer a posteriori l'absence de reçus pour des opérations déjà terminées : ces reçus doivent exister dès leur introduction.

## Tranches d'implémentation, dans cet ordre

Chaque comportement ci-dessous commence par un test rouge, puis son implémentation minimale jusqu'au vert, conformément aux [exigences transversales TDD et README](EXIGENCES-TDD-ET-README.md).

1. **Retrouver la réunion.** À l'ouverture, détecter une session suspendue ou interrompue et afficher son contexte courant, sa proposition, ses travaux terminés, ses attentes et son budget restant connu. Distinguer « suspendu par l'humain », « interrompu » et « terminé ».
2. **Réconcilier les trois stockages.** Comparer état métier, checkpoint et journal d'actions au moyen des identifiants stables. Le journal attribue une identité avant l'appel et persiste le reçu indépendamment de l'avancement du graphe. Ne supposer aucune transaction atomique entre bases.
3. **Traiter les cas ambigus.** Si l'appel a peut-être eu un effet mais qu'aucun reçu fiable n'existe, marquer l'opération comme incertaine. Inspecter l'état cible ou interroger un statut fournisseur si cette capacité existe ; sinon demander une résolution explicite. Ne proposer une nouvelle exécution qu'après clarification du précédent résultat.
4. **Résoudre une panne modèle.** Offrir réessayer, remplacer, continuer avec moins de conseillers ou arrêter. Enregistrer la décision et la substitution éventuelle. Continuer les travaux indépendants ; laisser la tâche touchée en attente. Revalider capacités et budget avant toute nouvelle tentative choisie.
5. **Conserver les limites.** Restaurer temps actif, pauses, extensions, réservations et usage connu. Une facture ou un quota indisponible ne devient pas zéro au redémarrage. Une panne de route abonnement ne provoquera jamais une bascule API facturée automatique.
6. **Finir proprement.** Assurer annulation, sauvegarde et export partiel. Un conseiller absent ou un avis non renouvelé reste visible comme manque. Un remplacement reçoit le contexte autorisé actuel et produit son propre avis identifiable.

## Politique de reprise

| État durable observé | Comportement attendu |
|---|---|
| Travail préparé, jamais envoyé | Replanifier après vérification des limites et, le moment venu, des permissions. |
| Résultat et reçu terminés, checkpoint en retard | Réutiliser le résultat et avancer le workflow sans réexécuter l'action. |
| Action envoyée, issue incertaine | Suspendre cette dépendance et inspecter/résoudre l'issue. |
| Résultat terminé pour un contexte ancien | Conserver l'historique ; décider explicitement s'il reste applicable, sinon replanifier sur le contexte actuel. |
| Demande humaine toujours en attente | Restaurer la demande ; ne pas l'approuver à l'ouverture. |
| Échec modèle connu | Présenter les quatre choix de résolution, sans substitution silencieuse. |

Pour un appel modèle interrompu, distinguer l'absence de réponse enregistrée d'une absence de coût. Une réponse partielle ne devient pas une intervention complète ni un avis final validé.

## Tests d'intégration, E2E et README

- **Intégration obligatoire :** vraies bases de test, checkpoints et journal d'actions, avec pannes injectées aux frontières d'exécution. Réouvrir via le service public et vérifier résultat réutilisé, contexte courant, limites et attente restaurée.
- **E2E automatisé obligatoire :** tuer un vrai processus de réunion aux points critiques, relancer le paquet puis vérifier la reprise à travers le terminal et les effets externes observables. Couvrir les quatre choix de panne et l'absence de duplication d'une opération terminée.
- **Scénario rouge prioritaire :** un effet déjà exécuté dont le reçu manque doit être affiché comme incertain, sans seconde exécution automatique. Le test utilise un effet contrôlé constatable, pas un mock interne du journal.
- **README :** expliquer la reprise, les résultats partiels et les limites des actions ambiguës avec un lien vers le dépannage.

## Validation de sortie

- [ ] Les comportements de reprise et correctifs sont réalisés en TDD-first ; les tests d'intégration/E2E avec interruption réelle passent et le README décrit les garanties démontrées.

- [ ] Après arrêt forcé immédiatement après une intervention terminée, la reprise conserve cette intervention sans second appel pour la produire.
- [ ] Après écriture du reçu mais avant le checkpoint suivant, l'opération est réconciliée sans duplication.
- [ ] Un adaptateur d'essai avec effet externe contrôlé est interrompu après l'effet et avant le reçu : la reprise montre une issue incertaine et n'exécute pas une seconde fois l'action.
- [ ] Après une intervention structurelle, la reprise utilise le nouveau contexte tout en gardant les résultats et avis associés aux versions précédentes.
- [ ] Les quatre choix de panne fonctionnent ; continuer à deux conseillers produit un résultat explicitement partiel, jamais une approbation du troisième.
- [ ] La substitution d'un modèle apparaît dans l'historique, les avis et les exports ; elle ne confond pas l'identité du conseiller avec celle du modèle utilisé.
- [ ] Budget, temps actif et réservations survivent au redémarrage. Une valeur d'usage inconnue et un quota épuisé sont affichés correctement.
- [ ] Les demandes non résolues, les refus et les annulations survivent à une fermeture ; aucune de ces situations ne crée de consentement.

## Preuves et règle de passage

Conserver une matrice des points d'interruption injectés et les états attendus/observés. Réaliser aussi une reprise réelle d'une réunion multi-fournisseur dans le paquet distribué.

Les essais d'effets externes utilisent un adaptateur contrôlé et des cibles temporaires. Ils valident le protocole du journal ; ils ne prouvent pas encore les protections d'une vraie commande ou d'un MCP, qui devront être testées en 06.

Le jalon est bloqué si une action achevée est rejouée automatiquement ou si un résultat ambigu est classé comme échec certain pour autoriser une nouvelle tentative.

## Limite de cette livraison

La reprise porte sur les capacités introduites jusque-là. Tout nouvel adaptateur de 06 ou 07 devra satisfaire le même contrat avec des tests réels propres à son environnement ; la réussite de ce plan ne certifie pas par avance ces adaptateurs.
