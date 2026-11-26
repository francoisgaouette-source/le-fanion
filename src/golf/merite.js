  // ---------- Ordre du mérite : points selon la position, cumulés sur la saison ----------
  const MERIT_PTS = [100, 80, 65, 55, 50, 45, 40, 36, 32, 29, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8];
  // Une compétition compte dans l'ordre du mérite seulement une fois terminée
  function compFinie(c) {
    if (c.format === 'ryder') { const T = ryTotals(c); return T.n > 0 && T.all.every(x => x.r.done); }
    if (c.format === 'tableau') return !!tbBrackets(c).main.champion;
    if (eff(c) === 'match') return compFlights(c, 0).every(f => compStandings(c, f).M.every(m => m.done));
    return (c.teams || []).length > 0 && (c.teams || []).every(t => compTeamTotal(c, t).thru >= 18 * nRounds(c));
  }
  function compMerit(c) {
    const out = []; const add = (name, pts) => { if (name) out.push({ name, pts }); };
    if (!compFinie(c)) return out;
    if (c.format === 'ryder') { const T = ryTotals(c), w = T.tot[0] === T.tot[1] ? -1 : T.tot[0] > T.tot[1] ? 0 : 1; c.ryder.sides.forEach((s, i) => s.p.forEach(p => add(p.name, w === -1 ? 45 : w === i ? 60 : 30))); return out; }
    if (c.format === 'tableau') {
      const { main } = tbBrackets(c), R = main.rounds.length, reach = {};
      main.rounds.forEach((rd, r) => rd.ms.forEach(m => [m.a, m.b].forEach(p => { if (p) reach[p.id] = Math.max(reach[p.id] || 0, r); })));
      Object.entries(reach).forEach(([id, r]) => { const p = c.tableau.entrants.find(x => x.id === id); const champ = main.champion && main.champion.id === id;
        add(p && p.name, champ ? 100 : r === R - 1 ? 80 : r === R - 2 ? 65 : r === R - 3 ? 50 : 30); });
      return out;
    }
    if (eff(c) === 'match') { compFlights(c, 0).forEach(f => compStandings(c, f).T.forEach(x => x.r.t.p.forEach(p => add(p.name, MERIT_PTS[x.pos - 1] || 5)))); return out; }
    compFlights(c).forEach(f => f.teams.forEach(x => { if (x.pos) x.t.p.forEach(p => add(p.name, MERIT_PTS[x.pos - 1] || 5)); }));
    return out;
  }
  function meritTable(list, year) {
    const m = {};
    list.filter(c => (c.date || '').startsWith(String(year))).forEach(c => compMerit(c).forEach(x => { const k = L.norm(x.name); m[k] = m[k] || { name: x.name, pts: 0, n: 0 }; m[k].pts += x.pts; m[k].n++; }));
    const rows = Object.values(m).sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name, 'fr'));
    rows.forEach((x, i) => { x.pos = i && x.pts === rows[i - 1].pts ? rows[i - 1].pos : i + 1; });
    return rows;
  }

  // Formats de compétition (comme la banque de jeux) ; ready = on peut la créer dans l'app
  const COMP_INFO = [
    { f: 'match', ready: true, name: 'Membre-membre en match play', who: 'Équipes de 2, réparties en classes selon le handicap d’équipe',
      rules: ['Dans chaque classe, chaque équipe affronte toutes les autres (ronde).', 'Chaque match se joue en meilleure balle nette sur 18 trous : l’équipe au meilleur score net gagne le trou.', 'Allocation recommandée : 90 % du handicap de parcours ; les coups se donnent à partir du plus bas des quatre joueurs.'],
      score: ['Match gagné : 1 point ; nul : ½ ; perdu : 0.', 'Égalité de points : on départage par les trous gagnés.', 'Le classement de chaque classe se met à jour en direct.'] },
    { f: 'stableford', ready: true, name: 'Membre-membre Stableford', who: 'Équipes de 2, réparties en classes selon le handicap d’équipe',
      rules: ['À chaque trou, le meilleur score net de l’équipe compte (meilleure balle).', 'Points : normale nette 2, oiselet net 3, aigle net 4, boguey net 1, double boguey ou pire 0.', 'Allocation recommandée : 85 % du handicap de parcours.', 'Possible sur plusieurs rondes : les points s’additionnent.'],
      score: ['Le plus de points gagne la classe.', 'Un mauvais trou ne coûte que 0 point : idéal pour les handicaps élevés.'] },
    { f: 'coups', ready: true, name: 'Membre-membre en coups', who: 'Équipes de 2, réparties en classes selon le handicap d’équipe',
      rules: ['À chaque trou, le meilleur score net de l’équipe compte (meilleure balle).', 'On additionne les trous ; le total se lit par rapport à la normale (−5, Par, +2).', 'Allocation recommandée : 85 % du handicap de parcours.', 'Possible sur plusieurs rondes : les totaux s’additionnent.'],
      score: ['Le plus bas total net gagne la classe.'] },
    { f: 'invite', ready: true, name: 'Membre-invité', who: 'Un membre et son invité, en équipe de 2',
      rules: ['Comme le membre-membre, mais chaque équipe compte un invité de l’extérieur du groupe.', 'Au choix : match play (chaque équipe contre toutes celles de sa classe), Stableford ou en coups, meilleure balle nette.', 'Classes selon le handicap d’équipe.'],
      score: ['Match play : 1 point par match gagné, ½ par nul.', 'Stableford ou coups : le meilleur total de la classe gagne.'] },
    { f: 'texas', ready: true, name: 'Texas scramble', who: 'Équipes de 4 (ou de 2 ou 3), avec ou sans classes',
      rules: ['Les joueurs de l’équipe frappent tous ; on choisit la meilleure balle et tout le monde rejoue de là, jusqu’au trou.', 'Chaque joueur doit fournir un nombre minimum de coups de départ (souvent 3 à 4 balles).', 'Handicap d’équipe : 25-20-15-10 % des handicaps de parcours, du plus bas au plus haut.'],
      score: ['Un seul score par équipe et par trou ; le plus bas total net gagne.', 'L’app compte les départs de chaque joueur et signale ceux qui manquent.'] },
    { f: 'scramble', ready: true, name: 'Scramble à 4', who: 'Équipes de 4',
      rules: ['Les 4 joueurs frappent ; l’équipe choisit la meilleure balle et tout le monde rejoue de là, jusqu’au trou.', 'Aucun minimum de départs par joueur.', 'Handicap d’équipe : 25 %, 20 %, 15 % et 10 % des handicaps de parcours, du plus bas au plus haut.'],
      score: ['Un seul score par équipe ; le plus bas total net gagne.'] },
    { f: 'ryder', ready: true, name: 'Coupe Ryder du groupe', who: 'Deux camps (Rouges contre Bleus)',
      rules: ['Plusieurs sessions de matchs : quatre balles (meilleure balle à 2 contre 2), coups alternés (une balle à 2 contre 2) et simples.', 'Chaque match se joue en match play net : 90 % du handicap en quatre balles, 50 % de la somme des deux joueurs en coups alternés, 100 % en simple, à partir du plus bas handicap du match.'],
      score: ['Match gagné : 1 point pour son camp ; nul : ½.', 'Le premier camp à dépasser la moitié des points gagne la coupe.'] },
    { f: 'tableau', ready: true, name: 'Tableau à élimination', who: 'Joueurs en match play, un contre un',
      rules: ['Têtes de série selon l’index (le plus bas est no 1), par tirage au sort ou dans l’ordre entré ; les meilleures têtes de série sont exemptées s’il manque des joueurs.', 'Chaque match se joue en match play net, 100 % de l’écart des handicaps.', 'Le gagnant passe à la ronde suivante ; un tableau de consolation est possible pour les perdants de la première ronde.'],
      score: ['Le pointage trou par trou décide le match ; l’organisateur peut aussi indiquer le gagnant (trous supplémentaires, forfait).'] },
  ];
  const fmtName = f => (COMP_INFO.find(x => x.f === (f || 'match')) || {}).name || '';
  const compSub = c => c.format === 'ryder' ? `${c.ryder.sides[0].name} contre ${c.ryder.sides[1].name}` : c.format === 'tableau' ? `${c.tableau.entrants.filter(e => e.name).length} joueurs` : `${(c.teams || []).length} équipes${nRounds(c) > 1 ? ` · ${nRounds(c)} rondes` : ''}`;
  const compItem = c => `<button class="item" data-comp="${esc(c.id)}"><b>${esc(c.name)}</b><span>${esc(dateLong(c.date))} · ${esc(fmtName(c.format))} · ${esc(c.course.name)} · ${esc(compSub(c))}</span></button>`;

  function vComps() {
    $('#barTitle').textContent = S.compLive ? 'Compétitions en cours' : 'Compétitions';
    if (S.compList == null) { Store.listComps().then(l => { S.compList = l; if (S.view === 'comps') render(); }); return '<p class="note">Chargement…</p>'; }
    if (S.compLive) {
      // En cours : aujourd'hui et à venir (et la veille, pour finir d'entrer les scores) ; une compétition sur plusieurs rondes reste jusqu'à sa dernière
      const from = new Date(Date.now() - 864e5).toISOString().slice(0, 10), today = new Date().toISOString().slice(0, 10);
      const fin = c => [c.date, ...(c.rounds || []).map(r => r.date)].filter(Boolean).sort().pop() || '';
      const l = S.compList.filter(c => fin(c) >= from || c.format === 'tableau' && !(tbBrackets(c).main.champion)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      return `<p class="note">Touchez une compétition pour voir son classement en direct et entrer les scores de votre équipe.</p>
        <div class="list">${l.map(c => compItem(c).replace('</b>', c.date === today ? ' <span class="live-tag">Aujourd’hui</span></b>' : '</b>')).join('') || `<p class="note">Aucune compétition en cours.</p>`}</div>
        <button class="btn ghost" data-go="comps" type="button">Voir la Banque de compétitions</button>`;
    }
    const year = S.meritYear || new Date().getFullYear(), merit = meritTable(S.compList, year);
    return `<p class="note">Les formats de compétition, leurs règles et leur pointage. Tout se compte au net, avec le handicap de chacun.</p>
      <div class="jeux">${COMP_INFO.map(x => `<details class="card jeu"><summary><b>${esc(x.name)}${x.ready ? '' : ' <span class="soon-tag">Bientôt</span>'}</b><span>${esc(x.who)}</span></summary>
        <h3>Règles</h3><ul>${x.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
        <h3>Le classement</h3><ul>${x.score.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
        ${x.ready && isProprio() ? `<button class="btn small" data-compnew="${x.f}" type="button">Créer dans ce format</button>` : ''}</details>`).join('')}</div>
      <h2 class="jeux-h">Compétitions du groupe</h2>
      <div class="list">${S.compList.map(compItem).join('') || '<p class="note">Aucune compétition pour l’instant.</p>'}</div>
      ${isProprio() ? '<button class="btn" data-compnew="match" type="button">Nouvelle compétition</button>' : canOrganize() ? '<p class="note">Seul le propriétaire du groupe peut créer ou effacer une compétition.</p>' : ''}
      <h2 class="jeux-h">Ordre du mérite ${year}</h2>
      <p class="note">Points de saison selon la position dans chaque compétition : 1re place 100, 2e 80, 3e 65, 4e 55, 5e 50, puis en baissant. Coupe Ryder : 60 par joueur du camp gagnant, 30 pour l’autre camp. Tableau : champion 100, finaliste 80, demi-finale 65, quart 50. Seules les compétitions terminées comptent.</p>
      ${merit.length ? `<section class="card"><table class="cm-lb merit"><thead><tr><th>Pos.</th><th>Joueur</th><th>Comp.</th><th>Pts</th></tr></thead><tbody>${merit.map(x => `<tr class="${x.pos === 1 ? 'lead' : ''}"><td>${x.pos}</td><td>${esc(x.name)}</td><td>${x.n}</td><td class="tp">${x.pts}</td></tr>`).join('')}</tbody></table></section>` : `<p class="note">Aucun point cette saison : les points apparaissent dès qu’une compétition de ${year} est terminée.</p>`}
      <div class="row"><button class="btn ghost small" data-merit="${year - 1}" type="button">‹ ${year - 1}</button>${year < new Date().getFullYear() ? `<button class="btn ghost small" data-merit="${year + 1}" type="button">${year + 1} ›</button>` : ''}</div>`;
  }
