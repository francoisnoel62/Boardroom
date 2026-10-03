# Plan 03 — Participer à la réunion pendant son déroulement

Statut : à réaliser. Dépendance : [plan 02](02-PREMIERE-DECISION-REELLE.md) accepté. Suite : [plan 04](04-REPRISE-ET-INCIDENTS.md). Références : spec §3–5, §7 et §10. [Ordre général](00-ORDRE-ET-DEPENDANCES.md).

## Ce qui devient utilisable

L'utilisateur peut adresser un conseiller, ajouter un fait, répondre à une question, corriger une contrainte, suspendre la réunion et demander une conclusion. La réunion réagit à ces interventions sans mélanger des travaux fondés sur des contextes différents.

## Entrée

Le parcours complet de 02 fonctionne et expose événements, versions et limites au service applicatif. Le terminal reste capable de recevoir une saisie pendant les flux. Il faut rendre explicites les dépendances des travaux pour éviter que toute demande utilisateur arrête inutilement les trois conseillers.

## Tranches d'implémentation, dans cet ordre

Chaque comportement ci-dessous commence par un test rouge, puis son implémentation minimale jusqu'au vert, conformément aux [exigences transversales TDD et README](EXIGENCES-TDD-ET-README.md).

1. **Acheminer une contribution ordinaire.** Ajouter une commande applicative d'intervention avec identifiant, auteur, destinataire éventuel et contexte. Afficher immédiatement sa prise en compte ; l'insérer au prochain point approprié plutôt que perturber une intervention déjà terminée.
2. **Formuler une demande exploitable.** Représenter une clarification ou un document manquant comme une demande structurée avec motif, portée et travaux concernés. Permettre une réponse, un refus ou une résolution ultérieure. Une réponse modifie le contexte uniquement selon sa portée effective.
3. **Traiter un changement structurel.** Un changement de question, contrainte ou proposition crée une nouvelle version du contexte. Identifier les tâches affectées, suspendre leur progression, annuler ou isoler leurs appels en cours, puis les replanifier. Conserver l'ancien travail avec sa version et son statut devenu obsolète.
4. **Continuer le travail indépendant.** Ajouter au scheduler les relations de dépendance entre tâches, sources, demandes et versions. Un conseiller qui n'attend pas la réponse peut continuer. Pour un changement global, toutes les tâches concernées sont suspendues, sans prétendre qu'il reste un travail indépendant.
5. **Piloter le temps.** Exposer suspension, reprise, conclusion et prolongation explicite. La durée cible exclut les pauses demandées par l'humain. Une pause cesse la planification ; les appels déjà envoyés et les éventuels coûts tardifs restent comptabilisés honnêtement.
6. **Renouveler les avis au bon moment.** La conclusion fige une proposition actuelle. Une correction matérielle après un avis impose de nouveaux avis sur la version révisée. Si le budget ne permet pas de les obtenir, afficher une conclusion partielle.

## Contrats et règles

- Le service applicatif est seul responsable de l'ordre des commandes. Un identifiant d'intervention empêche une double application accidentelle lors d'une répétition de saisie ou d'une reconnexion.
- La classification « structurel » ne dépend pas exclusivement d'un jugement opaque du modèle : les commandes explicites sont déterministes, et une portée incertaine est clarifiée avant d'utiliser l'ancien contexte pour une décision.
- Les résultats arrivant tard conservent leur contexte d'origine. Ils ne réactivent pas une tâche annulée et ne remplacent pas la proposition courante.
- Une demande en attente a une portée, un statut et des tâches bloquées visibles. Préparer ce contrat pour les permissions de 06 sans rendre un outil exécutable prématurément.
- Aucune durée écoulée, suggestion d'agent ou absence de réponse ne résout une demande à la place de l'humain.
- Une extension enregistre les nouvelles limites autorisées et leur auteur ; atteindre une limite ne déclenche pas l'extension.
- Les résumés et l'état d'avancement restent lisibles pendant la saisie. Les sources et détails restent accessibles sans noyer la conversation.

## Tests d'intégration, E2E et README

- **Intégration obligatoire :** commandes d'intervention + scheduler + graphe + persistance, avec temps et réponses externes contrôlés. Vérifier changement de contexte, dépendances, réponse tardive, avis obsolète, pause et extension via les événements et états publics.
- **E2E automatisé obligatoire :** pendant un flux du terminal, saisir une contribution, modifier une contrainte, suspendre/reprendre et conclure. Vérifier à l'écran et dans le mémo les effets et les versions ; couvrir collage multiligne et redimensionnement lorsqu'ils sont modifiés.
- **Scénarios rouges prioritaires :** une réponse ancienne ne remplace pas la proposition actuelle ; une attente humaine n'autorise rien ; une tâche indépendante continue. Synchroniser sur les événements observables plutôt que sur des temporisations arbitraires.
- **README :** montrer la participation humaine et le changement de proposition avec un exemple court et un lien vers les commandes détaillées.

## Validation de sortie

- [ ] Les comportements sont réalisés en TDD-first ; les tests d'intégration/E2E requis passent et le README reflète les interventions effectivement disponibles.

- [ ] Pendant une analyse en streaming, un message adressé au Lead Developer est reçu une seule fois et présenté au bon destinataire au point prévu.
- [ ] Une nouvelle contrainte affectant deux tâches suspend ces deux tâches tandis qu'un travail réellement indépendant peut aboutir.
- [ ] Un changement de question affectant toute la réunion suspend bien l'ensemble des travaux dépendants.
- [ ] Un résultat reçu après le changement de contexte reste attribué à l'ancienne version et n'est pas utilisé comme résultat courant.
- [ ] Une clarification en attente ne bloque pas les tâches indépendantes ; refuser de répondre laisse visible l'incertitude correspondante.
- [ ] Suspendre pendant une durée mesurée ne consomme pas la durée cible. L'interface distingue temps actif, pause et coût éventuellement déjà engagé.
- [ ] Demander la conclusion produit les avis actuels ou un résultat partiel ; prolonger n'est possible qu'après une instruction explicite de l'utilisateur.
- [ ] Une modification de proposition après un premier avis rend son ancienneté visible et déclenche les avis nécessaires sur la nouvelle version.
- [ ] Collage multiligne, redimensionnement et annulation de saisie ne perdent pas les interventions déjà enregistrées.

## Preuves et règle de passage

Conserver un scénario vivant d'intervention et une chronologie déterministe pour les courses entre nouveau contexte, annulation et réponse tardive. La chronologie doit montrer les versions et tâches concernées, pas seulement une capture du terminal.

Le jalon est accepté lorsque les interventions et leurs effets sont observables, persistés et cohérents avec la proposition finale. Une implémentation qui redémarre systématiquement toute la réunion ne satisfait pas la continuation du travail indépendant.

## Limite de cette livraison

La cohérence est assurée pendant une exécution normale. Le parcours utilisateur de récupération après crash et les choix complets face aux pannes fournisseurs arrivent en 04. Les permissions et outils réels arrivent en 06.
