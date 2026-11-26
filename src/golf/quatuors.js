  // ---------------- Quatuors ----------------
  function vQuatuors() {
    $('#barTitle').textContent = 'Parties à préparer';
    const q = S.quatuors || [], nq = S.newQuat || (S.newQuat = { name: '', players: ['', '', '', ''] });
    const opts = i => { const taken = nq.players.filter((x, j) => j !== i && x).map(L.norm);
      return `<option value="">— Joueur ${i + 1} —</option>` + S.players.filter(p => !taken.includes(L.norm(p.name))).map(p => `<option value="${esc(p.name)}" ${p.name === nq.players[i] ? 'selected' : ''}>${esc(p.name)}</option>`).join(''); };
    void opts;
    return `${offresHtml()}
      <div class="list">${q.length ? q.map(x => `<div class="item quat">
          <div><b>${esc(x.name || x.players.join(', '))}</b>${x.name ? `<span>${esc(x.players.join(', '))}</span>` : ''}</div>
          <span class="row" style="flex-wrap:nowrap;flex:none">${S.confirmDelQ === x.id
            ? `<button class="btn small" data-qdel="${esc(x.id)}" type="button" style="background:var(--red)">Retirer</button><button class="btn ghost small" data-qcancel type="button">Annuler</button>`
            : canOrganize() ? `<button class="btn small" data-qplay="${esc(x.id)}" type="button">Jouer</button><button class="btn ghost small" data-qrem="${esc(x.id)}" type="button">Rappel</button><button class="btn ghost small" data-qask="${esc(x.id)}" type="button">Retirer</button>` : ''}</span></div>`).join('')
        : ''}</div>`;
  }

  // Tailles des groupes : le plus de 4 possible, des groupes de 3 au besoin (5 → 4 + 1 en attente)
  // « 1 quatuor de 4 et 1 de 3 · 1 en attente »
  function groupsText(n) {
    const z = groupSizes(n), q4 = z.filter(x => x === 4).length, q3 = z.filter(x => x === 3).length, wait = n - z.reduce((a, b) => a + b, 0);
    if (!z.length) return n ? `${n} disponible${n > 1 ? 's' : ''} : pas assez pour un groupe` : '';
    const parts = []; if (q4) parts.push(`${q4} quatuor${q4 > 1 ? 's' : ''} de 4`); if (q3) parts.push(`${q3} quatuor${q3 > 1 ? 's' : ''} de 3`);
    return parts.join(' et ') + (wait ? ` · ${wait} en attente` : '');
  }
  function groupSizes(n) {
    for (let a = Math.floor(n / 4); a >= 0; a--) { const r = n - 4 * a; if (r % 3 === 0) return Array(a).fill(4).concat(Array(r / 3).fill(3)); }
    return n >= 4 ? [4] : n === 3 ? [3] : [];
  }
  // Varier les groupes : coût = nombre de fois (récentes surtout) où deux joueurs ont déjà été ensemble
  function pairHistory(games, quats) {
    const m = {}, add = (names, w) => { const k = names.map(L.norm); for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) { const key = [k[i], k[j]].sort().join('|'); m[key] = (m[key] || 0) + w; } };
    (games || []).slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 30).forEach((g, i) => add(g.players.map(p => p.name), 1 / (1 + i * 0.15)));
    (quats || []).forEach(q => add(q.players, 0.5));
    return (a, b) => m[[L.norm(a), L.norm(b)].sort().join('|')] || 0;
  }
  function autoGroups(names, pc, hasard) {
    if (hasard) pc = () => 0;
    const sizes = groupSizes(names.length), placed = sizes.reduce((a, b) => a + b, 0);
    const cost = gs => gs.reduce((t, g) => { let c = 0; for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) c += pc(g[i], g[j]); return t + c; }, 0);
    let best = null, bestC = Infinity;
    for (let r = 0; r < 60; r++) {
      const sh = names.slice().sort(() => Math.random() - 0.5);
      // les premiers à avoir répondu sont placés ; les autres en attente
      const pool = names.slice(0, placed).sort(() => Math.random() - 0.5);
      let gs = [], k = 0; sizes.forEach(z => { gs.push(pool.slice(k, k + z)); k += z; });
      let c = cost(gs), improved = true;
      while (improved) { improved = false;
        for (let a = 0; a < gs.length; a++) for (let b = a + 1; b < gs.length; b++) for (let i = 0; i < gs[a].length; i++) for (let j = 0; j < gs[b].length; j++) {
          [gs[a][i], gs[b][j]] = [gs[b][j], gs[a][i]]; const c2 = cost(gs);
          if (c2 < c - 1e-9) { c = c2; improved = true; } else [gs[a][i], gs[b][j]] = [gs[b][j], gs[a][i]];
        } }
      if (c < bestC) { bestC = c; best = gs.map(g => g.slice()); }
      void sh;
    }
    return { groups: best || [], waiting: names.slice(placed) };
  }
  // Former les groupes d'une date : en variant les partenaires (selon l'historique de tous) ou au hasard.
  // onPlay(g) : depuis Nouvelle partie, « Jouer ce groupe » remplit la partie avec ces joueurs.
  async function autoQuatuorsSheet(o, dt, onPlay) {
    const reps = offreReps(o).filter(r => (r.dates || []).includes(dt)).sort((a, b) => (a.at || 0) - (b.at || 0));
    const names = reps.map(r => r.name);
    let games = []; try { games = await Store.listGames(); } catch (e) { }
    const pc = pairHistory(games, S.quatuors);
    let mode = 'varier', res = autoGroups(names, pc, false);
    const label = `${o.course.replace(/^Club de golf /i, '')} – ${fmtDate(dt)}`;
    const draw = () => openSheet(`<h3>Former les groupes</h3><p class="note">${esc(label)} · ${names.length} disponibles : <b>${esc(groupsText(names.length))}</b>.</p>
      <div class="seg"><button type="button" data-gmode="varier" aria-pressed="${mode === 'varier'}"><b>Varier les partenaires</b><small>Selon les parties passées de tous</small></button><button type="button" data-gmode="hasard" aria-pressed="${mode === 'hasard'}"><b>Au hasard</b><small>Tirage aléatoire</small></button></div>
      <p class="note">${mode === 'varier' ? 'Les groupes évitent de remettre ensemble ceux qui ont souvent joué ensemble, pour que chacun joue avec tout le monde.' : 'Les joueurs sont répartis au hasard.'}</p>
      <div class="auto-groups">${res.groups.map((g, i) => `<div class="auto-g"><b>Groupe ${i + 1}${g.length === 3 ? ' (3 joueurs)' : ''}</b><span>${g.map(esc).join(', ')}</span>${onPlay ? `<button class="btn small" data-gplay="${i}" type="button" style="margin-top:8px">Jouer ce groupe</button>` : ''}</div>`).join('')}
      ${res.waiting.length ? `<div class="auto-g wait"><b>En attente</b><span>${res.waiting.map(esc).join(', ')}</span></div>` : ''}</div>
      <div class="row"><button class="btn${onPlay ? ' ghost small' : ''}" data-autosave type="button">Enregistrer ces quatuors</button><button class="btn ghost small" data-autoredo type="button">Refaire</button><button class="btn ghost small" data-close type="button">Annuler</button></div>`, sh => {
        sh.querySelector('[data-close]').onclick = closeSheet;
        sh.querySelectorAll('[data-gmode]').forEach(b => b.onclick = () => { mode = b.dataset.gmode; res = autoGroups(names, pc, mode === 'hasard'); draw(); });
        sh.querySelector('[data-autoredo]').onclick = () => { res = autoGroups(names, pc, mode === 'hasard'); draw(); };
        sh.querySelectorAll('[data-gplay]').forEach(b => b.onclick = () => { closeSheet(); onPlay(res.groups[+b.dataset.gplay]); });
        sh.querySelector('[data-autosave]').onclick = async () => {
          const add = res.groups.map((g, i) => ({ id: 'q' + Date.now().toString(36) + i, name: `${label}${res.groups.length > 1 ? ' – groupe ' + (i + 1) : ''}`, players: g.slice(), date: dt }));
          const list = (S.quatuors || []).concat(add);
          try { await Store.saveQuatuors(list); S.quatuors = list; closeSheet(); toast(`${add.length} quatuor${add.length > 1 ? 's' : ''} enregistré${add.length > 1 ? 's' : ''}.`); render(); }
          catch (e) { toast('Enregistrement impossible : ' + e.message); }
        };
      });
    draw();
  }
  function draftFromQuatuor(x) {
    const d = newDraft(), me = L.norm(ls.get('pelland.me', '') || '');

    x.players.forEach((n, i) => { if (d.players[i]) { d.players[i].name = n; d.players[i].custom = false; } });
    const r = x.players.findIndex(n => L.norm(n) === me); if (r >= 0) d.responsable = r;
    return d;
  }
