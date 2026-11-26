  // ---------------- Historique ----------------
  let historyCache = null;
  function vHistory() {
    const live = S.view === 'live';
    $('#barTitle').textContent = live ? 'Parties en cours' : 'Parties et compétitions jouées';
    if (!live && S.compList == null && !S.compLoading) { S.compLoading = true; Store.listComps().then(l => { S.compList = l; S.compLoading = false; if (S.view === 'history') render(); }).catch(() => { S.compList = []; S.compLoading = false; }); }
    if (S.historyList == null) { Store.listGames().then(l => { S.historyList = l; Store.listPresence(l.map(g => g.id)).then(m => { S.presAll = m; if (S.view === 'live') render(); }); if (S.view === 'history' || S.view === 'live') render(); }).catch(e => toast(e.message)); return '<p class="note">Chargement…</p>'; }
    const list = S.historyList.filter(g => live ? g.status !== 'terminée' : g.status === 'terminée');
    if (!live) return `<div class="seg hist-seg">${['parties', 'comps'].map(k => `<button type="button" data-histtab="${k}" aria-pressed="${(S.histTab || 'parties') === k}"><b>${k === 'parties' ? 'Parties' : 'Compétitions'}</b></button>`).join('')}</div>`
      + ((S.histTab || 'parties') === 'comps' ? compsPlayed() : gamesPlayed(list, live));
    return gamesPlayed(list, live);
  }
  document.addEventListener('click', e => {
    if (S.view !== 'history' || !e.target.closest) return;
    const t = e.target.closest('[data-histtab]'); if (t) { S.histTab = t.dataset.histtab; render(); return; }
    const c = e.target.closest('[data-comp]'); if (c) openComp(c.dataset.comp);
  });
  // Compétitions jouées : celles dont la date est passée (avant hier ; hier et aujourd'hui restent « en cours »)
  function compsPlayed() {
    if (S.compList == null) return '<p class="note">Chargement…</p>';
    const from = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const l = S.compList.filter(c => c.date && c.date < from).sort((a, b) => b.date.localeCompare(a.date));
    if (!l.length) return '<section class="card"><h2>Aucune compétition jouée</h2><p class="note">Une compétition apparaît ici le surlendemain de sa date, avec son classement final.</p></section>';
    const fmtName = f => (COMP_INFO.find(x => x.f === (f || 'match')) || {}).name || '';
    return `<div class="list">${l.map(c => `<button class="item" data-comp="${esc(c.id)}"><b>${esc(c.name)}</b><span>${esc(new Date(c.date + 'T12:00').toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }))} · ${esc(fmtName(c.format))} · ${esc((c.course || {}).name || '')} · ${(c.teams || []).length} équipes</span></button>`).join('')}</div>`;
  }
  function gamesPlayed(list, live) {
    if (!list.length) return live
      ? '<section class="card"><h2>Aucune partie en cours</h2><p class="note">Les parties apparaissent ici dès leur création, jusqu’à ce que le responsable les termine.</p></section>'
      : '<section class="card"><h2>Aucune partie terminée</h2><p class="note">Une partie apparaît ici quand le responsable touche « Terminer la partie ».</p></section>';
    return `<div class="list">${list.map(g => {
      const d = new Date(g.createdAt);
      const played = Object.keys(g.scores || {}).filter(k => (g.scores[k] || []).some(v => v != null)).length;
      let res;
      if (isAlt(g)) { const t = neufGains(g), mx = Math.max(...t); res = `${gameName(g)} · ${g.players.filter((p, i) => t[i] === mx).map(p => p.name.split(' ')[0]).join(', ')} ${mx > 0 ? '+' + fmt$(mx) : ''}`; }
      else { const t = L.teamPoints(g).tot; res = t[0] === t[1] ? 'égalité' : `${L.TEAMS[t[0] > t[1] ? 0 : 1]} +${Math.abs(t[0] - t[1])}`; }
      const mine = Store.mode !== 'cloud' || !!Store.email;
      const done = g.status === 'terminée';
      return `<div class="item hist ${done ? 'done' : ''}"><button class="hist-open" data-open="${esc(g.id)}" type="button"><b>${d.toLocaleDateString('fr-CA', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })} · ${esc(g.course.name.replace(/^Club de golf /i, ''))}</b>
        <span><span class="hist-st">${done ? 'Terminée' : 'En cours'}</span>${!done && S.presAll && S.presAll[g.id] ? ` ✓ ${Object.values(S.presAll[g.id]).filter(x => x && x.ok).length}/4 ·` : ''} ${g.players.map(p => esc(p.name)).join(', ')} · ${played}/18 trous · ${res}</span></button>
        ${mine ? (S.confirmDelGame === g.id
          ? `<span class="row"><button class="btn small" data-delgame="${esc(g.id)}" type="button" style="background:var(--red)">Effacer</button><button class="btn ghost small" data-canceldelgame type="button">Annuler</button></span>`
          : `<button class="btn ghost small" data-askdelgame="${esc(g.id)}" type="button">Effacer</button>`) : ''}</div>`;
    }).join('')}</div>`;
  }
