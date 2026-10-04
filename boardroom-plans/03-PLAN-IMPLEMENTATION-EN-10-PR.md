# Plan 03 — Participation humaine en 10 PR

Date : 4 octobre 2026, heure de Bangkok. Base : `main` au commit `ac9111ffc7c7b2ea5508679600628697641f3b5a`, après la fusion de la PR GitHub #21. Statut : **plan proposé, aucune fonctionnalité 03 implémentée par cet audit**. Les numéros ci-dessous sont des incréments, pas des numéros de PR GitHub réservés.

Références : [cahier des charges 03](03-PARTICIPATION-HUMAINE.md), [état des lieux](../docs/etat-des-lieux-2026-10-04.md), [spec §3–5, §7 et §10](BOARDROOM_V1_SPEC.md), [exigences TDD et README](EXIGENCES-TDD-ET-README.md), [acceptation 02](../docs/plan-02-acceptance.md), [ordre de livraison](00-ORDRE-ET-DEPENDANCES.md).

## Résultat produit et préalable

Pendant les analyses, l'humain adresse un conseiller, apporte une information, répond à une demande ou corrige une contrainte. L'intervention est enregistrée une fois et son effet est visible. Seuls les travaux concernés attendent ou sont remplacés ; les autres continuent. L'humain peut suspendre, reprendre, demander une conclusion ou augmenter explicitement ses limites. Le mémo permet de comprendre quelle intervention a changé quelle version et quels avis restent valables.

**Préalable de livraison : accepter réellement 02.** Son code est fusionné et sa CI est verte, mais la réunion complète à trois modèles de deux fournisseurs n'a pas été qualifiée sur comptes réels. Le présent découpage n'abaisse pas cette porte. L'étude et la préparation des tests de 03 peuvent avancer ; l'ordre d'intégration/livraison reste celui du document 00. La campagne 02 et la résolution explicite de ses réserves sont des travaux préalables, pas une onzième PR fonctionnelle cachée dans 03. Cette demande de plan n'autorise aucun appel payant.

## Pourquoi dix PR

Les six tranches du cahier des charges portent des risques distincts : acheminement, attente humaine, changement de version, indépendance des travaux, temps et conclusion. Le pilotage du temps est séparé entre pause et modification des limites. Trois incréments complètent l'ergonomie en flux, la restitution cohérente et la qualification du paquet. Chaque PR livre un comportement observable via le service et la CLI, avec une commande terminal minimale lorsqu'elle est pertinente. Les PR 8–10 ne servent pas à reporter la sécurité ou tous les tests à la fin.

| PR | Titre proposé / résultat observable | Dépendance | Tranche 03 |
| --- | --- | --- | --- |
| 1 | Enregistrer et acheminer une contribution humaine une seule fois | 02 accepté | 1 |
| 2 | Demander une information et gérer réponse, refus ou report | 1 | 2 |
| 3 | Versionner le contexte et rendre obsolètes les seuls travaux affectés | 2 | 3 |
| 4 | Poursuivre les tâches indépendantes avec un scheduler persistant | 3 | 4 |
| 5 | Suspendre et reprendre sans consommer le temps de pause | 4 | 5 |
| 6 | Prolonger explicitement les limites et conserver leur historique | 5 | 5 |
| 7 | Conclure sur une proposition figée et renouveler les avis nécessaires | 6 | 6 |
| 8 | Rendre la participation lisible et robuste dans le terminal en flux | 7 | 1–6, ergonomie |
| 9 | Restituer interventions, dépendances et versions dans les exports | 8 | 1–6, traçabilité |
| 10 | Qualifier le parcours installé et réunir les preuves d'acceptation | 9 | Tous les critères de sortie |

Ordre : `02 accepté → PR1 → PR2 → PR3 → PR4 → PR5 → PR6 → PR7 → PR8 → PR9 → PR10 → acceptation 03`.

Branches proposées : `codex/plan-03-01-contributions` jusqu'à `codex/plan-03-10-qualification`. Suivre le [workflow de PR dépendantes](../docs/contributing.md), garder une pile courte, rebaser/retargeter après fusion et revérifier la base finale. Pas de fusion de 03 avant la porte 02.

## Socle existant à réutiliser et points à changer

