#!/usr/bin/env node
/* Tests de la logique du module raquette (règles des six sports, rotations) : node outils/tests-raquette.js */
'use strict';
const fs = require('fs'), path = require('path'), assert = require('assert');
const src = ['regles.js', 'rotation.js'].map(f => fs.readFileSync(path.join(__dirname, '..', 'src', 'raquette', f), 'utf8')).join('\n');
const R = new Function(src + '\nreturn { SPORTS, SPORTS_ORDRE, regleDe, texteRegle, verifierPointage, classementSoiree, cleResultat, preparerManches, historiqueDe, manchesConseillees };')();
let n = 0; const t = (nom, f) => { f(); n++; };

t('six sports', () => assert.deepStrictEqual(R.SPORTS_ORDRE.sort(), Object.keys(R.SPORTS).sort()));
t('pickleball à 11', () => {
  const r = R.regleDe('pickleball');
  for (const [a, b, ok] of [[11, 9, true], [11, 0, true], [12, 10, true], [15, 13, true], [11, 10, false], [10, 8, false], [13, 10, false], [9, 11, true]]) assert.strictEqual(R.verifierPointage(r, a, b).ok, ok, `${a}-${b}`);
  assert.strictEqual(R.verifierPointage(r, 9, 11).gagnant, 1);
  assert.strictEqual(R.verifierPointage(r, 11, 11).gagnant, -1);
});
t('badminton plafond 30', () => {
  const r = R.regleDe('badminton');
  for (const [a, b, ok] of [[21, 19, true], [22, 20, true], [30, 29, true], [29, 27, true], [30, 28, true], [31, 29, false]]) assert.strictEqual(R.verifierPointage(r, a, b).ok, ok, `${a}-${b}`);
  assert.strictEqual(R.verifierPointage(R.regleDe('badminton', 15), 16, 15).ok, false); // pas de plafond pour une manche à 15
});
t('tennis et padel en jeux', () => {
  for (const s of ['tennis', 'padel']) {
    const r = R.regleDe(s);
    for (const [a, b, ok] of [[6, 4, true], [6, 0, true], [7, 5, true], [7, 6, true], [6, 5, false], [8, 6, false], [5, 3, false]]) assert.strictEqual(R.verifierPointage(r, a, b).ok, ok, `${s} ${a}-${b}`);
  }
  const r4 = R.regleDe('tennis', 4);
  for (const [a, b, ok] of [[4, 2, true], [5, 3, true], [5, 4, true], [4, 3, false]]) assert.strictEqual(R.verifierPointage(r4, a, b).ok, ok, `set à 4 ${a}-${b}`);
});
t('squash et tennis de table à 11', () => { for (const s of ['squash', 'tennisTable']) assert.ok(R.verifierPointage(R.regleDe(s), 13, 11).ok); });
t('textes', () => { assert.strictEqual(R.texteRegle(R.regleDe('badminton')), 'Manche à 21, gagner par 2, maximum 30'); assert.strictEqual(R.texteRegle(R.regleDe('tennis')), 'Set à 6 jeux, bris d’égalité à 6-6'); });

