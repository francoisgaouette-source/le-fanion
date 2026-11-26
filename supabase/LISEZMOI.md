# Le Fanion sur Supabase (remplacement de Firebase)

Projet Supabase **Le Fanion** (`iuoaiambosdpsvsymupz`, ca-central-1), créé le 24 novembre 2026.
`schema.sql` contient tout : tables, règles de sécurité (RLS), déclencheurs et fonctions. Il est déjà appliqué.
Depuis le 25 novembre 2026, l'app en ligne (app.fanion.ai, branche `main`) utilise Supabase et le compte HoldingAI.

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

## Branche `supabase-holdingai` (25 novembre 2026)
Faite, pas encore en ligne (`main` reste sur Firebase) :
- Connexion : « Continuer avec HoldingAI » (`holdingai.js` version 2, identique aux autres apps), menu d'Albert (`porte.js`), plus de codes texto ni de mots de passe Fanion.
- Couche `Store` de `app.js` réécrite pour Supabase (`config.js`). Hors ligne : les parties sont gardées sur le téléphone et envoyées au retour du réseau (file `fanion.file`).
- Fonctions ajoutées à la base : `joueur_maj`, `groupe_maj`, `groupe_etat`, `donnees_maj`, `offre_maj`, `comp_fusion`, `partie_enregistrer`, `mes_groupes` (migration `fonctions_app_fusions`), testées avec des comptes simulés.
- `worker.js` accepte les jetons HoldingAI (textos, notifications, Léo, retour) et lit Supabase ; les jetons Firebase restent acceptés pendant la transition.
- `supabase/console/` : nouvelles versions de `retour-fanion` et `journal-caddie` (projet Notre épicerie) qui acceptent aussi les jetons HoldingAI. À déployer.

## Fait le 25 novembre 2026 (suite)
- Client OAuth « Le Fanion » créé dans HoldingAI Compte (`e075c09b-a84c-453b-9ca1-19c3800af8ae`, public, retour `https://app.fanion.ai/`), noté dans `config.js` et la table `apps`.
- Le Fanion > Third-Party Auth : Custom OIDC, émetteur `https://wwakxuzuhmdmweluafiz.supabase.co/auth/v1`.
- `retour-fanion` et `journal-caddie` (Notre épicerie) déployées : elles acceptent les jetons HoldingAI et Firebase.
- Données Firestore : **pas de migration** (décision de François). Les groupes repartent de zéro sur Supabase.

## Bascule faite (25 novembre 2026)
- `main` est sur Supabase + HoldingAI (GitHub Pages sert app.fanion.ai). Vérifié : connexion, retour, écran « Créer un groupe ».
- Vue iPhone sur ordinateur : la connexion navigue la fenêtre entière (`holdingai.js`), sinon la page de compte refusait de s'afficher dans le cadre.
- Firebase retiré du code : `firebase-config.js` et `firestore.rules` supprimés, `worker.js` n'accepte plus que les jetons HoldingAI et ne lit plus Firestore, messages d'erreur et page de confidentialité corrigés, aide de Léo mise à jour (connexion HoldingAI).

## Reste à faire
1. Mettre en ligne `worker.js` (fanion.ai, Cloudflare « pelland ») s'il n'est pas relié à GitHub.
2. Dans quelques semaines : supprimer le projet Firebase « pelland » (console Firebase → Paramètres du projet → Supprimer).
3. `supabase/console/` : retirer l'acceptation des jetons Firebase de `retour-fanion` et `journal-caddie` (projet Notre épicerie).