| Zone actuelle | Ce qu'elle fournit | Conséquence pour 03 |
| --- | --- | --- |
| `src/application.ts`, `src/domain.ts`, `src/local-database.ts` | Commandes applicatives, événements, transactions courtes et reçus | Rester l'autorité des commandes ; ajouter des modules ciblés plutôt que concentrer tout le scheduler dans `Boardroom` |
| `src/live-domain.ts` et tous les contrats de phase | Contexte figé avec `version: 1` / `contextVersion: 1` | Introduire des versions positives et une lecture compatible des enregistrements v1 ; ne pas confondre version de schéma et version métier |
| `src/live-framing.ts` | Cadrage versionné et approbation exacte, annulée à la correction | Réutiliser le consentement explicite ; ne pas assimiler une modification structurelle à un simple message |
| `src/live-deliberation.ts` | Trois requêtes initiales préparées sans conclusions des autres, réservées atomiquement puis concurrentes | Conserver l'indépendance ; remplacer la seule clé réunion/cadrage par des identités de tâches et tentatives sans rejouer les phases terminées |
| `src/live-debate.ts`, `src/live-decision.ts` | Propositions, objections, avis liés à version/hash, décision distincte | Ajouter dépendances de contexte et invalidation transitive ; aucun résultat tardif ne redevient courant |
| `src/call-control.ts`, `src/call-domain.ts`, `src/reserves.ts` | Réservation avant envoi, arrêt/conclusion, coût inconnu conservé, bornes calculées | Ajouter validité de tâche/tentative, pause et limites révisées ; préserver comptabilité et autorisation à l'admission et au résultat |
| `src/live-terminal-session.ts`, `src/live-terminal.tsx` | Saisie pendant les flux, commandes limitées quand `busy`, rendu sur instantanés publics | Permettre les nouvelles commandes pendant l'attente HTTP ; garder le texte saisi dans React et les effets métier dans le service |
| `qualification/live-decision.mjs`, tests PTY et paquet | Parcours installé sans Node hôte, HTTP remplacé à la frontière externe | Étendre les preuves existantes ; ne jamais ajouter un faux fournisseur activable dans le produit |

## Décisions et invariants communs

Ces choix fixent les comportements ; les noms de modules, types et commandes proposés restent révisables avant la tranche TDD correspondante.

