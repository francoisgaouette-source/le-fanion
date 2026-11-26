# Copier les données Firestore vers Supabase (Le Fanion)

Les groupes, joueurs, cellulaires, parties, offres de dates, compétitions, terrains et avis sont encore dans Firebase (projet « pelland »).
Sans cette copie, chacun arrive sur « Créer un groupe » après la bascule vers HoldingAI.

1. `anciens-comptes.sql` dans le projet Supabase « Le Fanion » (table `anciens_comptes` + déclencheur sur `liens`).
2. Export : `exporter-firestore.mjs` avec une clé de compte de service Firebase (voir l'en-tête du fichier) → `firestore.json`.
3. Conversion : `node vers-sql.mjs firestore.json` → `import-01.sql`, `import-02.sql`… à exécuter dans l'ordre (SQL Editor ou outil `execute_sql`).
4. Vérifier : nombre de groupes, joueurs et cellulaires dans Supabase = ceux affichés par l'export.
5. Effacer la clé de compte de service (fichier et console Firebase).

Ensuite, chaque joueur qui se connecte avec HoldingAI (avec le cellulaire inscrit dans son groupe) retrouve automatiquement son groupe
(`mes_groupes` / `relier_joueur`), et le déclencheur lui rend ses parties, son avis et son rôle d'administrateur.

Non copié : les comptes Firebase eux-mêmes, les abonnements aux notifications (chacun les réactive) et les marqueurs « groupe gratuit ».

## Fait le 25 novembre 2026, 20 h 30
Copie faite depuis Google Cloud Shell (compte de François, sans clé de service) : 3 groupes (dont « Patate », supprimé),
5 joueurs, 5 cellulaires, 2 parties, 1 terrain, 1 avis, 1 administrateur, 6 anciens comptes. Une présence orpheline
(partie ASSY effacée) a été laissée de côté. La table temporaire `depot_import` a été supprimée.
Vérifié : en se connectant avec HoldingAI, François retrouve son groupe ; ses parties, son avis et son rôle d'administrateur lui sont revenus.
