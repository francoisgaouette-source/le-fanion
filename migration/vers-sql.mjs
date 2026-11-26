// Étape 2 : transforme firestore.json en fichiers SQL pour le projet Supabase « Le Fanion ».
//   node vers-sql.mjs firestore.json   → import-01.sql, import-02.sql…
// Les fichiers désactivent les déclencheurs des tables le temps de l'import (dans une transaction),
// n'écrasent rien (on conflict do nothing) et se rejouent sans danger.
// Les comptes changent (Firebase → HoldingAI) : on garde l'ancien identifiant Firebase de chaque joueur dans
// anciens_comptes ; au premier lien du joueur avec son compte HoldingAI, ses parties, son avis, etc. lui reviennent
// (voir anciens-comptes.sql, à appliquer AVANT l'import).
import { readFileSync, writeFileSync } from 'node:fs';
const F = JSON.parse(readFileSync(process.argv[2] || 'firestore.json', 'utf8'));
const q = v => v == null ? 'null' : "'" + String(v).replace(/'/g, "''") + "'";
const j = v => q(JSON.stringify(v ?? {})) + '::jsonb';
const n = v => Number.isFinite(+v) && v !== null && v !== '' ? String(Math.round(+v)) : 'null';
const b = v => v ? 'true' : 'false';
const arr = v => "array[" + (Array.isArray(v) ? v.map(q).join(',') : '') + "]::text[]";
const digits = p => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? d : ''; };
const rows = []; const add = (table, cols, vals, conflict) => rows.push(`insert into ${table} (${cols}) values (${vals.join(', ')}) on conflict ${conflict || ''} do nothing;`);
const E = c => Object.entries(F[c] || {});
const compte = { groupes: 0, joueurs: 0, telephones: 0, parties: 0 };

// Groupes : players/_groupe_<g>
for (const [id, d] of E('players').filter(([id]) => id.startsWith('_groupe_'))) {
  const g = id.slice(8); const { owner, organizers, plan, paidUntil, maxJoueurs, nPlayers, archived, deleted, ...rest } = d;
  add('groupes', 'id, owner, organizers, plan, paid_until, max_joueurs, n_players, archived, deleted, data',
    [q(g), q(owner || ''), arr(organizers), q(plan || ''), n(paidUntil), n(maxJoueurs) === 'null' ? '0' : n(maxJoueurs), n(nPlayers) === 'null' ? '0' : n(nPlayers), b(archived), b(deleted), j({ ...rest, id: g })]); compte.groupes++;
}
// Le groupe d'origine « pelland » n'a parfois pas de document _groupe_
if (!F.players?.['_groupe_pelland'] && E('players').some(([id, d]) => !id.startsWith('_groupe_') && (d.groupId || 'pelland') === 'pelland'))
  add('groupes', 'id, owner, organizers, plan, max_joueurs, n_players, archived, deleted, data', [q('pelland'), q(''), arr([]), q(''), '0', '0', 'false', 'false', j({ id: 'pelland', name: 'La gang à Pelland' })]);
// Joueurs
for (const [id, d] of E('players').filter(([id]) => !id.startsWith('_groupe_'))) {
  const { groupId, acct, authEmail, phone, ...rest } = d;
  add('joueurs', 'id, group_id, auth_email, acct, data', [q(id), q(groupId || 'pelland'), q(''), q(''), j({ ...rest, id, groupId: groupId || 'pelland' })]); compte.joueurs++;
}
// Cellulaires (pour que chacun retrouve son groupe en se connectant avec HoldingAI)
for (const [id, d] of E('phones')) {
  const p = digits(d.phone || d.number || d.tel); if (!p) continue;
  const g = d.groupId || (F.players?.[id] || {}).groupId || 'pelland';
  add('telephones', 'player_id, group_id, phone, e164', [q(id), q(g), q(p), q('+1' + p)], '(player_id)'); compte.telephones++;
}
// Anciens comptes Firebase → joueur
for (const [uid, d] of E('auth')) if (d.playerId) add('anciens_comptes', 'fb_uid, player_id', [q(uid), q(d.playerId)], '(fb_uid)');
for (const [g, d] of E('groupdata')) add('donnees_groupe', 'group_id, data', [q(g), j(d)]);
for (const [id, d] of E('offres')) add('offres', 'id, group_id, data', [q(id), q(d.groupId || 'pelland'), j(d)]);
for (const [id, d] of E('games')) { add('parties', 'id, group_id, owner_uid, data', [q(id), q(d.groupId || 'pelland'), q(d.ownerUid || ''), j(d)]); compte.parties++; }
for (const [id, d] of E('presence')) add('presences', 'game_id, data', [q(id), j(d)]);
for (const [id, d] of E('comps')) { const { scores, ...rest } = d; add('competitions', 'id, group_id, data, scores', [q(id), q(d.groupId || 'pelland'), j(rest), j(scores || {})]); }
for (const [id, d] of E('courses')) add('terrains', 'id, data', [q(id), j({ ...d, id })]);
for (const [id, d] of E('terrainsProposes')) add('terrains_proposes', 'id, groupe, propose_uid, statut, data', [q(id), q(d.groupe || ''), q(d.proposeUid || ''), q(d.statut || 'propose'), j(d)]);
for (const [id, d] of E('cartesTerrains')) add('cartes_terrains', 'course_id, photos, cree', [q(id), j(d.photos || []), n(d.cree)]);
for (const [uid, d] of E('avis')) add('avis', 'uid, stars, text, name, group_name, ok, at, approved', [q(uid), n(d.stars) === 'null' ? '5' : n(d.stars), q(d.text || ''), q(d.name || ''), q(d.groupName || ''), b(d.ok), n(d.at) === 'null' ? '0' : n(d.at), b(d.approved)]);
for (const [uid] of E('admins')) add('admins', 'uid', [q(uid)]);
for (const [, d] of E('requests')) add('demandes', 'uid, data', [q(d.uid || ''), j(d)]);

// Fichiers de moins de 800 ko (limite des outils SQL)
const TABLES = ['groupes', 'joueurs', 'telephones', 'parties', 'presences', 'competitions', 'offres', 'donnees_groupe', 'terrains', 'terrains_proposes', 'avis'];
const head = 'begin;\n' + TABLES.map(t => `alter table ${t} disable trigger user;`).join('\n') + '\n';
const tail = '\n' + TABLES.map(t => `alter table ${t} enable trigger user;`).join('\n') + '\ncommit;\n';
let files = [], cur = [];
for (const r of rows) { if ((cur.join('\n').length + r.length) > 800e3) { files.push(cur); cur = []; } cur.push(r); }
if (cur.length) files.push(cur);
files.forEach((f, i) => writeFileSync(`import-${String(i + 1).padStart(2, '0')}.sql`, head + f.join('\n') + tail));
// Compteurs de joueurs recalculés à la fin
writeFileSync(`import-${String(files.length + 1).padStart(2, '0')}.sql`,
  `update groupes g set n_players = (select count(*) from joueurs j where j.group_id = g.id);\n`);
console.log(compte, '→', files.length + 1, 'fichiers SQL');