1. **Ordre unique et idempotence durable.** Une commande porte `commandId`, projet/réunion, auteur humain, version attendue et charge utile. Une transaction courte attribue l'ordre, enregistre l'effet et l'événement. Même ID et même charge : même reçu, aucun nouvel effet ; même ID et charge différente : conflit explicite. Deux clients concurrents passent par cette même autorité SQLite. Un accusé reçu n'est affiché qu'après persistance.
2. **Acheminement explicite.** Une contribution ordinaire ne réécrit pas le contexte ni le passé. Elle entre dans le prochain travail admissible du destinataire ; en cours d'appel, elle reste en attente. Si aucun travail ne peut la consommer, le statut le dit. Une contribution sans destinataire vise la discussion commune au prochain point de confrontation. Aucun message d'un pair n'entre dans les premières analyses indépendantes.
3. **Portée déterministe.** Changer question, contrainte, sources sélectionnées ou proposition exige une commande structurelle. Pour un texte libre dont la portée est incertaine, demander une clarification et empêcher une conclusion de le traiter silencieusement comme non matériel. Aucun classement de LLM ne suffit à autoriser une modification. Une déclaration humaine est une information attribuée, pas automatiquement une preuve sourcée.
4. **Versions immuables.** Conserver question, contraintes, passages/hash et proposition d'origine. La version courante est un pointeur métier, jamais une réécriture de l'historique. Un changement structurel publie une version et ses causes avec les invalidations dans la même transaction.
5. **Dépendances explicables.** Chaque tâche déclare les faits, sources, demandes, versions et résultats dont elle dépend avant son envoi. Un changement propage l'invalidation à leurs consommateurs. Dépendances inconnues ou question globale : impact conservateur global, clairement affiché. Une tâche indépendante ancienne peut finir et rester réutilisable uniquement via une preuve de compatibilité persistée des dépendances inchangées ; ne jamais lui attribuer artificiellement la nouvelle version. Une synthèse courante explicite cette réutilisation et ne mélange aucun résultat incompatible.
6. **Annulation et résultat tardif.** L'invalidation retire immédiatement l'éligibilité métier ; l'annulation distante reste best effort. Vérifier tâche, tentative/génération et dépendances à la réservation, juste avant envoi et à la validation du résultat. Une ancienne tentative conserve son reçu et sa provenance, sans réactiver une tâche ni écraser un résultat. Conserver les contenus tardifs effectivement reçus et valides comme historiques ; si le transport ne permet pas de les récupérer, conserver l'issue incertaine sans inventer un contenu ni libérer son coût.
7. **Attente sans accord implicite.** Demandes structurées avec motif, auteur, portée et tâches bloquées. Réponse, refus, report et résolution sont des actes explicites. Le refus conserve l'incertitude ; les travaux qui exigent la réponse restent bloqués, sauf choix humain explicite de continuer avec résultat partiel. Silence, horloge, agent ou texte source ne résolvent rien. Préparer le contrat de 06 sans permission d'outil exécutable.
8. **Temps et argent distincts.** Garder les durées des appels dans leurs reçus et exposer un temps actif de réunion séparé de la pause. Utiliser une horloge monotone injectée, enregistrer les transitions ; la durée cible ne consomme pas les pauses humaines. Les attentes sans travail actif restent exclues comme dans 02. Une pause ferme l'admission de nouveaux appels ; ceux déjà envoyés peuvent se terminer et être conservés s'ils restent valides. Aucun successeur ne démarre avant reprise. Leurs coûts et latences restent comptés même pendant la pause.
9. **Bornes explicites.** Les nouveaux plafonds/durées sont des révisions autorisées par l'humain ; ils ne réécrivent ni les limites originales ni les reçus. Recalculer les réserves nécessaires au travail restant, notamment les nouveaux avis, en gardant dépenses et inconnus engagés. Une prolongation n'est ni consentement de source, ni consentement d'outil, ni résolution d'un appel incertain, ni reprise implicite.
10. **Conclusion et décision séparées.** Figer contexte/proposition/hash au début de la conclusion. Tous les avis courants portent cette même identité. Une modification matérielle rend les avis précédents obsolètes et prépare les nouveaux avis dans les limites déjà autorisées. Si elles ne suffisent pas, produire un résultat partiel motivé et attendre une instruction explicite pour prolonger. La majorité et le silence ne décident jamais à la place de l'humain.
11. **Compatibilité et sécurité.** Les enregistrements de 01/02 restent lisibles. Les nouveaux corps ne vont pas dans les checkpoints techniques, ni les secrets dans les événements. Aucun réseau ou attente humaine dans une transaction. Les nouveaux champs de sortie fournisseur passent la conversion des schémas OpenAI/Anthropic et le preflight. Toute qualification réelle de ces schémas utilise une enveloppe autorisée séparément.

## PR 1 — Contribution reçue et acheminée une seule fois

**Valeur.** Pendant une analyse, envoyer un message au Lead Developer, voir son accusé durable, puis sa remise au point d'intervention approprié.

**Travail.** Introduire l'enveloppe de commande, la boîte de contributions et un reçu public (`queued`, `delivered`, éventuellement `unconsumed` avec motif). Ajouter une commande service/CLI et une entrée terminal minimale `say DESTINATAIRE TEXTE` ou équivalente. Adresser les identités des conseillers de l'équipe figée, sans coder trois rôles dans les nouveaux contrats : les trois conseillers restent le scénario de qualification, conformément à la direction produit décrite dans le guide de contribution. Lier durablement la contribution à l'entrée immuable du travail cible ; un refus d'admission ou une réservation jamais envoyée ne doit pas la faire disparaître comme déjà livrée. La répétition de commande ou la réinspection ne déclenche aucun envoi supplémentaire. Refuser destinataire/projet/version inconnus ; borner texte et filtrer contrôles à l'affichage. Conserver la contribution dans l'inspection/export minimal dès cette PR.

**Tests rouges puis verts.** Pendant un flux HTTP contrôlé : même ID soumis deux fois, un événement, un accusé et une seule présence dans l'entrée du prochain travail ciblé. Deux processus soumettent le même ID ; une seule application. Un même ID avec un autre texte est refusé. Un travail refusé faute de budget laisse sa contribution en attente. Une contribution tardive ne modifie jamais une analyse déjà terminée. Intégration réelle SQLite/graphe et E2E CLI/PTY minimal.

