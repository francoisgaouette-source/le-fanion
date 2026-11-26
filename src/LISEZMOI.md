# Code source de l'app (src/)

`app.js` à la racine n'est plus écrit à la main : il est **assemblé** à partir des fichiers de ce dossier.

```
node outils/assembler.js fanion              # refait app.js
node outils/assembler.js fanion --verifier   # vérifie que app.js est à jour (aussi fait par GitHub à chaque envoi)
```

## Les dossiers

- `commun/` : le tronc commun, partagé avec les apps sœurs (dont l'app des sports de raquette) : démarrage,
  base de données (groupes, joueurs, banque, présences, offres de dates, avis, notifications), compte HoldingAI,
  rôles, forfaits et parrainage, accueil des nouveaux, boucle de retour (idées), Léo, textos et notifications.
- `golf/` : le module golf : terrains et cartes, parties, jeux, quatuors, pointage, compétitions, impressions.
- `apps/<app>.json` : pour chaque app, le fichier produit et la **liste ordonnée** des morceaux.

## Comment ça marche

Les morceaux sont mis bout à bout dans une seule fonction : ils partagent toutes leurs variables, comme avant
dans le gros `app.js`. L'ordre de la liste compte pour ce qui s'exécute au chargement (constantes, écouteurs) :
c'est l'ordre d'origine, golf et commun entremêlés. Les déclarations `function` peuvent être dans n'importe quel
morceau (elles sont hissées).

Le module golf ajoute ses méthodes de base de données (`Object.assign(Store, …)` dans `golf/donnees.js`) et ses
écrans (`Object.assign(bind, …)` dans `golf/liaisons.js`).

## Ce qui reste mêlé (à démêler aux étapes 2 et 3)

- `commun/etat.js` : `render()` connaît les écrans du golf ; `go()` a des cas propres au golf ; « responsable de
  partie » (`myIdx`, `isOwner`).
- `commun/base.js` : `Store.init` envoie la file d'attente des parties (`flush`, défini dans le golf).
- `commun/demarrage.js` : le premier chargement lit les terrains, quatuors et jeux.
- `commun/offres.js`, `commun/feuilles.js`, `commun/leo.js`, `commun/caddie.js` : textes qui parlent de golf.
- `logic.js` (calculs du golf et analyse vocale) et `styles.css` ne sont pas encore découpés.
