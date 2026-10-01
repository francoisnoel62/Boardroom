# Plan 05 — Utiliser ses documents et retrouver les décisions

Statut : à réaliser. Dépendances directes : [plan 03](03-PARTICIPATION-HUMAINE.md) pour les contextes, [plan 04](04-REPRISE-ET-INCIDENTS.md) pour la persistance et la reprise. Plans 01–04 acceptés. Suite : [plan 06](06-INVESTIGATIONS-ET-OUTILS-PROTEGES.md). Références : spec §6 et §10. [Ordre général](00-ORDRE-ET-DEPENDANCES.md).

## Ce qui devient utilisable

L'utilisateur attache ses dossiers et documents au projet, mène une réunion documentée, ouvre chaque citation sur sa révision exacte et actualise volontairement les sources. Une réunion suivante peut retrouver des décisions approuvées et des connaissances explicitement retenues, avec leur statut d'origine.

## Entrée

Les instantanés texte de 01–02 et le versionnement de contexte de 03 existent. Les essais de packaging PDF/DOCX et du candidat embeddings de 01 sont disponibles. La lecture de sources est autorisée séparément de la connexion aux modèles et de toute exécution d'outil.

## Tranches d'implémentation, dans cet ordre

Chaque comportement ci-dessous commence par un test rouge, puis son implémentation minimale jusqu'au vert, conformément aux [exigences transversales TDD et README](EXIGENCES-TDD-ET-README.md).

1. **Attacher et préparer.** Ajouter sélection explicite de dossiers/sources et exclusions de projet. Énumérer, extraire et indexer localement, avec progression et limites visibles. Vérifier chemins résolus, liens symboliques/jonctions et frontières de projet avant de lire.
2. **Couvrir les formats V1.** Traiter texte, Markdown, code, PDF textuels et DOCX. Garder lignes/offsets pour le texte, pages physiques pour le PDF et repères stables de section/bloc/paragraphe pour le DOCX. Ne pas inventer les pages Word. Signaler documents scannés, erreurs et extractions incomplètes.
3. **Retrouver les passages pertinents.** Rendre le lexical FTS5 opérationnel, puis ajouter un composant local d'embeddings/classement remplaçable. Exécuter extraction et calcul coûteux hors du chemin principal du terminal. Afficher le mode actif et rester utilisable si les actifs sémantiques sont absents.
4. **Inspecter les preuves.** Ouvrir les passages exacts depuis claims, objections et avis. Montrer identité, version, emplacement d'origine et métadonnées d'extraction. Les modèles reçoivent des passages pertinents ; toute demande complémentaire respecte le même périmètre autorisé.
5. **Actualiser sans effacer.** Détecter un changement de source et le signaler. Seule une actualisation explicite met à jour le contexte de réunion ; elle crée les nouvelles versions et déclenche le traitement structurel de 03. Conserver les anciennes versions utilisées, même si le fichier a été modifié ou déplacé.
6. **Retenir et réutiliser.** Rendre tout l'historique consultable. Séparer ce registre des connaissances sélectionnées pour une réutilisation ultérieure : décisions humaines approuvées et éléments explicitement retenus. Conserver auteur, date, statut, contexte et preuves ; une hypothèse réutilisée reste une hypothèse.

## Contrats et choix à documenter

- Une citation référence une révision précise, un passage et un localisateur exploitable. L'empreinte n'établit pas la vérité du document ni une inviolabilité du disque.
- Une extraction incomplète peut être utilisée seulement avec sa limite visible ; elle ne devient pas une compréhension complète du fichier.
- Évaluer la recherche sur un petit jeu représentatif anglais/français/code avec questions, passages attendus et échecs connus. Il sert aux choix techniques internes, sans créer un benchmark public obligatoire.
- Documenter le modèle local, sa licence, son téléchargement, sa taille, sa consommation CPU/RAM et le comportement sans réseau. Aucun service externe d'extraction/indexation n'est activé implicitement.
- Les désaccords entre sources et les interprétations non résolues restent des données consultables. Le modèle ne peut pas transformer un texte documentaire en permission ou en règle de produit.
- La mémoire est locale et isolée par projet ; une autorisation sur A ne donne pas accès à B. Une décision approuvée par les conseillers seuls n'est pas une décision humaine approuvée.

## Tests d'intégration, E2E et README

- **Intégration obligatoire :** vrais fichiers de chaque format, extraction, instantanés, index et stockage de décisions. Vérifier recherche et résolution des citations via les interfaces publiques, y compris repli lexical et limites d'extraction.
- **E2E automatisé obligatoire :** attacher un corpus depuis le terminal, mener une réunion déterministe, ouvrir une preuve, modifier puis actualiser une source et démarrer une deuxième réunion qui réutilise une décision retenue.
- **Scénarios rouges prioritaires :** aucune fuite entre projets, conservation d'une ancienne citation, hypothèse restant hypothèse, document incomplet signalé. Utiliser de vrais liens/jonctions pour les garanties dépendantes du système de fichiers.
- **README :** présenter les formats, la provenance des preuves, la mémoire locale et le trajet des passages vers les modèles ; illustrer une citation réellement inspectable.

## Validation de sortie

- [ ] Les comportements sont réalisés en TDD-first ; les tests d'intégration/E2E requis passent sur le corpus représentatif et le README décrit les capacités et limites vérifiées.

- [ ] Une même réunion consulte texte, Markdown, code, PDF textuel et DOCX avec citations exactes et limites d'extraction visibles.
- [ ] Un PDF scanné ou un format non pris en charge est signalé ; il n'est pas silencieusement indexé comme document complet.
- [ ] Modifier une source déclenche une notification, sans changer la réunion en cours avant actualisation explicite. Les citations antérieures restent résolubles après celle-ci.
- [ ] Après actualisation pendant un travail, les tâches et avis sont correctement attribués à leur version de contexte.
- [ ] Une recherche sur le projet A, y compris via chemin indirect ou lien, ne retourne aucune source exclue ou appartenant uniquement au projet B.
- [ ] Les requêtes représentatives anglais/français/code trouvent leurs passages utiles ; les limites observées et le choix lexical/sémantique sont documentés.
- [ ] L'absence des actifs embeddings laisse fonctionner le lexical et le terminal. Les documents ne partent vers aucun extracteur ou indexeur cloud par défaut.
- [ ] Une deuxième réunion retrouve une décision humaine retenue avec provenance ; une hypothèse mémorisée conserve son étiquette et ses conditions.
- [ ] Un document contenant une fausse instruction d'autoriser une action ne change aucune règle ni autorisation.

## Preuves et règle de passage

Conserver le jeu documentaire fictif ou autorisé, un rapport d'extraction par format, les questions de retrieval et une démonstration sur deux réunions. Inclure des citations avant/après modification et un cas de sources contradictoires.

Les formats V1, les repères de citations, l'isolation de projet et la mémoire sélective sont bloquants. La présence d'un composant sémantique candidat ne suffit pas : ses coûts locaux et son intérêt doivent être mesurés. L'absence temporaire de ses actifs doit avoir un repli lexical effectif.

## Limite de cette livraison

Pas d'OCR, d'image comme document principal, ni d'interprétation avancée de tableur. Les preuves externes issues de recherche web, commandes et MCP seront intégrées en 06 au même modèle de provenance.