**Sortie.** Réception immédiate observable, statut d'attente honnête, livraison au destinataire prouvée depuis les requêtes capturées. Documentation des commandes et README mis à jour sans annoncer les changements de contexte encore absents.

## PR 2 — Demandes humaines structurées

**Valeur.** Un conseiller explique la clarification ou le document manquant ; l'humain répond, refuse ou remet la réponse à plus tard.

**Travail.** Ajouter des demandes identifiées avec type, motif, portée, références et travaux concernés. Relier leur production aux sorties structurées des conseillers, sans les laisser autoriser une action. Faire évoluer schémas fournisseur, conversion et preflight ensemble. Exposer liste/détail et commandes `answer`, `deny`, `defer` (noms indicatifs), avec version attendue et idempotence. Une réponse ordinaire reprend la portée déclarée ; une réponse structurelle reste explicitement en attente tant que le mécanisme de PR 3 n'est pas livré. Utiliser les identités des travaux et les points d'admission existants pour les attentes simples ; la généralisation des dépendances et de leur propagation suit en PR 3–4. Une demande de document indique la pièce attendue ; sa lecture exige toujours l'autorisation de source existante. Aucune activation web/MCP/commande.

**Tests.** Demande persistée et relue, réponse liée au bon auteur et à la bonne version, refus/report visibles après ouverture d'un autre client. Faire avancer fortement l'horloge ne résout rien. Une réponse périmée ou étrangère à la réunion est refusée. Un modèle ou une source contenant « approuvé » ne résout aucune demande. Vérifier l'absence d'appel outil et la conversion des nouveaux schémas sur les deux adaptateurs.

**Sortie.** Attentes et incertitudes inspectables ; seuls les consommateurs déclarés sont bloqués. Guide des demandes et limites réelles, avec qualification fournisseur toujours distinguée des doublures.

## PR 3 — Changements structurels et invalidation ciblée

**Valeur.** Corriger une contrainte ou la question en conservant l'ancien travail et en voyant immédiatement ce qui devient obsolète.

**Travail.** Introduire des versions de contexte complètes et immuables, en conservant la préparation originale. Faire évoluer tous les `z.literal(1)` métier concernés : contexte live, cadrage, analyses, propositions, avis et appels, sans casser les contrats du replay. Introduire les identités et dépendances minimales des tâches pour cibler l'invalidation ; le scheduler complet suit en PR 4. Publier contexte courant, invalidations, commandes et événements atomiquement. Distinguer changements globaux, changements de source/contrainte et modification de proposition. Vérifier l'autorisation du cadrage courant ; un cadrage matériellement changé attend une nouvelle approbation. Les appels affectés sont annulés ou isolés par génération.

**Tests.** Une contrainte touche exactement deux tâches, leurs consommateurs deviennent obsolètes, la troisième n'est pas invalidée. Une question globale affecte les trois. Ancien résultat avant/après le commit de contexte : pas d'écrasement du courant ; coût connu ou inconnu conservé. Deux changements concurrents sur la même version attendue produisent un gagnant et un conflit lisible. Les données 01/02 rouvertes conservent hashes, versions et décisions.

**Sortie.** L'inspection, les commandes et l'export minimal distinguent courant/ancien avec causes. Aucun travail incompatible n'est présenté comme actuel, même si sa requête distante a fini après l'invalidation.

## PR 4 — Scheduler de tâches et continuation indépendante

**Valeur.** Deux travaux attendent une clarification ou un contexte révisé ; le troisième progresse réellement et peut finir.

**Travail.** Construire un scheduler applicatif persistant sur les identités introduites en PR 3 : états prêt, bloqué, en cours, terminé, obsolète/annulé/incertain avec raisons. Déclarer des dépendances par tâche et propager les invalidations transitives. Découper les nœuds/batches de `LiveDeliberation` et `LiveDebate` qui supposent aujourd'hui une phase monolithique, tout en conservant la réservation atomique du lot initial et l'indépendance des entrées. Chaque tentative possède une identité stable et un propriétaire/génération ; aucun second client ne peut lancer la même tentative. Replanifier seulement les tâches affectées et finançables. Les graphiques transportent des identités ; le service arbitre l'éligibilité. Une issue incertaine n'est pas relancée automatiquement : sa résolution appartient à 04.

