# Le Fanion (app.fanion.ai)

- **Ne pas modifier `app.js` directement.** Il est assemblé à partir de `src/` (voir `src/LISEZMOI.md`).
  Modifier les fichiers de `src/commun/` ou `src/golf/`, puis lancer `node outils/assembler.js fanion`
  et envoyer `src/` et `app.js` ensemble.
- `src/commun/` est partagé avec l'app sœur des sports de raquette (`src/raquette/`) : ce qui est propre au golf va
  dans `src/golf/`. Le tronc commun ne parle aux modules que par `MODULE` et `SPORT`.
- Avant d'envoyer : `node outils/assembler.js raquette` et `node outils/tests-raquette.js` doivent réussir.
- Après une modification de `app.js`, changer sa version `?v=` dans `index.html` (sinon les téléphones gardent l'ancienne).
