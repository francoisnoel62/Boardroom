# Plan 06 — Investiguer avec des permissions effectives

Statut : à réaliser. Dépendances directes : [03](03-PARTICIPATION-HUMAINE.md) pour l'attente et les dépendances, [04](04-REPRISE-ET-INCIDENTS.md) pour le journal et la reprise, [05](05-CONNAISSANCE-ET-MEMOIRE.md) pour les sources et preuves. Plans 01–05 acceptés. Suite : [plan 07](07-PREMIERE-UTILISATION-ET-CONNEXIONS.md). Références : spec §3, §5–7 et §10. [Ordre général](00-ORDRE-ET-DEPENDANCES.md).

## Ce qui devient utilisable

Un conseiller explique l'information ou l'action dont il a besoin. L'utilisateur peut autoriser une recherche web, une création d'artefact, une commande protégée ou un outil MCP compatible. Il peut refuser ou mémoriser une règle étroite. La réunion continue sur les tâches indépendantes et les originaux restent préservés.

## Entrée et portée

Reprendre le rapport d'isolation de 01 et revérifier les capacités réelles des environnements cibles. Une API de fournisseur, une description MCP ou un prompt ne constituent pas une frontière de permission.

Construire d'abord des actions dont l'accès peut être effectivement contrôlé, puis ajouter commandes et MCP par adaptateur validé. Les fonctions indisponibles restent bloquées, avec configuration guidée seulement lorsqu'elles deviennent utiles. La réunion, les lectures autorisées et les investigations disponibles continuent.

## Tranches d'implémentation, dans cet ordre

Chaque comportement ci-dessous commence par un test rouge, puis son implémentation minimale jusqu'au vert, conformément aux [exigences transversales TDD et README](EXIGENCES-TDD-ET-README.md).

1. **Demander puis consentir.** Formaliser type d'action, but, cible, arguments pertinents, accès fichiers/réseau, sorties prévues et dépendances. Afficher « une fois », « mémoriser une règle limitée à ce projet » et « refuser ». Rendre les règles consultables et révocables.
2. **Faire exécuter par un intermédiaire unique.** Le broker prépare une action identifiée, vérifie la portée puis contrôle de nouveau l'autorisation au moment de l'exécution. Les agents ne détiennent pas un chemin de contournement vers les adaptateurs. Une autorisation révoquée, périmée ou trop étroite bloque l'envoi.
3. **Créer des preuves et artefacts sûrs.** Livrer la recherche web autorisée et la création de nouveaux fichiers dans un espace de sortie distinct. Enregistrer requête, cible, date, résultat consulté et provenance. Les passages capturés deviennent des preuves versionnées inspectables ; la date d'accès d'une page ne vaut pas validation de sa véracité.
4. **Ajouter les commandes par OS.** Imposer des bornes effectives aux lectures, écritures, processus enfants et accès réseau selon l'action. La copie de travail n'est qu'un support : vérifier qu'un processus ne peut pas atteindre ou modifier les originaux ailleurs sur la machine. Détecter les prérequis manquants sans ouvrir une exécution non protégée.
5. **Ajouter les MCP par environnement.** Pour un serveur local, contrôler lancement, environnement, accès et capacités effectives ; pour un serveur distant, vérifier autorisations, identifiants et portée des opérations côté service. Un serveur arbitraire ne devient pas disponible sur simple branchement. Bloquer les opérations dont la portée ou la préservation des originaux ne peut pas être garantie.
6. **Intégrer attente, annulation et reprise.** Enregistrer décisions et reçus via 04. Un refus n'arrête que le travail dépendant. Lors d'une interruption ambiguë, inspecter/résoudre avant de permettre une nouvelle exécution. Une révocation bloque les nouveaux départs ; les limites d'annulation d'une action déjà engagée restent visibles.

## Invariants d'exécution