**Tests.** Barrières HTTP pilotées : Dev/PO bloqués, Marketing terminé avant la réponse humaine ; aucune nouvelle requête Marketing si ses dépendances sont inchangées. Après une modification globale, aucun conseiller n'est déclaré indépendant. Une analyse initiale ne reçoit ni conclusion d'un pair ni contribution ciblée destinée à un autre. Deux clients tentent de réclamer une tâche ; une seule requête. Graphe/checkpoint en retard ne rend pas une ancienne tentative admissible.

**Sortie.** Les tâches non affectées continuent effectivement ; pas de redémarrage systématique de réunion. L'inspection explique pourquoi chaque tâche attend, s'exécute ou reste réutilisable. Cette propriété est une porte, pas une optimisation reportable.

## PR 5 — Pause et reprise avec horloges honnêtes

**Valeur.** Suspendre pendant une durée mesurée puis reprendre sans consommer la cible pendant la pause.

**Travail.** Ajouter les états/transitions de pause et leur journal, séparés de l'arrêt définitif et de la conclusion. Fermer atomiquement l'admission, garder les appels déjà envoyés comptabilisés, puis réévaluer dépendances et limites à la reprise. Autoriser inspection et réponses pendant la pause sans départ automatique. Exposer temps actif, temps de pause, latences et coût engagé distinctement. Persister les compteurs et identifiants d'horloge ; ne pas soustraire deux horloges monotones de processus différents. Un processus rouvert inspecte l'état sans déclencher une récupération automatique de crash.

**Tests.** Horloge contrôlée : activité, longue pause, reprise ; seule l'activité compte. Pause entre réservation et envoi : l'appel non envoyé ne part pas. Résultat d'un appel déjà envoyé pendant la pause : reçu comptabilisé, aucun successeur ; si son contexte a changé, résultat historique. Deux pauses/reprises répétées avec même ID ne doublent aucun intervalle. Test PTY avec affichage de la pause et saisie toujours disponible.

**Sortie.** Reprise humaine ordinaire utilisable sans confondre pause, stop et incident. Les coûts tardifs ne deviennent jamais zéro sous prétexte de pause.

## PR 6 — Extension explicite du temps et du budget

**Valeur.** À une limite, l'humain voit le manque et peut autoriser de nouveaux plafonds en connaissance de cause.

**Travail.** Ajouter une commande d'extension avec auteur, motif, limites absolues proposées, version attendue et reçu. Conserver les anciennes limites. Recalculer les réserves du travail restant, appliquer les nouvelles limites atomiquement et refuser toute incohérence avec les coûts connus/inconnus déjà engagés. Ne jamais écraser les tarifs des appels précédents. Une extension peut augmenter temps, budget ou les deux ; elle ne reprend pas une pause et ne relance pas une tentative ambiguë. Exposer clairement limite demandée, limite appliquée et solde utilisable.

**Tests.** Atteinte de plafond, silence et suggestion d'agent : aucun changement ni nouvel appel. Extension humaine valide : travail admissible sous nouvelle limite. Répétition et course de deux extensions : aucun double crédit. Coûts inconnus toujours engagés ; réserves insuffisantes et tarifs expirés refusés. CLI/PTY rendent visibles auteur et nouvelles valeurs sans fuite de clés.

**Sortie.** Aucune prolongation automatique ; tout budget/durée additionnel a une autorisation persistée et inspectable. Documentation avec exemple chiffré contrôlé par horloge et tarifs de fixture, sans en faire un prix fournisseur actuel.

## PR 7 — Conclusion actuelle et renouvellement des avis

**Valeur.** Demander de conclure produit des avis sur la proposition actuelle, ou indique précisément pourquoi la conclusion est partielle.

**Travail.** Faire évoluer `requestConclusion` : fermer le travail ordinaire, figer la proposition éligible et orchestrer les avis nécessaires au lieu d'exiger une succession manuelle non guidée. Refuser de qualifier de finale une proposition périmée ou une portée structurelle non clarifiée ; s'il n'existe aucune proposition cohérente, rendre un résultat partiel explicite. Lier chaque collecte à contexte/cadrage/proposition/hash et génération. Après correction matérielle, marquer les avis anciens obsolètes puis planifier les nouveaux uniquement dans l'enveloppe et le consentement fournisseur existants. Si budget/temps/usage inconnu empêche la collecte, garder les avis manquants et la raison ; proposer l'extension sans l'exécuter. Les anciens avis et décisions humaines restent historiques.

