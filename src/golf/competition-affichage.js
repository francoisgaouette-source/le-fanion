  // ---------- Affichage d'une compétition ----------
  function compHead(c) {
    const info = c.format === 'ryder' ? 'Coupe Ryder · match play net' : c.format === 'tableau' ? `Tableau à élimination · match play net, 100 % de l’écart` : eff(c) === 'texas' ? `${c.format === 'scramble' ? 'Scramble à 4' : 'Texas scramble'} · équipes de ${c.teamSize || 4}${c.minDrives ? ` · ${c.minDrives} départ(s) minimum par joueur` : ''}` : `${c.format === 'invite' ? 'Membre-invité · ' : ''}${eff(c) === 'coups' ? 'Meilleure balle nette en coups' : eff(c) === 'stableford' ? 'Stableford, meilleure balle nette' : 'Match play, meilleure balle nette'} · ${c.allowance} % du handicap`;
    const rounds = nRounds(c) > 1 ? ` · ${nRounds(c)} rondes` : '';
    return `<div class="cm-head"><span>${esc(dateLong(c.date))}</span><span>${esc(c.course.name)} · tertre ${esc(c.tee)}</span><span>${esc(info + rounds)}</span></div>`;
  }
  const tabsHtml = (tab, list) => `<div class="seg cm-tabs">${list.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-ctab="${k}" type="button">${l}</button>`).join('')}</div>`;
  const outilsHtml = () => `<div class="row cm-outils"><button class="btn ghost small" data-tv type="button">📺 Écran télé</button><button class="btn ghost small" data-print="cartes" type="button">🖨 Cartes de pointage</button><button class="btn ghost small" data-print="affiches" type="button">🖨 Affiches de voiturette</button></div>`;
  const orgHtml = () => canOrganize() ? `<div class="row"><button class="btn ghost small" data-cedit type="button">Modifier</button>${!isProprio() ? '' : S.confirmDelComp ? '<button class="btn small" data-cdelok type="button" style="background:var(--red)">Confirmer l’effacement</button>' : '<button class="btn ghost small" data-cdel type="button">Effacer la compétition</button>'}</div>` : '';
  function boardHtml(c, r) {
    const fl = compFlights(c, r), stb = eff(c) === 'stableford', multi = nRounds(c) > 1 && r == null;
    return fl.map(f => `<section class="card cm-board"><h3>${esc(f.name)}</h3>
        <table class="cm-lb"><thead><tr><th>Pos.</th><th>Équipe</th>${multi ? Array.from({ length: nRounds(c) }, (_, i) => `<th>R${i + 1}</th>`).join('') : ''}<th>Trous</th><th>${stb ? 'Pts' : 'Total'}</th></tr></thead>
        <tbody>${f.teams.map(x => `<tr class="${x.pos === 1 ? 'lead' : ''}"><td>${x.pos ? (x.tie ? 'É' : '') + x.pos : '—'}</td><td>${teamLabel(x.t)}<small>Hcp d’équipe ${x.ph}${stb && x.thru ? ' · ' + toParTxt(x.toPar) : ''}${eff(c) === 'texas' ? (x.thru ? ' · brut ' + x.gross : '') + ' · départs : ' + drivesTxt(c, x) : ''}</small></td>
          ${multi ? x.rounds.map(y => `<td class="rd">${!y.thru ? '—' : stb ? y.pts : toParTxt(y.toPar)}</td>`).join('') : ''}<td>${x.thru === 18 * (multi ? nRounds(c) : 1) ? 'F' : x.thru || '—'}</td><td class="tp ${!stb && x.toPar < 0 ? 'under' : ''}">${!x.thru ? '—' : stb ? x.pts : toParTxt(x.toPar)}</td></tr>`).join('')}</tbody></table></section>`).join('');
  }
  function matchBoardHtml(c) {
    return compFlights(c, 0).map(f => { const st = compStandings(c, f); return `<section class="card cm-board"><h3>${esc(f.name)}</h3>
        <table class="cm-lb"><thead><tr><th>Pos.</th><th>Équipe</th><th>G-N-P</th><th>Pts</th></tr></thead>
        <tbody>${st.T.map(x => `<tr class="${x.pos === 1 && x.pts ? 'lead' : ''}"><td>${x.pos}</td><td>${teamLabel(x.r.t)}<small>Hcp d’équipe ${x.r.ph} · trous ${x.diff > 0 ? '+' : x.diff < 0 ? '−' : ''}${Math.abs(x.diff)}</small></td><td>${x.w}-${x.h}-${x.l}</td><td class="tp">${fmtPt(x.pts)}</td></tr>`).join('')}</tbody></table>
        <h4 class="cm-mh">Les matchs</h4><ul class="cm-matches">${st.M.map(m => `<li class="${m.done ? 'done' : ''}"><span>${teamLabel(m.A)} <i>contre</i> ${teamLabel(m.B)}</span><b>${m.lead ? `${esc(m.lead.p.map(p => (p.name || '?').split(' ')[0]).join(' et '))} : ` : ''}${esc(m.txt)}</b></li>`).join('')}</ul></section>`; }).join('');
  }
  function ryderBoardHtml(c, big) {
    const T = ryTotals(c), S0 = c.ryder.sides, gagne = T.tot[0] >= T.gagner ? 0 : T.tot[1] >= T.gagner ? 1 : -1;
    return `<section class="card ry-score${big ? ' big' : ''}"><div class="ry-tot"><div class="ry-0"><span>${esc(S0[0].name)}</span><b>${fmtPt(T.tot[0])}</b></div><div class="ry-1"><span>${esc(S0[1].name)}</span><b>${fmtPt(T.tot[1])}</b></div></div>
        <p class="note">${T.n ? (gagne >= 0 ? `<b>${esc(S0[gagne].name)} remportent la coupe.</b>` : `${fmtPt(T.gagner)} points pour gagner, sur ${T.n} matchs.`) : 'Ajoutez des sessions de matchs.'}</p></section>
      ${(c.ryder.sessions || []).map(s => `<section class="card cm-board"><h3>${esc(s.name || RY_COURT[s.type])}</h3><ul class="cm-matches ry-list">${s.matches.map(m => { const r = ryMatch(c, m, s.type), side = r.d > 0 ? 0 : r.d < 0 ? 1 : -1;
        return `<li class="${r.done ? 'done' : ''}"><span><b class="ry-c0">${r.A.map(p => esc(p.name)).join(' et ')}</b> <i>contre</i> <b class="ry-c1">${r.B.map(p => esc(p.name)).join(' et ')}</b></span><b class="${side >= 0 ? 'ry-c' + side : ''}">${side >= 0 ? esc(S0[side].name) + ' : ' : ''}${esc(r.txt)}</b>${big ? '' : `<button class="linkbtn" data-mscore="${m.id}" type="button">Pointage</button>`}</li>`; }).join('')}</ul></section>`).join('')}`;
  }
  function bracketHtml(c, B, title, big) {
    return `<section class="card cm-board tb"><h3>${esc(title)}</h3><div class="tb-rounds">${B.rounds.map(rd => `<div class="tb-round"><h4>${esc(rd.name)}</h4>${rd.ms.map(m => `<div class="tb-m ${m.res.winner ? 'done' : ''}">
        <div class="${m.res.winner && m.res.winner === m.a ? 'win' : ''}">${tbName(c, m.a, m.pendA)}</div><div class="${m.res.winner && m.res.winner === m.b ? 'win' : ''}">${tbName(c, m.b, m.pendB)}</div>
        <small>${m.res.bye ? (m.a || m.b ? 'Exempté' : '') : m.res.pend ? 'En attente' : m.res.winner ? esc(m.res.txt) : m.res.egal ? 'Égalité : indiquez le gagnant' : m.res.played ? esc(m.res.txt) : 'À jouer'}</small>
        ${!big && m.a && m.b && !m.res.bye && !m.res.pend ? `<div class="tb-act"><button class="linkbtn" data-mscore="${m.key}" type="button">Pointage</button>${canOrganize() ? `<select data-tbw="${m.key}" aria-label="Gagnant"><option value="">Gagnant…</option><option value="a" ${((c.tableau.manual || {})[m.key] || {}).w === 'a' ? 'selected' : ''}>${esc(m.a.name)}</option><option value="b" ${((c.tableau.manual || {})[m.key] || {}).w === 'b' ? 'selected' : ''}>${esc(m.b.name)}</option></select>` : ''}</div>` : ''}</div>`).join('')}</div>`).join('')}</div>
      ${B.champion ? `<p class="tb-champ">🏆 ${esc(B.champion.name)}</p>` : ''}</section>`;
  }
  // Pointage d'un match (Coupe Ryder ou tableau) : scores bruts de chaque joueur, coups reçus en points
  function matchScoreHtml(c, key) {
    let A, B, type, title;
    if (c.format === 'ryder') { for (const s of c.ryder.sessions) { const m = s.matches.find(x => x.id === key); if (m) { A = m.a.map(id => ryPlayer(c, id)); B = m.b.map(id => ryPlayer(c, id)); type = s.type; title = s.name || RY_COURT[s.type]; } } }
    else { const { main, conso } = tbBrackets(c); for (const Bk of [main, conso].filter(Boolean)) for (const rd of Bk.rounds) for (const m of rd.ms) if (m.key === key) { A = [m.a]; B = [m.b]; type = 'simple'; title = rd.name; } }
    if (!A || !B || !A[0] || !B[0]) return '<p class="note">Match introuvable.</p>';
    const r = playMatch(c.course, compTee(c), A, B, (c.scores || {})[key], type);
    const cols = type === 'alterne' ? [{ n: A.map(p => p.name.split(' ')[0]).join('-'), k: r.ha[0], side: 0 }, { n: B.map(p => p.name.split(' ')[0]).join('-'), k: r.hb[0], side: 1 }]
      : [...A.map((p, i) => ({ n: p.name.split(' ')[0], k: r.ha[i], side: 0 })), ...B.map((p, i) => ({ n: p.name.split(' ')[0], k: r.hb[i], side: 1 }))];
    return `<button class="linkbtn" data-mback type="button">‹ Retour</button>
      <h3 class="ms-t">${esc(title)} : ${A.map(p => esc(p.name)).join(' et ')} <i>contre</i> ${B.map(p => esc(p.name)).join(' et ')}</h3>
      <div class="cm-sum"><span>${esc(RY_COURT[type])}</span><b class="${r.d > 0 ? 'ry-c0' : r.d < 0 ? 'ry-c1' : ''}">${r.d ? esc((r.d > 0 ? A : B).map(p => p.name.split(' ')[0]).join(' et ')) + ' : ' : ''}${esc(r.txt)}</b></div>
      <div class="card-scroll"><table class="sc cm-sc"><thead><tr><th>Trou</th><th>Norm.</th><th>Hcp</th>${cols.map(x => `<th class="ry-c${x.side}">${esc(x.n)}<small>${x.k}</small></th>`).join('')}<th>Match</th></tr></thead>
      <tbody>${r.holes.map(hh => `<tr><td>${hh.h}</td><td>${hh.par}</td><td>${hh.si}</td>${cols.map((x, i) => { const k = L.strokesOnHole(x.k, hh.si); return `<td class="cm-in">${k > 0 ? `<i class="dots">${'•'.repeat(Math.min(k, 3))}</i>` : ''}<input data-ms="${key}.${hh.h}.${i}" type="text" inputmode="numeric" maxlength="2" value="${hh.s[i] == null ? '' : esc(hh.s[i])}" aria-label="Trou ${hh.h}, ${esc(x.n)}"></td>`; }).join('')}<td class="cm-best ${hh.d > 0 ? 'ry-c0' : hh.d < 0 ? 'ry-c1' : ''}">${hh.d == null ? '' : hh.d === 0 ? 'É' : Math.abs(hh.d) + ' UP'}</td></tr>`).join('')}</tbody></table></div>
      <p class="note">Entrez les scores bruts. Les points (•) sont les coups reçus dans ce match${type === 'alterne' ? ' (50 % de la somme des deux joueurs)' : type === 'quatre' ? ' (90 % du handicap)' : ''}, à partir du plus bas handicap.</p>`;
  }

  function vComp() {
    const c = S.comp; if (!c) return '<p class="note">Chargement…</p>';
    $('#barTitle').textContent = c.name;
    const head = compHead(c);
    if (c.format === 'ryder' || c.format === 'tableau') {
      if (S.compMatch) return head + matchScoreHtml(c, S.compMatch);
      const tab = ['class', 'teams'].includes(S.compTab) ? S.compTab : 'class';
      const t = tabsHtml(tab, [['class', c.format === 'ryder' ? 'Pointage de la coupe' : 'Tableau'], ['teams', c.format === 'ryder' ? 'Camps' : 'Joueurs']]);
      if (tab === 'class') {
        if (c.format === 'ryder') return head + t + ryderBoardHtml(c) + outilsHtml();
        const { main, conso } = tbBrackets(c);
        return head + t + bracketHtml(c, main, 'Tableau principal') + (conso ? bracketHtml(c, conso, 'Consolation') : '') + '<p class="note">Touchez « Pointage » pour entrer un match trou par trou ; l’organisateur peut aussi choisir le gagnant (trous supplémentaires, forfait).</p>' + outilsHtml();
      }
      if (c.format === 'ryder') return head + t + `<div class="ry-sides">${c.ryder.sides.map((s, k) => `<div class="card ry-side ry-${k}"><h3>${esc(s.name)}</h3>${s.p.filter(p => p.name).map(p => `<div>${esc(p.name)} <small>index ${String(p.index).replace('.', ',')}</small></div>`).join('')}</div>`).join('')}</div>` + orgHtml();
      return head + t + `<div class="list">${tbSeeds(c).map((p, i) => `<div class="item"><b>${i + 1}. ${esc(p.name)}</b><span>index ${String(p.index).replace('.', ',')}</span></div>`).join('')}</div>` + orgHtml();
    }
    const tab = S.compTab || 'class', R = Math.min(S.compRound || 0, nRounds(c) - 1);
    const rsel = nRounds(c) > 1 ? `<div class="seg cm-rounds">${tab === 'class' ? `<button class="${S.compRound == null || S.compRound === 'total' ? 'on' : ''}" data-cround="total" type="button">Cumul</button>` : ''}${Array.from({ length: nRounds(c) }, (_, i) => `<button class="${(tab === 'class' ? S.compRound === i : R === i) ? 'on' : ''}" data-cround="${i}" type="button">Ronde ${i + 1}</button>`).join('')}</div>` : '';
    const t = tabsHtml(tab, [['class', 'Classement'], ['score', 'Pointage'], ['teams', 'Équipes']]);
    if (tab === 'class' && eff(c) === 'match') return head + t + matchBoardHtml(c) +
      '<p class="note">Chaque équipe affronte toutes les équipes de sa classe en match play, meilleure balle nette. Match gagné : 1 point ; nul : ½. G-N-P = gagnés, nuls, perdus. Égalité de points : on départage par les trous gagnés. Les coups se donnent à partir du plus bas handicap de jeu des quatre joueurs du match.</p>' + outilsHtml();
    if (tab === 'class') return head + t + rsel + boardHtml(c, typeof S.compRound === 'number' ? Math.min(S.compRound, nRounds(c) - 1) : null) +
      `<p class="note">${eff(c) === 'stableford' ? 'Stableford, meilleure balle nette : à chaque trou, le meilleur joueur de l’équipe compte. Normale nette 2 points, oiselet net 3, aigle net 4, boguey net 1, double boguey ou pire 0. Le plus de points gagne. ' : ''}É = égalité. F = parcours terminé. Le classement se met à jour en direct pendant que les équipes entrent leurs scores.</p>` + outilsHtml();
    const fl = compFlights(c, R);
    if (tab === 'teams') return head + t + `<div class="list">${fl.map(f => f.teams.map(x => `<div class="item"><b>${teamLabel(x.t)}</b><span>${esc(f.name)}${x.t.dep ? ' · départ ' + esc(x.t.dep) : ''} · ${eff(c) === 'texas' ? `hcp d’équipe ${x.ph} · ` + x.t.p.map(p => `${esc(p.name)} : index ${String(p.index).replace('.', ',')}`).join(' · ') : x.ps.map(p => `${esc(p.name)} : index ${String(p.index).replace('.', ',')}, hcp de jeu ${p.ph}`).join(' · ')}</span></div>`).join('')).join('')}</div>` + orgHtml();
    // Pointage d'une équipe, pour la ronde choisie
    const teams = (c.teams || []), tid = S.compTeam && teams.find(x => x.id === S.compTeam) ? S.compTeam : (teams[0] || {}).id, tm = teams.find(x => x.id === tid);
    if (!tm) return head + t + '<p class="note">Aucune équipe.</p>';
    const r = compTeamResult(c, tm, R), sel = `<label>Équipe<select id="cmTeamSel">${teams.map(x => `<option value="${esc(x.id)}" ${x.id === tid ? 'selected' : ''}>${teamLabel(x)}</option>`).join('')}</select></label>`;
    if (eff(c) === 'texas') return head + t + rsel + sel + `<div class="cm-sum">${sumHtml(c, r)}</div>
      <p class="note tx-drv">Départs : ${drivesTxt(c, r)}${c.minDrives ? ` (minimum ${c.minDrives} chacun)` : ''}</p>
      <div class="card-scroll"><table class="sc cm-sc tx"><thead><tr><th>Trou</th><th>Norm.</th><th>Hcp</th><th>Score de l’équipe</th><th>Départ de</th><th>Net</th></tr></thead>
      <tbody>${r.holes.map(hh => { const k = L.strokesOnHole(r.ph, hh.si); return `<tr><td>${hh.h}</td><td>${hh.par}</td><td>${hh.si}</td>
        <td class="cm-in">${k > 0 ? `<i class="dots">${'•'.repeat(Math.min(k, 3))}</i>` : ''}<input data-tx="${hh.h}" type="text" inputmode="numeric" maxlength="2" value="${hh.g == null ? '' : hh.g}" aria-label="Trou ${hh.h}, score de l’équipe"></td>
        <td><select data-td="${hh.h}" aria-label="Trou ${hh.h}, départ de"><option value="">—</option>${tm.p.map((p, i) => `<option value="${i}" ${hh.dv === i ? 'selected' : ''}>${prenom(p.name)}</option>`).join('')}</select></td>
        <td class="cm-best ${hh.best != null && hh.best < hh.par ? 'under' : ''}">${hh.best == null ? '' : hh.best}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="note">Entrez le score de l’équipe (une seule balle) et le joueur dont le départ a été choisi. Les points (•) sont les coups reçus par l’équipe.</p>`;
    return head + t + rsel + sel + `<div class="cm-sum">${sumHtml(c, r)}</div>
      <div class="card-scroll"><table class="sc cm-sc"><thead><tr><th>Trou</th><th>Norm.</th><th>Hcp</th>${r.ps.map(p => `<th>${prenom(p.name)}<small>${p.ph}</small></th>`).join('')}<th>Équipe</th></tr></thead>
      <tbody>${r.holes.map(hh => `<tr><td>${hh.h}</td><td>${hh.par}</td><td>${hh.si}</td>${r.ps.map((p, i) => { const k = L.strokesOnHole(p.ph, hh.si); return `<td class="cm-in">${k > 0 ? `<i class="dots">${'•'.repeat(Math.min(k, 3))}</i>` : ''}<input data-cms="${hh.h}.${i}" type="text" inputmode="numeric" maxlength="2" value="${hh.s[i] == null ? '' : esc(hh.s[i])}" aria-label="Trou ${hh.h}, ${esc(p.name)}"></td>`; }).join('')}<td class="cm-best ${hh.best != null && hh.best < hh.par ? 'under' : ''}">${hh.best == null ? '' : hh.best}${eff(c) === 'stableford' && hh.sp != null ? `<small>${hh.sp} pt${hh.sp > 1 ? 's' : ''}</small>` : ''}</td></tr>`).join('')}</tbody></table></div>
      <p class="note">Entrez les scores bruts. Les points (•) sont les coups reçus avec le plein handicap de jeu ; la colonne Équipe montre le meilleur score net du trou.${eff(c) !== 'match' ? '' : ' En match play, l’app recalcule les coups de chaque match à partir du plus bas handicap des quatre joueurs.'}</p>`;
  }
