# Plan 08 — Comprendre les exécutions avec une observabilité facultative

Statut : à réaliser. Dépendances directes : [04](04-REPRISE-ET-INCIDENTS.md) pour les incidents et reprises, [06](06-INVESTIGATIONS-ET-OUTILS-PROTEGES.md) pour les actions, [07](07-PREMIERE-UTILISATION-ET-CONNEXIONS.md) pour les routes de connexion. Plans 01–07 acceptés. Suite : [plan 09](09-BETA-PUBLIQUE.md). Références : spec §5, §9 et §10–11. [Ordre général](00-ORDRE-ET-DEPENDANCES.md).

## Ce qui devient utilisable

L'utilisateur comprend les temps de réponse, l'usage, les échecs et les reprises. Il peut conserver ce diagnostic local ou connecter son propre compte Langfuse Cloud Hobby. Les traces cloud sont facultatives et leur contenu dépend d'un réglage explicite par projet.

## Entrée

Les événements locaux et l'essai d'export de 01 existent ; le schéma des actions et routes est stabilisé. Revérifier l'intégration TypeScript/LangGraph, les champs effectivement exportés, les limites du plan Hobby et le comportement de dépassement. L'essai de 01 ne valide pas par avance tous les payloads de l'application complète.

## Tranches d'implémentation, dans cet ordre

Chaque comportement ci-dessous commence par un test rouge, puis son implémentation minimale jusqu'au vert, conformément aux [exigences transversales TDD et README](EXIGENCES-TDD-ET-README.md).

1. **Rendre le diagnostic local utile.** Présenter transitions de réunion/phases, latences modèles, mesures d'usage avec leur statut, volumes de retrieval, décisions de permission, échecs et reprise. S'appuyer sur les événements durables sans faire d'une trace cloud le registre de décision.
2. **Définir les trois modes.** Off par défaut ; métriques/événements sans contenu lorsque l'utilisateur connecte le service ; diagnostic avec contenu seulement après activation explicite pour le projet. Afficher le mode actif et ce qu'il permet d'exporter.
3. **Filtrer à la frontière de sortie.** Placer l'intégration Langfuse derrière un adaptateur applicatif à liste de champs autorisés. Examiner noms, attributs, erreurs, chemins, métadonnées et événements, pas seulement entrées/sorties du modèle. Filtrer aussi les secrets en mode diagnostic.
4. **Borner les exports.** Utiliser une file limitée en taille, âge et tentatives, sans bloquer la réunion. Définir et exposer les compteurs de traces rejetées/abandonnées. Ne pas laisser une panne réseau remplir indéfiniment le disque.
5. **Gérer les changements de politique.** Réévaluer la politique avant envoi. Une désactivation ou réduction du niveau de contenu empêche l'envoi ultérieur des anciens payloads devenus interdits ; purger ou refiltrer la file. Expliquer qu'une désactivation locale ne retire pas automatiquement des données déjà reçues par un service distant.
6. **Qualifier les limites économiques.** Mesurer les volumes réels, configurer les bornes locales et vérifier le comportement du compte Langfuse. N'annoncer aucun fonctionnement strictement sans coût tant que quotas et dépassements ne sont pas établis. Aucun compte central n'est préconfiguré.

## Contrats et confidentialité

- En mode off, aucune trace n'est envoyée vers Langfuse. Les appels fournisseurs explicitement demandés pour une réunion réelle restent soumis à leurs propres connexions et politiques.
- En mode métriques, exclure textes des documents, conversations, résultats d'outils, arguments sensibles, noms de fichiers révélateurs et messages d'erreur bruts susceptibles de contenir des données.
- Un identifiant de corrélation doit être opaque ; dériver un nom d'événement d'une question confidentielle serait une fuite même sans payload de conversation.
- Le mode diagnostic est par projet et conserve le filtrage des secrets. Son activation pour A ne change pas la politique de B.
- Ni callbacks automatiques ni masquage des seuls messages modèles ne prouvent l'absence de contenu. Inspecter le payload sortant réel, y compris les exports déclenchés indirectement par les bibliothèques.
- Les erreurs de télémétrie ne changent ni la proposition, ni les votes, ni le journal d'actions, ni la capacité de reprise.

## Tests d'intégration, E2E et README

- **Intégration obligatoire :** événements réels, filtre, file et SDK d'export, avec un récepteur de test à la frontière réseau. Inspecter tous les champs effectivement émis, les bornes de file et la réévaluation de politique avant envoi.
- **E2E automatisé obligatoire :** lancer une réunion dans chacun des trois modes, inspecter les sorties réseau, changer la politique avec file en attente et simuler une panne de destination. Vérifier que la réunion et les exports locaux aboutissent.
- **Scénarios rouges prioritaires :** marqueur sensible qui ne doit pas sortir en mode métriques, secret interdit même en diagnostic, payload devenu interdit pendant l'attente. L'essai avec un compte Langfuse réel reste requis pour certifier l'intégration.
- **README :** expliquer clairement les trois modes, le compte personnel facultatif et les flux de données ; mettre à jour les preuves de qualité sans présenter l'application entière comme hors ligne pendant une réunion modèle réelle.

## Validation de sortie

- [ ] Les comportements sont réalisés en TDD-first ; les tests d'intégration/E2E et l'essai réel requis passent ; la section confidentialité du README correspond aux payloads observés.

- [ ] Une réunion complète fonctionne sans compte Langfuse, avec observabilité off et aucun envoi vers ce service.
- [ ] En mode métriques, les événements utiles arrivent sur le compte personnel configuré ; des marqueurs placés dans sources, questions, arguments, chemins et erreurs n'apparaissent dans aucun champ sortant.
- [ ] En mode diagnostic explicitement activé, seuls les contenus autorisés sont présents ; les secrets injectés pour l'essai sont filtrés.
- [ ] Le projet B conserve sa politique lorsque le diagnostic est activé pour A.
- [ ] Une baisse de niveau alors que la file contient des payloads empêche leur envoi non conforme après reprise de connexion.
- [ ] Une panne réseau, un rejet de quota et une erreur Langfuse n'arrêtent pas la décision. La file reste dans ses limites et les pertes sont visibles localement.
- [ ] Estimation, usage fournisseur, quota abonnement et donnée indisponible restent distincts dans les vues locales et cloud.
- [ ] Les règles de quotas et dépassements sont vérifiées et consignées ; aucune promesse de coût nul ne repose sur le seul nom du plan Hobby.

## Preuves et règle de passage

Conserver des payloads de test expurgés pour les trois modes, les captures de trafic pertinentes, le rapport de recherche des marqueurs et les scénarios de file hors ligne. Effectuer un essai de bout en bout avec un compte personnel autorisé.

L'intégration Langfuse est facultative pour chaque utilisateur, mais sa conformité fait partie de la V1 : une intégration activable qui fuit du contenu en mode métriques ne satisfait pas ce plan. Si le compte d'essai manque, conserver le diagnostic local mais marquer le jalon cloud comme non vérifié, pas terminé.

## Limite de cette livraison

Pas de collecte centralisée au bénéfice de BOARDROOM, de gestion complète d'expérimentations ni de classement longitudinal des conseillers. Le diagnostic sert l'utilisation et le support de la réunion.
