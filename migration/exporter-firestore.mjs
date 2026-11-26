// Étape 1 : exporte toutes les données Firestore du Fanion (projet Firebase « pelland ») dans firestore.json.
// À lancer sur un ordinateur, avec une clé de compte de service Firebase (Paramètres du projet > Comptes de service > Générer une clé).
//   npm i firebase-admin
//   GOOGLE_APPLICATION_CREDENTIALS=./cle-pelland.json node exporter-firestore.mjs
// Effacez la clé (fichier et clé dans la console Firebase) une fois la copie terminée.
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { writeFileSync } from 'node:fs';

initializeApp({ credential: applicationDefault(), projectId: 'pelland' });
const db = getFirestore();
const COLLECTIONS = ['players', 'phones', 'auth', 'groupdata', 'offres', 'games', 'presence', 'comps',
  'courses', 'terrainsProposes', 'cartesTerrains', 'avis', 'admins', 'gratuits', 'requests', 'subs'];
// Les dates Firestore deviennent des millisecondes (comme dans l'app)
const plain = v => v instanceof Timestamp ? v.toMillis() : Array.isArray(v) ? v.map(plain)
  : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)])) : v;
const out = {};
for (const c of COLLECTIONS) {
  const snap = await db.collection(c).get();
  out[c] = Object.fromEntries(snap.docs.map(d => [d.id, plain(d.data())]));
  console.log(c.padEnd(18), snap.size, 'documents');
}
writeFileSync('firestore.json', JSON.stringify(out));
console.log('→ firestore.json');
