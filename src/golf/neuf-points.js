  // ---------------- Le 9 points (3 joueurs) ----------------
  const isAlt = g => !!g && L.formatOf(g) !== 'pelland';
  const fmtPts = x => String(Math.round(x * 10) / 10).replace('.', ',').replace('-', '−');
  const neufPP = g => g.perPoint == null || g.perPoint === '' ? 1 : money(g.perPoint);
  // Gain de chacun : différence de points avec chaque autre joueur × $ par point
  function neufGains(g) { return L.altGains(g, neufPP(g)); }
  const ptsLabel = g => ({ neuf: 'pts', skins: 'skins', bestball: 'trous', match: 'trous', nassau: 'trous', sixes: 'trous', wolf: 'pts' })[L.formatOf(g)] || 'pts';
  function persoLines(c) {
    c = c || {}; const L2 = [];
    if (c.mode === 'equipes') {
      L2.push('Équipes de deux (Rouges et Bleus).');
      if (+c.low) L2.push(`Plus bas net : ${+c.low} point${+c.low > 1 ? 's' : ''} à son équipe.`);
      if (+c.high) L2.push(`Plus haut net : ${+c.high} point${+c.high > 1 ? 's' : ''} à l’équipe adverse.`);
      if (+c.team) L2.push(`Meilleur total des deux nets : ${+c.team} point${+c.team > 1 ? 's' : ''}.`);
      if (+c.birdie) L2.push(`Chaque oiselet (brut) : ${+c.birdie} point${+c.birdie > 1 ? 's' : ''} à l’équipe.`);
      L2.push('Par trou, seule la différence entre les équipes compte. Égalité : pas de points.');
    } else {
      L2.push('Chacun pour soi.');
      if (String(c.ranks || '').trim()) L2.push(`Points par rang au net (1er, 2e, 3e…) : ${c.ranks}. Égalités partagées.`);
      if (+c.birdie) L2.push(`Chaque oiselet (brut) : ${+c.birdie} point${+c.birdie > 1 ? 's' : ''}.`);
      if (+c.skin) L2.push(`Skin (seul meilleur net) : ${+c.skin} point${+c.skin > 1 ? 's' : ''}, reporté en cas d’égalité.`);
    }
    return L2;
  }
  function ruleText(g) {
    if (L.formatOf(g) === 'perso') return persoLines(g.custom).join(' ');
    return ({ neuf: 'Le 9 points : 5 points au meilleur net, 3 au 2e, 1 au 3e ; égalités partagées.',
      bestball: 'Best Ball : le meilleur net de chaque équipe ; le trou gagné vaut 1 point.',
      match: 'Match play : un contre un, au net ; le plus bas score gagne le trou. Le match finit dès que l’avance dépasse les trous qui restent (« gagne 3 et 2 »). Un seul enjeu, pour la partie.',
      vegas: 'Vegas : les deux nets de l’équipe forment un nombre, le plus bas d’abord (4 et 5 = 45) ; un oiselet renverse le nombre de l’autre équipe ; l’écart donne les points.',
      nassau: 'Nassau : trois paris en Best Ball, l’aller, le retour et le total ; l’équipe qui gagne le plus de trous gagne le pari.',
      sixes: 'Sixes : les équipes changent à chaque tiers de la partie (6 trous sur 18, 3 sur 9) ; meilleur net de l’équipe, 1 point par trou ; l’équipe qui gagne le plus de trous gagne la tranche.',
      wolf: 'Wolf : le loup tourne à chaque trou. Avec un partenaire : 1 point chacun au gagnant ; seul : 2 points par adversaire ; seul à l’aveugle : 3 points.',
      skins: 'Skins : le seul meilleur net gagne le skin ; à égalité, il est reporté au trou suivant.' })[L.formatOf(g)] || '';
  }
  function gainRule(g) {
    const pp = fmt$(neufPP(g));
    if (L.formatOf(g) === 'perso') { const c = g.custom || {}; return c.mode === 'equipes' ? `Gain par joueur = écart de points × ${pp}${+c.stake ? ` + ${fmt$(+c.stake)} à l’équipe qui mène` : ''}` : `Gain = différence de points avec chaque autre joueur × ${pp}`; }
    return ({ neuf: `Gain = différence de points avec chaque autre joueur × ${pp}`, bestball: `Gain = écart de trous gagnés × ${pp} par joueur`, match: `Gain = ${pp} pour le gagnant du match (match nul : rien)`, vegas: `Gain = écart de points × ${pp} par joueur`, nassau: `Gain = ${pp} par pari gagné (perdu : −${pp}), par joueur` + nassauText(g),
      sixes: `Gain = ${pp} par tranche gagnée (perdue : −${pp})`, wolf: `Gain = points × ${pp}`, skins: `Gain = skins gagnés × ${pp} payé par chaque autre joueur` })[L.formatOf(g)] || '';
  }
  // État des paris du Nassau : « L’aller : Rouges +2 · Le retour : égal »
  function nassauText(g) {
    if (!g.scores || !g.players || g.players.length !== 4) return '';
    const T = L.getTeams(g), b = L.nassauBets(g); if (!b.length) return '';
    return '. ' + b.map(x => { const v = x.pts[T[0][0]]; return `${x.name} : ${v === 0 ? 'égal' : `${L.TEAMS[v > 0 ? 0 : 1]} +${Math.abs(v)}`}${x.done ? (v ? ' (gagné)' : '') : ''}`; }).join(' · ');
  }
  // Texte court sous chaque trou de la carte
  function altShort(g, r, ini) {
    const f = L.formatOf(g);
    if (!r) return '';
    if (f === 'neuf' || (f === 'perso' && (g.custom || {}).mode !== 'equipes')) return g.players.map((p, i) => `${ini[i]} ${fmtPts(r.pts[i])}`).join(' · ');
    if (!r.pts) return 'Loup : décision ?';
    if (f === 'match') { const st = L.matchStatus(g); if (st.decidedAt && r.hole > st.decidedAt) return 'Match déjà fini'; }
    if (f === 'vegas' && r.vegas) return `${r.vegas[0]} – ${r.vegas[1]} · ` + (r.win.length ? `${r.win.map(i => ini[i]).join('+')} +${Math.abs(r.pts[r.win[0]])}` : 'Égalité');
    if (f === 'skins') return r.win.length ? `Skin ${ini[r.win[0]]}${r.units > 1 ? ' ×' + r.units : ''}` : `Report (${r.carry})`;
    const pre = f === 'wolf' && r.wolf ? `Loup ${ini[L.wolfOf(g, r.hole || 1)]}${r.wolf.partner == null ? (r.wolf.blind ? ' seul aveugle' : ' seul') : ''} · ` : '';
    return pre + (r.win.length ? `${r.win.map(i => ini[i]).join('+')} gagne${r.win.length > 1 ? 'nt' : ''}` : 'Égalité');
  }
  function smsSummaryNeuf(g) {
    const t = L.altTotals(g), gn = neufGains(g), done = g.status === 'terminée', f = L.formatOf(g);
    const played = Object.keys(g.scores || {}).filter(x => (g.scores[x] || []).some(v => v != null)).map(Number), last = played.length ? Math.max(...played) : 0;
    const date = new Date(g.createdAt || Date.now()).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
    const rank = g.players.map((p, i) => i).sort((a, b) => gn[b] - gn[a]);
    return [`${groupName()} – ${gameName(g)} – ${g.course.name.replace(/^Club de golf /i, '')}, ${date}`, done ? 'Résultat final :' : last ? `Après ${last} trou${last > 1 ? 's' : ''} :` : 'La partie commence.',
      ...(last ? rank.map((i, r) => `${r + 1}. ${g.players[i].name} : ${fmtPts(t[i])} ${ptsLabel(g)} (${gn[i] >= 0 ? '+' : '−'}${fmt$(Math.abs(gn[i]))})`) : g.players.map(p => p.name)), inviteLink(g)].join('\n');
  }
  // Bandeau « Score enregistré » : toujours en haut de la carte, pour le dernier trou terminé (tous les scores entrés)
  function lastDoneHole(g) {
    let last = 0; const [a, b] = [g.firstHole || 1, g.lastHole || 18];
    for (let x = a; x <= b; x++) if (g.players.every((p, pi) => L.getScore(g, x, pi) != null)) last = x;
    return last;
  }
  function savedBand(g) {
    if (g.status === 'terminée') return '';
    const ls0 = S.lastSaved && S.lastSaved.gid === g.id ? S.lastSaved : null;
    const h = ls0 && g.players.every((p, pi) => L.getScore(g, ls0.hole, pi) != null) ? ls0.hole : lastDoneHole(g);
    if (!h) return '';
    let t = ls0 && ls0.hole === h && L.formatOf(g) !== 'match' ? ls0.text : '';
    if (!t) {
      if (isAlt(g)) { const r = L.altHoles(g)[h]; t = r ? `Trou ${h} · ${r.desc}` : ''; if (L.formatOf(g) === 'match') { const st = L.matchStatus(g); t += ' · ' + (st.winner >= 0 ? g.players[st.winner].name.split(' ')[0] + ' ' : '') + st.text; } }
      else { const nt = L.holeNetText(g, h); t = [nt ? `Trou ${h} · ${nt}` : '', L.totalText(g).replace(/\.$/, '')].filter(Boolean).join(' · '); }
    }
    t = t.replace(new RegExp('^Trou ' + h + ' · '), '');
    return `<button type="button" class="saved-band" data-detail="${h}"><span class="sb-ok" aria-hidden="true">✓</span><span><b>Score enregistré · trou ${h}</b>${t ? `<small>${esc(t)}</small>` : ''}</span><span class="sb-go" aria-hidden="true">›</span></button>`;
  }
  function holeDetailNeuf(g, h) {
    const ih = L.holeInfo(g, h, 0), r = L.altHoles(g)[h], f = L.formatOf(g);
    const rows = g.players.map((p, i) => { const s = L.getScore(g, h, i), k = L.strokesOnHole(p.strokes, ih.si);
      return `<tr><td>${esc(p.name)}</td><td>${s == null ? '—' : s}</td><td>${k > 0 ? BALL.repeat(k) : '—'}</td><td><b>${s == null ? '—' : s - k}</b></td><td><b>${r && r.pts ? (r.pts[i] > 0 && f !== 'neuf' ? '+' : '') + fmtPts(r.pts[i]) : '—'}</b></td></tr>`; }).join('');
    openSheet(`<h3>Trou ${h}</h3><p class="note" style="margin-top:-8px">Normale ${ih.par} · Handicap ${ih.si} · ${esc(gameName(g))}</p>
      <table class="detail-t"><thead><tr><th>Joueur</th><th>Brut</th><th>Coups</th><th>Net</th><th>Points</th></tr></thead><tbody>${rows}</tbody></table>
      ${r ? `<p class="detail-desc">${esc(r.desc)}</p>` : ''}<p class="note">${esc(ruleText(g))}</p>
      <div class="sheet-actions"><button class="btn" data-close type="button">Fermer</button></div>`, sh => { sh.querySelector('[data-close]').onclick = closeSheet; });
  }
  function vGameNeuf(g) {
    const h = g.currentHole || 1, hi = L.holeInfo(g, h, 0), owner = isOwner();
    const f = L.formatOf(g), fname = gameName(g), AH = L.altHoles(g);
    const tots = g.players.map((p, i) => L.totals(g, i)), pts = L.altTotals(g), gn = neufGains(g), ini = L.initials(g.players);
    const wolfNow = f === 'wolf' ? L.wolfOf(g, h) : -1;
    const sixT = f === 'sixes' ? L.sixesTeams(h, g) : (f === 'bestball' || f === 'match' || f === 'nassau' || f === 'vegas') ? L.getTeams(g) : null;
    const dots = k => k > 0 ? BALL.repeat(k) : '';
    const ph = g.players.map((p, pi) => { const k = L.strokesOnHole(p.strokes, hi.si);
      return `<${owner ? `button type="button" data-allscores="${h}"` : 'div'} class="hp"><div class="nm">${esc(p.name)}${g.responsable === pi ? ' ★' : ''}${pi === wolfNow ? ' <span class="wolf-tag">Loup</span>' : ''}</div><div class="hp-idx">Index ${String(p.index).replace('.', ',')}${sixT && g.players.length > 2 ? ` · <span class="pair">${sixT[0].includes(pi) ? 'Équipe A' : 'Équipe B'}</span>` : ''}</div><div class="dots">${k ? dots(k) : ''}</div><div class="hp-strk">${strokeHoles(g, p)}</div><div class="hp-tot">${tots[pi].played ? `<span>Brut <b>${tots[pi].gross}</b> · Net <b>${tots[pi].net}</b></span><span class="hp-n">${tots[pi].played} trou${tots[pi].played > 1 ? 's' : ''}</span>` : 'Aucun trou joué'}</div><div class="hp-pts"><b>${(pts[pi] > 0 && f !== 'neuf' ? '+' : '') + fmtPts(pts[pi])}</b> ${ptsLabel(g)}</div></${owner ? 'button' : 'div'}>`; });
    const rank = g.players.map((p, i) => i).sort((a, b) => gn[b] - gn[a] || pts[b] - pts[a]);
    const mst = f === 'match' ? L.matchStatus(g) : null;
    const leader = mst ? `<div class="leader-box neuf match-box"><span>Match play ${info('jeu-' + f)}</span>
        <div class="mp-status ${mst.decidedAt || mst.done ? 'fini' : ''}"><b>${mst.winner >= 0 && (mst.decidedAt || mst.done) ? esc(g.players[mst.winner].name) + ' ' : mst.winner >= 0 ? esc(g.players[mst.winner].name.split(' ')[0]) + ' : ' : ''}${esc(mst.text)}</b>
        ${(mst.decidedAt || mst.done) && mst.winner >= 0 ? `<small>Empoche ${fmt$(money(g.perPoint))}</small>` : (mst.decidedAt || mst.done) ? '<small>Personne ne paie.</small>' : `<small>Enjeu de la partie : ${fmt$(money(g.perPoint))}</small>`}</div>
        ${mst.decidedAt && mst.decidedAt < (g.lastHole || 18) && g.status !== 'terminée' && owner ? '<button class="btn small" data-finish type="button">Le match est fini : terminer la partie</button>' : ''}</div>`
      : `<div class="leader-box neuf"><span>Classement · ${esc(fname)} ${info('jeu-' + f)}</span>${rank.map((i, r) => `<div class="nf-r"><b>${r + 1}. ${esc(g.players[i].name)}</b><small>${(pts[i] > 0 && f !== 'neuf' ? '+' : '') + fmtPts(pts[i])} ${ptsLabel(g)}</small><em class="${gn[i] > 0 ? 'pos' : gn[i] < 0 ? 'neg' : ''}">${gn[i] > 0 ? '+' : gn[i] < 0 ? '−' : ''}${fmt$(Math.abs(gn[i]))}</em></div>`).join('')}<div class="lb-detail"><span>${esc(gainRule(g))}</span></div></div>`;
    const row = hole => { const ih = L.holeInfo(g, hole, 0), r = AH[hole] ? { ...AH[hole], hole } : null;
      const cells = g.players.map((p, pi) => { const s = L.getScore(g, hole, pi), k = L.strokesOnHole(p.strokes, ih.si), par = L.holeInfo(g, hole, pi).par;
        const cls = s == null ? '' : (s - k < par ? 'birdie' : s - k > par ? 'bogey' : '');
        return `<td class="pc"><button class="cell ${cls}" data-cell="${hole}:${pi}" ${owner ? '' : 'disabled'}><span>${s == null ? '' : s}</span>${k ? `<i class="d">${dots(k)}</i>` : ''}${s != null && k ? `<i class="nt">${s - k}</i>` : ''}</button></td>`; }).join('');
      const sub = r ? `<tr class="calc-row ${hole === h ? 'cur' : ''}" data-detail="${hole}"><td colspan="3"></td><td colspan="${g.players.length}">${esc(altShort(g, r, ini))}</td></tr>` : '';
      return `<tr class="${hole === h ? 'cur' : ''} ${sub ? 'has-sub' : ''}"><th class="h"><button class="cell" data-hole="${hole}" style="font-size:19px">${hole}</button></th><td class="m">${ih.par}</td><td class="m">${ih.si}</td>${cells}</tr>${sub}`; };
    const sumRow = (label, from, to) => { let par = 0; for (let x = from; x <= to; x++) par += L.holeInfo(g, x, 0).par;
      return `<tr class="sum"><td colspan="2">${label}</td><td>${par}</td>${g.players.map((p, pi) => { let s = 0, any = false; for (let x = from; x <= to; x++) { const v = L.getScore(g, x, pi); if (v != null) { s += v; any = true; } } return `<td>${any ? s : ''}</td>`; }).join('')}</tr>`; };
    return `${presenceHtml(g)}
      <section class="hole-card" aria-live="polite">
        ${savedBand(g)}
        <div class="hole-top"><div class="hole-no">${h}</div><div class="hole-meta">Normale <b>${hi.par}</b> · Handicap <b>${hi.si}</b> · <b>${esc(fname)}</b>${f === 'wolf' ? ` · Loup : <b>${esc(g.players[wolfNow].name.split(' ')[0])}</b>` : ''}${f === 'sixes' ? ` · <b>${sixT[0].map(i => esc(g.players[i].name.split(' ')[0])).join(' + ')}</b> contre <b>${sixT[1].map(i => esc(g.players[i].name.split(' ')[0])).join(' + ')}</b>` : ''}</div>
          <div class="hole-nav"><button data-nav="-1" aria-label="Trou précédent">‹</button><button data-nav="1" aria-label="Trou suivant">›</button></div></div>
        ${respActions(g, owner, false)}
        <div class="team-blocks"><div class="team-block neuf"><div class="tb-grid two">${ph.join('')}</div></div></div>
      </section>
      ${leader}
      ${handoffBtn(g, owner)}
      <div class="card-scroll"><table class="sc neuf">
        <thead><tr><th>Trou</th><th>Norm.</th><th>Hcp</th>${g.players.map((p, i) => `<th class="pc" title="${esc(p.name)}">${esc(ini[i])}</th>`).join('')}</tr></thead>
        <tbody>${scoreRows(g, row, sumRow)}
        <tr class="sum"><td colspan="3">${f === 'skins' ? 'Skins' : f === 'neuf' || f === 'wolf' || f === 'vegas' ? 'Points' : 'Trous'}</td>${pts.map(x => `<td>${(x > 0 && f !== 'neuf' ? '+' : '') + fmtPts(x)}</td>`).join('')}</tr></tbody>
      </table></div>
      <button class="btn sms-btn" data-sms type="button">Texto aux joueurs</button>
      ${g.status === 'terminée' ? avisCard('game') + viralCard('game') : ''}
      ${owner ? `<div class="row game-actions bottom-actions">${g.status === 'terminée'
        ? '<span class="note">Partie terminée.</span><button class="btn ghost small" data-reopen type="button">Rouvrir</button>'
        : '<button class="btn small" data-finish type="button">Terminer la partie</button>'}
        ${S.confirmDelGame === g.id
          ? '<button class="btn small" data-delthis type="button" style="background:var(--red)">Confirmer l\'effacement</button><button class="btn ghost small" data-canceldelgame type="button">Annuler</button>'
          : '<button class="btn ghost small" data-askdelthis type="button">Effacer la partie</button>'}</div>` : ''}
      <div class="legend"><span>★ responsable de la partie (il entre les scores)</span><span>${BALL} coup reçu · petit chiffre = net</span><span>${esc(ruleText(g))} Touchez la ligne sous un trou pour le détail.</span><span>${g.players.map((p, i) => `<b>${esc(ini[i])}</b> ${esc(p.name)}`).join(' · ')}</span></div>`;
  }