const ids = n => Array.from({ length: n }, (_, i) => 'j' + (i + 1));
const verifier = (manches, joueurs, terrains, mode) => manches.forEach((m, k) => {
  const vus = [...m.repos]; m.matchs.forEach(x => vus.push(...x.a, ...x.b));
  assert.deepStrictEqual(vus.slice().sort(), joueurs.slice().sort(), 'manche ' + k + ' : chacun une seule fois');
  assert.ok(m.matchs.length <= terrains);
  m.matchs.forEach((x, i) => { assert.strictEqual(x.terrain, i + 1); assert.strictEqual(x.a.length, mode === 'simple' ? 1 : 2); });
});
t('double, 12 joueurs, 3 terrains : personne ne se repose, aucun partenaire répété sur 5 manches', () => {
  const j = ids(12), m = R.preparerManches({ joueurs: j, terrains: 3, mode: 'double', nombre: 5, graine: 'a' });
  verifier(m, j, 3, 'double'); m.forEach(x => assert.strictEqual(x.repos.length, 0));
  const h = R.historiqueDe(m); assert.ok(Object.values(h.partenaires).every(v => v === 1), 'partenaires répétés');
});
t('double, 14 joueurs, 3 terrains : repos à tour de rôle (écart d’au plus 1)', () => {
  const j = ids(14), m = R.preparerManches({ joueurs: j, terrains: 3, mode: 'double', nombre: 7, graine: 'b' });
  verifier(m, j, 3, 'double');
  const h = R.historiqueDe(m), r = j.map(id => h.repos[id] || 0);
  assert.strictEqual(r.reduce((a, b) => a + b), 14); assert.ok(Math.max(...r) - Math.min(...r) <= 1, r.join(','));
  // personne ne se repose deux manches de suite
  m.slice(1).forEach((x, k) => x.repos.forEach(id => assert.ok(!m[k].repos.includes(id), 'repos de suite : ' + id)));
});
t('double, 9 joueurs, 4 terrains : 2 matchs, 1 au repos', () => {
  const j = ids(9), m = R.preparerManches({ joueurs: j, terrains: 4, mode: 'double', nombre: 9, graine: 'c' });
  verifier(m, j, 4, 'double'); m.forEach(x => { assert.strictEqual(x.matchs.length, 2); assert.strictEqual(x.repos.length, 1); });
  assert.strictEqual(new Set(m.map(x => x.repos[0])).size, 9);
});
t('simple, 7 joueurs, 2 terrains', () => { const j = ids(7), m = R.preparerManches({ joueurs: j, terrains: 2, mode: 'simple', nombre: 6, graine: 'd' }); verifier(m, j, 2, 'simple'); });
t('trop peu de joueurs', () => { const m = R.preparerManches({ joueurs: ids(3), terrains: 2, mode: 'double', nombre: 2 }); assert.strictEqual(m[0].matchs.length, 0); assert.strictEqual(R.manchesConseillees(3, 2, 'double'), 0); });
t('même graine, mêmes manches', () => {
  const a = R.preparerManches({ joueurs: ids(10), terrains: 2, mode: 'double', nombre: 4, graine: 'x' });
  const b = R.preparerManches({ joueurs: ids(10).reverse(), terrains: 2, mode: 'double', nombre: 4, graine: 'x' });
  assert.deepStrictEqual(a, b);
});
t('arrivée en retard : les manches commencées restent, les suivantes incluent le nouveau', () => {
  const j = ids(8), m = R.preparerManches({ joueurs: j, terrains: 2, mode: 'double', nombre: 4, graine: 'e' });
  const j2 = j.concat(['retard']), m2 = R.preparerManches({ joueurs: j2, terrains: 2, mode: 'double', nombre: 4, deja: m.slice(0, 2), graine: 'e' });
  assert.deepStrictEqual(m2.slice(0, 2), m.slice(0, 2)); verifier(m2.slice(2), j2, 2, 'double');
});
t('classement de soirée', () => {
  const s = { joueurs: ['a', 'b', 'c', 'd'], manches: [{ matchs: [{ terrain: 1, a: ['a', 'b'], b: ['c', 'd'] }], repos: [] }, { matchs: [{ terrain: 1, a: ['a', 'c'], b: ['b', 'd'] }], repos: [] }] };
  const c = R.classementSoiree(s, { 'r0-0': { a: 11, b: 5 }, 'r1-0': { a: 9, b: 11 } });
  assert.deepStrictEqual(c.map(x => x.id), ['b', 'a', 'd', 'c']);
  assert.deepStrictEqual([c[0].gagnees, c[0].ecart], [2, 8]);
});
console.log(`${n} tests réussis.`);
