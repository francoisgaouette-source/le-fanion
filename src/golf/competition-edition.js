  // ---------- Création et modification ----------
  const blankTeam = n => ({ id: uid6(), dep: '', p: Array.from({ length: n }, () => ({ name: '', index: '' })) });
  const teamSizeOf = d => ['texas', 'scramble'].includes(d.format) ? (d.format === 'scramble' ? 4 : d.teamSize || 4) : 2;
  function newCompDraft(format) {
    const c0 = S.courses[0] || { id: '', tees: [] }, y = new Date().getFullYear();
    const d = { format, jeu: 'match', name: '', date: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10), courseId: c0.id, tee: (c0.tees[0] || {}).name, allowance: 90, flights: 2, rounds: [], teams: [] };
    d.name = { match: 'Membre-membre', stableford: 'Membre-membre Stableford', coups: 'Membre-membre en coups', invite: 'Membre-invité', texas: 'Texas scramble', scramble: 'Scramble à 4', ryder: 'Coupe Ryder', tableau: 'Championnat du groupe' }[format] + ' ' + y;
    d.allowance = format === 'match' || format === 'invite' ? 90 : ['texas', 'scramble'].includes(format) ? 100 : 85;
    if (format === 'texas') { d.teamSize = 4; d.minDrives = 3; d.flights = 1; }
    if (format === 'scramble') { d.teamSize = 4; d.minDrives = 0; d.flights = 1; }
    if (format === 'ryder') { d.flights = 1; d.ryder = { sides: [{ name: 'Rouges', p: [] }, { name: 'Bleus', p: [] }], sessions: [] }; for (let i = 0; i < 4; i++) d.ryder.sides.forEach(s => s.p.push({ id: uid6(), name: '', index: '' })); }
    else if (format === 'tableau') { d.flights = 1; d.tableau = { entrants: Array.from({ length: 8 }, () => ({ id: uid6(), name: '', index: '' })), seeding: 'index', consolation: false, manual: {} }; }
    else d.teams = [0, 1, 2, 3].map(() => blankTeam(teamSizeOf(d)));
    return d;
  }
  const courseOpts = id => S.courses.map(x => `<option value="${esc(x.id)}" ${x.id === id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  const teeOpts = (cid, tee) => ((S.courses.find(x => x.id === cid) || S.courses[0] || {}).tees || []).map(t => `<option ${t.name === tee ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
  const pRow = (pre, id, p, ph) => `<div class="cm-p"><input data-${pre}n="${id}" type="text" list="cmNames" placeholder="${esc(ph)}" value="${esc(p.name)}" autocapitalize="words"><input data-${pre}i="${id}" type="text" inputmode="decimal" placeholder="Index" value="${esc(p.index)}"></div>`;
  function vCompEdit() {
    const d = S.compDraft; $('#barTitle').textContent = d.id ? 'Modifier la compétition' : 'Nouvelle compétition';
    if (!S.courses.length) return `<p class="note">Ajoutez d’abord un terrain dans la banque de terrains.</p><button class="btn" data-go="courses" type="button">Ajouter un terrain</button>`;
    const f = d.format, stroke = ['coups', 'stableford', 'texas', 'scramble'].includes(f) || f === 'invite' && d.jeu !== 'match';
    const fmtSel = `<select id="cmFmt">${COMP_INFO.map(x => `<option value="${x.f}" ${x.f === f ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`;
    const base = `<section class="card"><h2>La compétition</h2>
        <label>Format${fmtSel}</label>
        ${f === 'invite' ? `<label>Jeu<select id="cmJeu">${[['match', 'Match play (chaque équipe contre toutes celles de sa classe)'], ['stableford', 'Stableford, meilleure balle'], ['coups', 'En coups, meilleure balle']].map(([k, l]) => `<option value="${k}" ${k === (d.jeu || 'match') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
        <label>Nom<input id="cmName" type="text" value="${esc(d.name)}"></label>
        <div class="row"><label style="flex:1">${stroke && (d.rounds || []).length ? 'Ronde 1 : date' : 'Date'}<input id="cmDate" type="date" value="${esc(d.date)}"></label></div>
        <label>Terrain<select id="cmCourse">${courseOpts(d.courseId)}</select></label>
        <label>Tertre<select id="cmTee">${teeOpts(d.courseId, d.tee)}</select></label>
        ${stroke ? `${(d.rounds || []).map((r, i) => `<div class="cm-round"><b>Ronde ${i + 2}</b><button class="linkbtn" data-rdel="${i}" type="button">Retirer</button>
          <div class="row"><label style="flex:1">Date<input data-rdate="${i}" type="date" value="${esc(r.date || '')}"></label></div>
          <div class="row"><label style="flex:1">Terrain<select data-rcourse="${i}">${courseOpts(r.courseId)}</select></label><label style="flex:1">Tertre<select data-rtee="${i}">${teeOpts(r.courseId, r.tee)}</select></label></div></div>`).join('')}
          ${(d.rounds || []).length < 3 ? '<button class="btn ghost small" id="cmRoundAdd" type="button">+ Ajouter une ronde</button>' : ''}
          ${(d.rounds || []).length ? '<p class="note">Plusieurs rondes : le classement additionne les rondes, et chaque ronde a aussi le sien.</p>' : ''}` : ''}
        ${['texas', 'scramble'].includes(f) ? `<div class="row">${f === 'texas' ? `<label style="flex:1">Joueurs par équipe<select id="cmSize">${[2, 3, 4].map(n => `<option ${n === (d.teamSize || 4) ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label style="flex:1">Départs minimums par joueur<select id="cmMinDr">${[0, 1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${n === (d.minDrives == null ? 3 : d.minDrives) ? 'selected' : ''}>${n || 'Aucun'}</option>`).join('')}</select></label>` : ''}
          <label style="flex:1">Nombre de classes<select id="cmFl">${[1, 2, 3, 4].map(n => `<option ${n === d.flights ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div><input type="hidden" id="cmAllow" value="100">`
        : ['ryder', 'tableau'].includes(f) ? '' : `<div class="row"><label style="flex:1">Allocation du handicap<select id="cmAllow">${[85, 90, 100].map(a => `<option value="${a}" ${a === d.allowance ? 'selected' : ''}>${a} %${a === (eff(d) === 'match' ? 90 : 85) ? ' (recommandé)' : ''}</option>`).join('')}</select></label>
          <label style="flex:1">Nombre de classes<select id="cmFl">${[1, 2, 3, 4].map(n => `<option ${n === d.flights ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>`}
        <p class="note">${esc((COMP_INFO.find(x => x.f === f) || COMP_INFO[0]).rules.join(' '))}</p></section>
      <datalist id="cmNames">${(S.players || []).map(p => `<option value="${esc(p.name)}">`).join('')}</datalist>`;
    let body = '';
    if (f === 'ryder') {
      const R = d.ryder;
      body = `<section class="card"><h2>Les camps</h2><div class="ry-sides">${R.sides.map((s, k) => `<div class="ry-side ry-${k}"><input class="ry-name" data-ryname="${k}" type="text" value="${esc(s.name)}" aria-label="Nom du camp ${k + 1}">
          ${s.p.map((p, j) => pRow('ry', k + '.' + j, p, 'Joueur ' + (j + 1))).join('')}
          <div class="row"><button class="linkbtn" data-ryadd="${k}" type="button">+ Joueur</button>${s.p.length > 1 ? `<button class="linkbtn" data-rypop="${k}" type="button">− Retirer le dernier</button>` : ''}</div></div>`).join('')}</div>
          <button class="btn ghost small" data-balance="ryder" type="button">⚖ Répartir des joueurs en deux camps équilibrés</button></section>
        <section class="card"><h2>Les sessions (${R.sessions.length})</h2>
          ${R.sessions.map((s, si) => `<div class="ry-sess"><div class="cm-th"><b>${esc(s.name || RY_COURT[s.type])}</b><button class="linkbtn" data-sdel="${si}" type="button">Retirer</button></div>
            ${s.matches.map((m, mi) => `<div class="ry-m"><span>${m.a.map((id, q) => `<select data-msel="${si}.${mi}.a.${q}">${R.sides[0].p.filter(p => p.name).map(p => `<option value="${p.id}" ${p.id === id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`).join('')}</span><i>contre</i>
              <span>${m.b.map((id, q) => `<select data-msel="${si}.${mi}.b.${q}">${R.sides[1].p.filter(p => p.name).map(p => `<option value="${p.id}" ${p.id === id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>`).join('')}</span></div>`).join('') || '<p class="note">Pas assez de joueurs nommés dans chaque camp.</p>'}
            <button class="linkbtn" data-sregen="${si}" type="button">Refaire les paires dans l’ordre des camps</button></div>`).join('')}
          <div class="row"><select id="rySessType">${Object.entries(RY_TYPES).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><button class="btn ghost small" id="rySessAdd" type="button">+ Ajouter la session</button></div>
          <p class="note">Les paires suivent l’ordre des joueurs dans chaque camp ; changez-les dans les listes. Nommez les joueurs avant d’ajouter les sessions.</p></section>`;
    } else if (f === 'tableau') {
      const T = d.tableau;
      body = `<section class="card"><h2>Les joueurs (${T.entrants.filter(e => e.name).length})</h2>
          <div class="cm-team">${T.entrants.map((p, j) => pRow('tb', j, p, 'Joueur ' + (j + 1))).join('')}</div>
          <div class="row"><button class="btn ghost small" id="tbAdd" type="button">+ 4 joueurs</button><button class="btn ghost small" data-balance="tableau" type="button">Prendre les joueurs du groupe</button></div>
          <label>Têtes de série<select id="tbSeed"><option value="index" ${T.seeding === 'index' ? 'selected' : ''}>Selon l’index (le plus bas est no 1)</option><option value="tirage" ${T.seeding === 'tirage' ? 'selected' : ''}>Tirage au sort</option><option value="ordre" ${T.seeding === 'ordre' ? 'selected' : ''}>Dans l’ordre de la liste</option></select></label>
          <label class="chk"><input id="tbConso" type="checkbox" ${T.consolation ? 'checked' : ''}> Tableau de consolation pour les perdants de la première ronde</label>
          <p class="note">Il faut au moins 3 joueurs. S’il en manque pour remplir le tableau (8, 16, 32), les meilleures têtes de série sont exemptées de la première ronde.</p></section>`;
    } else {
      const n = teamSizeOf(d), ph = j => f === 'invite' ? (j === 0 ? 'Membre' : 'Invité') : 'Joueur ' + (j + 1);
      body = `<section class="card"><h2>Les équipes (${d.teams.length})</h2>
        <button class="btn ghost small" data-balance="teams" type="button">⚖ Former les équipes : équilibrées (A-B-C-D) ou tirage au sort</button>
        <div class="cm-teams">${d.teams.map((t, i) => `<div class="cm-team"><div class="cm-th"><b>Équipe ${i + 1}</b><button class="linkbtn" data-cmdel="${i}" type="button">Retirer</button></div>
          ${t.p.slice(0, n).map((p, j) => pRow('cm', i + '.' + j, p, ph(j))).join('')}
          <input class="cm-dep" data-cmdep="${i}" type="text" placeholder="Départ (ex. 8 h 10 ou trou 5)" value="${esc(t.dep || '')}"></div>`).join('')}</div>
        <button class="btn ghost small" id="cmAdd" type="button">+ Ajouter une équipe</button></section>`;
    }
    return base + body + `<div class="row"><button class="btn" id="cmSave" type="button">${d.id ? 'Enregistrer' : 'Créer la compétition'}</button><button class="btn ghost" id="cmCancel" type="button">Annuler</button></div>`;
  }

  // Former les équipes : joueurs du groupe cochés, avec leur index ; équilibrées (A-B-C-D en serpentin) ou tirage au sort
  function balanceSheet(kind) {
    const d = S.compDraft, last = ls.get('pelland.lastPlayers', []) || [];
    const idxOf = n => { const x = last.find(p => p && L.norm(p.name || '') === L.norm(n)); return x && x.index != null ? String(x.index) : ''; };
    const size = kind === 'teams' ? teamSizeOf(d) : 1;
    openSheet(`<h3>${kind === 'ryder' ? 'Deux camps équilibrés' : kind === 'tableau' ? 'Joueurs du tableau' : 'Former les équipes'}</h3>
      <p class="note">${kind === 'teams' ? `Cochez les joueurs (équipes de ${size}). Équilibrées : les joueurs sont classés par index et répartis en groupes A, B, C, D ; chaque équipe reçoit un joueur de chaque groupe, en serpentin, pour des handicaps d’équipe semblables.` : kind === 'ryder' ? 'Cochez les joueurs : ils sont classés par index et répartis en serpentin entre les deux camps.' : 'Cochez les joueurs du tableau.'}</p>
      <div class="bal-list">${(S.players || []).map((p, i) => `<label class="bal-row"><input type="checkbox" data-bk="${i}" checked><span>${esc(p.name)}</span><input data-bi="${i}" type="text" inputmode="decimal" placeholder="Index" value="${esc(idxOf(p.name))}"></label>`).join('') || '<p class="note">Aucun joueur dans le groupe.</p>'}</div>
      ${kind === 'teams' ? '<div class="seg bal-mode"><button class="on" data-bm="eq" type="button">Équilibrées</button><button data-bm="tirage" type="button">Tirage au sort</button></div>' : ''}
      <div class="sheet-actions"><button class="btn" id="balGo" type="button">${kind === 'teams' ? 'Former les équipes' : kind === 'ryder' ? 'Répartir' : 'Ajouter au tableau'}</button><button class="btn ghost" data-close type="button">Annuler</button></div>`, sh => {
      let mode = 'eq';
      sh.querySelector('[data-close]').onclick = closeSheet;
      sh.querySelectorAll('[data-bm]').forEach(b => b.onclick = () => { mode = b.dataset.bm; sh.querySelectorAll('[data-bm]').forEach(x => x.classList.toggle('on', x === b)); });
      sh.querySelector('#balGo').onclick = () => {
        const chosen = (S.players || []).map((p, i) => ({ name: p.name, index: sh.querySelector(`[data-bi="${i}"]`).value.trim(), on: sh.querySelector(`[data-bk="${i}"]`).checked })).filter(x => x.on);
        if (chosen.length < 2) return toast('Cochez au moins deux joueurs.');
        const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
        const byIdx = l => [...l].sort((a, b) => (parseIdx(a.index) ?? 54) - (parseIdx(b.index) ?? 54));
        if (kind === 'tableau') { d.tableau.entrants = [...d.tableau.entrants.filter(e => e.name), ...chosen.map(p => ({ id: uid6(), name: p.name, index: p.index }))]; closeSheet(); return render(); }
        if (kind === 'ryder') { const s = byIdx(chosen); d.ryder.sides.forEach(x => { x.p = []; }); s.forEach((p, i) => d.ryder.sides[[0, 1, 1, 0][i % 4]].p.push({ id: uid6(), name: p.name, index: p.index })); d.ryder.sessions = []; closeSheet(); toast('Camps formés : ajoutez maintenant les sessions.'); return render(); }
        const nT = Math.floor(chosen.length / size); if (!nT) return toast(`Il faut au moins ${size} joueurs.`);
        let teams = Array.from({ length: nT }, () => []);
        if (mode === 'tirage') { shuffle(chosen).slice(0, nT * size).forEach((p, i) => teams[i % nT].push(p)); }
        else {
          const s = byIdx(chosen).slice(0, nT * size);
          for (let k = 0; k < size; k++) { const pot = shuffle(s.slice(k * nT, (k + 1) * nT)).sort((a, b) => (parseIdx(a.index) ?? 54) - (parseIdx(b.index) ?? 54)); (k % 2 ? pot.reverse() : pot).forEach((p, i) => teams[i].push(p)); }
        }
        const out = chosen.length - nT * size;
        d.teams = teams.map(ps => ({ id: uid6(), dep: '', p: ps.map(p => ({ name: p.name, index: p.index })) }));
        closeSheet(); toast(`${nT} équipes formées${out ? ` ; ${out} joueur${out > 1 ? 's' : ''} sans équipe` : ''}.`); render();
      };
    });
  }
