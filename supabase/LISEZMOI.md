# Le Fanion sur Supabase (remplacement de Firebase)

Projet Supabase **Le Fanion** (`iuoaiambosdpsvsymupz`, ca-central-1), créé le 24 novembre 2026.
`schema.sql` contient tout : tables, règles de sécurité (RLS), déclencheurs et fonctions. Il est déjà appliqué.
L'app en ligne utilise encore Firebase : rien ne change pour les joueurs tant que la bascule n'est pas faite.

## Connexion
La personne se connecte avec son **compte HoldingAI** (Third-Party Auth, Custom OIDC). Dans la base,
`moi()` = `auth.jwt()->>'sub'` et `mon_numero()` = son cellulaire confirmé (+1…).
Le lien compte → joueur → groupe est dans `liens` (ancienne collection `auth`). On se relie avec
`relier_joueur(joueur)` : le cellulaire du compte doit être celui du joueur (ou son courriel, pour les anciens comptes).

## Correspondance Firestore → Supabase
| Firestore | Supabase | Remarque |
|---|---|---|
| `players/_groupe_<g>` | `groupes` | forfait (`plan`, `paid_until`, `max_joueurs`) modifiable seulement par Fanion |
| `players/<id>` | `joueurs` | `n_players` du groupe tenu par la base (64 au plus) |
| `auth/<uid>` | `liens` | |
| `phones` | `telephones` | |
| `groupdata` | `donnees_groupe` | |
| `offres` | `offres` | |
| `games` | `parties` | temps réel |
| `presence` | `presences` | temps réel; fusion par `presence_maj` |
| `comps` | `competitions` | temps réel; scores par `comp_score`, champs par `comp_maj` |
| `subs` | `abonnements_push` | |
| `avis` | `avis` | `approved` choisi dans la console seulement |
| `requests` | `demandes` | |
| `admins` | `admins` | |
| `gratuits` | `gratuits` | un seul groupe gratuit par compte |
| `courses` | `terrains` | |
| `terrainsProposes` | `terrains_proposes` | |
| `cartesTerrains` | `cartes_terrains` | |

Le reste de chaque document Firestore est gardé tel quel dans la colonne `data` (jsonb).
Un groupe se crée avec `creer_groupe(groupe, joueur, données du groupe, données du joueur)`.

## Testé (24 novembre 2026)
Création de groupe, compteur de joueurs, un seul groupe gratuit, fusion des présences et des scores,
liaison par cellulaire, forfait protégé, seul le propriétaire ajoute des joueurs, partie protégée et reprise,
un étranger ne voit aucun joueur, téléphone ni partie.

## Reste à faire
1. Brancher HoldingAI : client OAuth dans HoldingAI Compte + Custom OIDC dans ce projet.
2. Réécrire la couche `Store` de `app.js` (≈ 90 appels Firestore) et ajouter une mémoire locale pour le mode hors ligne.
3. Adapter `worker.js` (jetons HoldingAI, lecture Supabase).
4. Exporter Firestore et importer les données; relier les comptes par cellulaire.
5. Basculer, garder Firebase en lecture seule quelques semaines, puis le supprimer (et corriger la page de confidentialité).
