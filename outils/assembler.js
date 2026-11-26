#!/usr/bin/env node
/* Assemble une app à partir de src/ : node outils/assembler.js [fanion] [--verifier]
   - src/apps/<app>.json donne le fichier de sortie, l'identité de l'app (« marque » → const MARQUE)
     et la liste ordonnée des morceaux (src/commun, src/golf, …).
   - Les morceaux sont mis bout à bout, dans l'ordre, à l'intérieur de la même fonction : ils partagent leurs variables.
   - « page » et « copier » (facultatifs) : pour une app servie à part (ex. dist/raquette/), sa page et les fichiers
     partagés sont copiés à côté de son app.js.
   - --verifier : n'écrit rien ; échoue si le fichier de sortie n'est pas à jour (à lancer avant chaque envoi). */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const args = process.argv.slice(2), verifier = args.includes('--verifier');
const app = args.find(a => !a.startsWith('--')) || 'fanion';
const conf = JSON.parse(fs.readFileSync(path.join(RACINE, 'src', 'apps', app + '.json'), 'utf8'));
const morceaux = conf.fichiers.map(f => {
  const t = fs.readFileSync(path.join(RACINE, 'src', f), 'utf8').replace(/\s+$/, '');
  return f === conf.fichiers[0] ? t : `  // ==== src/${f} ====\n` + t;
});
const entete = `/* Fichier assemblé par outils/assembler.js à partir de src/ (src/apps/${app}.json). Ne pas le modifier directement :\n   modifier les fichiers de src/, puis lancer « node outils/assembler.js ${app} ». */\n`;
// L'identité de l'app (nom, domaine, personnage, textes) : « marque » dans src/apps/<app>.json, lue par le tronc commun
if (conf.marque) morceaux.splice(1, 0, `  // ==== src/apps/${app}.json (marque) ====\n  const MARQUE = Object.freeze(${JSON.stringify(conf.marque)});`);
const texte = entete + morceaux.join('\n') + '\n';
const sortie = path.join(RACINE, conf.sortie);
// App hors de la racine (ex. dist/raquette/) : on y met aussi sa page (src/<page>/) et les fichiers partagés (copier)
function dossierApp() {
  const dos = path.dirname(sortie); fs.mkdirSync(dos, { recursive: true });
  if (conf.page) for (const f of fs.readdirSync(path.join(RACINE, 'src', conf.page))) fs.copyFileSync(path.join(RACINE, 'src', conf.page, f), path.join(dos, f));
  for (const f of conf.copier || []) fs.copyFileSync(path.join(RACINE, f), path.join(dos, path.basename(f)));
  // Chaque fichier de l'app reçoit ?v=<empreinte> dans index.html : le téléphone prend la nouvelle version dès qu'il change
  const page = path.join(dos, 'index.html');
  if (fs.existsSync(page)) fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replace(/(src|href)="([\w.-]+\.(?:js|css))"/g, (m, a, f) =>
    fs.existsSync(path.join(dos, f)) ? `${a}="${f}?v=${require('crypto').createHash('sha1').update(fs.readFileSync(path.join(dos, f))).digest('hex').slice(0, 10)}"` : m));
}
if (verifier) {
  const actuel = fs.existsSync(sortie) ? fs.readFileSync(sortie, 'utf8') : '';
  if (actuel !== texte) { console.error(`${conf.sortie} n'est pas à jour avec src/ : lancer « node outils/assembler.js ${app} ».`); process.exit(1); }
  console.log(`${conf.sortie} est à jour.`);
} else {
  fs.mkdirSync(path.dirname(sortie), { recursive: true });
  fs.writeFileSync(sortie, texte);
  if (conf.page || conf.copier) dossierApp();
  console.log(`${conf.sortie} assemblé : ${conf.fichiers.length} morceaux, ${texte.split('\n').length - 1} lignes.`);
}