- Les documents originaux, locaux ou accessibles par une intégration, ne sont jamais écrasés ou supprimés. L'action autorisée peut créer un fichier distinct ou travailler sur une copie ; le consentement n'annule pas cet invariant.
- L'autorisation de connexion fournisseur, l'autorisation de source et celle d'outil restent séparées. Aucun identifiant disponible dans l'environnement ne devient implicitement accessible à un outil.
- Les règles mémorisées sont liées au projet, au type d'action et à des cibles bornées. Une action matériellement différente demande une nouvelle décision.
- Résoudre les chemins et vérifier les liens/jonctions au bon moment. Ne pas limiter les contrôles à une comparaison textuelle de chemins avant exécution.
- Un conseiller, un résultat d'outil et un texte distant ne peuvent pas répondre à une demande de consentement humain.
- Les adaptateurs abonnement/native-agent de 07 devront passer par cette frontière ou démontrer des restrictions équivalentes ; leur boucle d'outils ne dispose pas d'une exemption.

## Tests d'intégration, E2E et README

- **Intégration obligatoire :** broker + règles + journal + adaptateurs réels disponibles. Tester révocation entre préparation et exécution, portée par projet et protections des fichiers/réseau avec de vrais processus et cibles temporaires sur chaque OS concerné.
- **E2E automatisé obligatoire :** dans le terminal, refuser une action, continuer le travail indépendant, autoriser une création distincte, révoquer une règle puis vérifier le blocage suivant. Couvrir l'absence d'isolation et une reprise d'action ambiguë.
- **Essais réels obligatoires :** chaque commande et MCP déclaré supporté doit prouver ses restrictions dans son environnement. Une doublure de sandbox ou de serveur ne certifie aucune préservation d'originaux.
- **README :** rendre la politique de permissions compréhensible, montrer une demande concrète et publier la matrice effective des capacités avec ses prérequis.

## Validation de sortie

- [ ] Les comportements sont réalisés en TDD-first ; les tests d'intégration/E2E et les essais réels d'isolation requis passent ; le README reflète les protections démontrées.

- [ ] Un besoin d'information produit une demande exploitable avec action, but, arguments et portée lisibles.
- [ ] Autorisation ponctuelle, règle mémorisée, refus et révocation produisent les comportements attendus ; une règle de A n'autorise aucune action dans B.
- [ ] Une action préparée sous une règle puis exécutée après révocation est bloquée par le contrôle à l'exécution.
- [ ] Un refus de commande laisse continuer une analyse indépendante ; silence et timeout ne lancent jamais l'action.
- [ ] Une recherche web réelle alimente une objection puis une révision de proposition avec preuve consultable et provenance.
- [ ] Pour chaque adaptateur déclaré disponible, des tentatives contrôlées d'écriture hors périmètre, par chemin direct, lien et processus enfant échouent ; les empreintes des originaux restent identiques.
- [ ] Les tests réseau respectent les bornes déclarées. Les MCP locaux et distants disposent de preuves distinctes de celles du shell.
- [ ] Sur un OS sans isolation configurée, l'outil reste bloqué, la réunion fonctionne et l'aide est proposée au moment du besoin.
- [ ] Une interruption réelle d'adaptateur après effet et avant reçu ne produit pas de répétition aveugle à la reprise.
- [ ] Une instruction malveillante issue d'un document ou résultat d'outil ne modifie ni les règles ni les autorisations.

## Preuves et règle de passage

Fournir une matrice OS × adaptateur × protection × prérequis × résultat, les essais négatifs de préservation et un parcours utilisateur complet demande → décision → résultat → preuve → proposition.

Le broker, les règles révocables, les actions effectivement disponibles et le repli sans isolation sont bloquants. Chaque commande/MCP annoncé disponible doit passer ses essais réels. Un adaptateur impossible à protéger est livré avec statut indisponible et motif précis, conformément au repli prévu par la spec ; il n'est pas remplacé par un mode moins sûr.

## Limite de cette livraison

Les outils servent à examiner la décision et créer des artefacts autorisés. Ce plan ne crée ni agents autonomes de mise en œuvre, ni exécution automatique des recommandations, ni système de suivi d'expérimentations.
