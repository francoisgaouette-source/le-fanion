# Le Fanion (app.fanion.ai)

- **Ne pas modifier `app.js` directement.** Il est assemblé à partir de `src/` (voir `src/LISEZMOI.md`).
  Modifier les fichiers de `src/commun/` ou `src/golf/`, puis lancer `node outils/assembler.js fanion`
  et envoyer `src/` et `app.js` ensemble.
- `src/commun/` est partagé avec l'app sœur des sports de raquette : ce qui est propre au golf va dans `src/golf/`.
- Après une modification de `app.js`, changer sa version `?v=` dans `index.html` (sinon les téléphones gardent l'ancienne).