**Tests.** Premier avis sur v2, modification v3, second avis v2 tardif : aucun n'est courant sur v3 ; les nouveaux avis lient tous v3/hash. Correction de contrainte avec proposition textuellement identique : invalidation si les dépendances changent. Budget insuffisant pour renouveler : résultat partiel sans faux accord. Conclusion pendant pause : choix humain explicite de passer en conclusion, distinct d'une reprise du débat. Une contribution tardive ne réouvre pas automatiquement une conclusion figée.

**Sortie.** Pas de vote ancien traité comme courant, pas de majorité assimilée à une décision, pas de boucle destinée à fabriquer le consensus. Commandes et README montrent le changement de version et la limite partielle.

## PR 8 — Terminal participatif complet

**Valeur.** L'humain suit les progrès et intervient pendant trois flux sans perdre sa saisie ni les demandes importantes.

**Travail.** Consolider les commandes introduites dans les PR précédentes : choix du destinataire, contributions en attente/remises, demandes avec portée et actions, correction structurelle avec version affichée, pause/reprise, conclusion et extension. Remplacer le filtre global `busy` par l'admissibilité publique du service. Séparer résumé stable, sortie provisoire et détails consultables. Afficher versions, tâches affectées/indépendantes, avis obsolètes, temps actif/pause et coûts connus/inconnus. Conserver la saisie multilignes à travers les rafraîchissements et redimensionnements ; une annulation de brouillon ne supprime jamais une commande déjà persistée. Garder une sortie CLI complète lorsque le terminal est étroit.

**Tests E2E PTY.** Dans un vrai processus : trois flux simultanés → message Dev → demande/réponse → contrainte corrigée → pause/reprise → conclusion. Vérifier accusés, destinataire et versions à l'écran et dans les sorties publiques. Collage CRLF/multiligne, accents, emoji combinés, fenêtres 100×30 / 44×18 / 110×34, annulation de brouillon, Ctrl+C et restauration du terminal. Synchroniser sur événements/écran, pas sur des sleeps arbitraires.

**Sortie.** Parcours complet sans perte de saisie/commande, progression compréhensible même quand une tâche attend. Capture réelle du terminal à dialogue déterministe, clairement étiquetée comme telle.

## PR 9 — Mémo et historique de participation cohérents

**Valeur.** Relire ou exporter la réunion permet de comprendre les interventions et leurs effets sans devoir reconstituer le flux du terminal.

**Travail.** Finaliser la projection stable déjà enrichie à chaque PR : contributions et livraison, demandes/réponses/refus/reports, contextes successifs, impact sur les tâches, résultats tardifs, compatibilités explicites, pauses, extensions et avis courants/obsolètes/manquants. Un mémo lisible résume les changements matériels ; les détails vont dans `meeting.json` et les inspections. Capturer l'instantané métier de façon cohérente avant écriture, préserver intentions/reçus et répertoires exclusifs. Garder les événements techniques sans corps sensibles. Revoir la redaction de tous les nouveaux champs et conserver l'avertissement de relecture avant partage.

**Tests.** Export en concurrence avec changement de contexte, extension ou nouvel avis : un état cohérent identifiable, jamais un mélange. Réouverture restitue la même histoire sans appel ni reprise d'action. Secrets sentinelles dans contributions/demandes et erreurs fournisseur, refus de lecture source, export partiel et échec d'écriture : aucune fuite de clé connue et aucun écrasement. Les sorties 01/02 restent lisibles.

**Sortie.** L'écran, les inspections, le plan, le mémo et le JSON racontent la même version et les mêmes limites. README : exemple court « intervention → contrainte révisée → nouveaux avis », avec lien vers le guide complet.

## PR 10 — Qualification installée et passage du jalon

**Valeur.** Le parcours fonctionne dans le paquet distribué sur les trois cibles et ses limites sont documentées honnêtement.

**Travail déterministe.** Étendre les campagnes existantes Windows x64, Linux x64 et macOS arm64, avec runtime inclus, chemins à espaces/accents, données hors paquet et machine sans Node hôte. Le hook HTTP demeure externe au paquet. Exécuter le parcours PR 8 et les courses essentielles de PR 3–7 dans le candidat. Inclure les commandes publiées et la compatibilité des données antérieures. Mettre à jour guide public, README, registre des affirmations, roadmap, sécurité/confidentialité si le flux de données évolue, et dossier d'acceptation.

**Campagne réelle obligatoire, séparée.** Après comptes, modèles accessibles, sources distribuables et enveloppes de dépense explicitement autorisés : preflight de tous les schémas affectés, réunion à trois modèles/deux fournisseurs, intervention ciblée pendant un flux, réponse à clarification, changement de contrainte, continuation indépendante observée, pause/reprise, conclusion et renouvellement d'avis. Réconcilier usage connu/inconnu et facturation/cancellation dans la limite des informations fournisseurs. Une indisponibilité réelle reste « non vérifié » et bloque l'acceptation correspondante ; elle ne justifie pas de remplacer la preuve par un replay.

**Preuves à conserver.** Commit exact, versions du paquet et de Node, OS/architecture, commandes, résultat attendu/observé, chronologie expurgée avec IDs de commandes/tâches/tentatives/versions, entrées effectivement envoyées, reçus, mémo/plan/JSON, capture VT et transcription lisible. Les entrées enregistrées sont relues avant publication ; les clés ne sont jamais collectées. Conserver le scénario réel distinct de la trace déterministe des courses.

**Sortie.** Toutes les cases du document 03 disposent d'une preuve ; zéro test requis ignoré ou instable sans résolution. Déclarer le jalon accepté seulement après la campagne réelle et la porte 02. La publication bêta, la signature et les actions marketing restent au plan 09 et à leurs autorisations propres.

## Matrice de couverture du cahier des charges

| Exigence de sortie 03 | PR responsable | Preuve déterminante |
| --- | --- | --- |
| TDD-first, intégration/E2E, README fidèle | Chaque PR, clôture 10 | Échecs rouges observés puis verts ; matrice finale |
| Message Dev reçu une fois pendant un flux | 1, 8 | Course de double soumission, requête ciblée capturée, PTY |
| Deux tâches suspendues, une indépendante aboutit | 3–4 | Barrières HTTP et chronologie des trois tâches |
| Nouvelle question globale suspend les travaux dépendants | 3–4 | Invalidation transitive et refus d'admission |
| Réponse ancienne attachée à son contexte | 3–4, 7 | Réponse tardive avant/après changement et reçu conservé |
| Clarification sans blocage global ; refus visible | 2, 4 | Réponse/refus/report, tâche indépendante terminée |
| Pause hors durée cible, coûts engagés visibles | 5 | Horloge injectée et appel finissant pendant la pause |
| Conclusion actuelle ou partielle ; extension explicite | 6–7 | Plafond atteint sans extension automatique ; auteur/limites persistés |
| Modification après avis impose renouvellement | 7 | v2 → v3, anciens avis obsolètes, fonds insuffisants explicites |
| Collage, resize, annulation sans perte | 8 | Vrai PTY sur trois tailles et paquet installé |
| Effets persistés cohérents avec la proposition finale | 9 | Snapshot concurrent, réouverture, mémo/JSON alignés |
| Scénario vivant et chronologie déterministe des courses | 10 | Deux preuves distinctes, aucune qualification simulée |

## Discipline de réalisation et limites

Pour chaque comportement : écrire le test à une frontière publique, l'exécuter et conserver son échec attendu, implémenter le minimum, obtenir le vert, puis passer au suivant. Utiliser les vrais composants internes et des frontières externes contrôlées seulement pour HTTP, horloge et hasard. Toute course importante doit être déclenchée par un événement/barrière observable ; répéter une suite jusqu'à un passage n'est pas une correction.

Contrôles du produit : `npm run typecheck`, `npm test`, packaging et campagne installée. Contrôles du site lorsque touché : `npm run check`, `npm test`, budgets Lighthouse depuis `site/`, puis commandes documentées contre le candidat. Chaque PR rapporte ce qui a réellement été exécuté et les environnements non vérifiés.

Le plan n'ajoute ni récupération guidée après crash, ni réparation d'actions ambiguës (04), ni nouveau moteur de retrieval ou ingestion avancée (05), ni outils web/commandes/MCP et permissions exécutables (06), ni abonnements (07), ni cloud telemetry (08). Il doit cependant conserver dès maintenant les identités, états et reçus que ces plans consommeront. Aucun compte, clé présente sur la machine ou budget de réunion ne vaut autorisation de dépenser pour les essais de développement.
