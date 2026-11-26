  async function textPlayers(g) {
    const me = L.norm(ls.get('pelland.me', '') || '');
    const inGame = new Set(g.players.map(p => L.norm(p.name)));
    let others = [];
    try { others = (await Store.listGames()).filter(x => x.id !== g.id && x.status !== 'terminée' && Math.abs((x.createdAt || 0) - Date.now()) < 36 * 3600e3); } catch (e) { }
    const whereOf = n => { const o = others.find(x => x.players.some(p => L.norm(p.name) === n)); return o ? `Joue avec ${o.players.filter(p => L.norm(p.name) !== n).map(p => p.name.split(' ')[0]).join(', ')}` : ''; };
    const lib = (S.players || []).filter(p => L.norm(p.name) !== me);
    const rows = lib.map(p => ({ p, n: L.norm(p.name), on: inGame.has(L.norm(p.name)), where: inGame.has(L.norm(p.name)) ? '' : whereOf(L.norm(p.name)) }));
    rows.sort((a, b) => (b.on - a.on) || ((!!b.where) - (!!a.where)) || a.p.name.localeCompare(b.p.name, 'fr'));
    const msg = { text: smsSummary(g) };
    const draw = sh => {
      const sel = rows.filter(r => r.on), noPh = sel.filter(r => !r.p.phone);
      const item = (r, k) => `<label class="imp-row"><input type="checkbox" data-tp="${k}" ${r.on ? 'checked' : ''}><span><b>${esc(r.p.name)}</b><small>${r.p.phone ? esc(fmtPhone(r.p.phone)) : 'Pas de numéro complet'}${r.where ? ' · ' + esc(r.where) : ''}</small></span></label>`;
      const idx = r => rows.indexOf(r);
      const mine = rows.filter(r => inGame.has(r.n)), rest = rows.filter(r => !inGame.has(r.n));
      sh.innerHTML = `<h3>Texto</h3>
        <p class="note" style="margin:0 0 4px">Joueurs de cette partie</p><div class="imp-list">${mine.map(r => item(r, idx(r))).join('') || '<p class="note" style="padding:10px">—</p>'}</div>
        ${rest.length ? `<details class="tp-more" ${rest.some(r => r.on) ? 'open' : ''}><summary>Ajouter un joueur d’une autre partie</summary><div class="imp-list">${rest.map(r => item(r, idx(r))).join('')}</div></details>` : ''}
        <label>Message<textarea id="tpMsg" rows="5">${esc(msg.text)}</textarea></label>
        ${noPh.length ? `<p class="warn" style="margin:6px 0">Pas de numéro complet pour ${esc(noPh.map(r => r.p.name).join(', '))} : ajoutez-le dans Joueurs.</p>` : ''}
        <div class="row"><button class="btn small" id="tpGo" type="button" ${sel.some(r => r.p.phone) ? '' : 'disabled'}>Envoyer le texto (${sel.filter(r => r.p.phone).length})</button><button class="btn ghost small" data-close type="button">Annuler</button></div>`;
      sh.querySelector('#tpMsg').oninput = e => { msg.text = e.target.value; };
      sh.querySelectorAll('[data-tp]').forEach(c => c.onchange = () => { rows[+c.dataset.tp].on = c.checked; draw(sh); });
      sh.querySelector('[data-close]').onclick = closeSheet;
      sh.querySelector('#tpGo').onclick = () => {
        const nums = rows.filter(r => r.on && r.p.phone).map(r => r.p.phone);
        closeSheet(); openSms(nums, msg.text);
      };
    };
    openSheet('', sh => draw(sh));
  }
  // Détail d'un trou (en touchant la ligne de calcul sous le trou)
  function holeDetail(h) {
    const g = S.game; if (!g) return;
    if (isAlt(g)) return holeDetailNeuf(g, h);
    const ih = L.holeInfo(g, h, 0), e = (g.events || {})[h] || {}, mult = L.holeMultiplier(g, h);
    const order = [...L.getTeams(g)[1], ...L.getTeams(g)[0]];
    const rows = order.map(pi => { const p = g.players[pi], s = L.getScore(g, h, pi), k = L.strokesOnHole(p.strokes, ih.si);
      return `<tr><td class="tc${teamOf(g, pi)}">${esc(p.name)}</td><td>${s == null ? '—' : s}</td><td>${k > 0 ? BALL.repeat(k) : k < 0 ? '○'.repeat(-k) : '—'}</td><td><b>${s == null ? '—' : s - k}</b></td></tr>`; }).join('');
    const lines = [];
    lines.push(`<b>Statut :</b> ${e.reroll ? 'Reroll (points ×4)' : (e.presses || []).length ? 'Press (points ×2)' : 'Normal'}`);
    const r = L.holePoints(g, h);
    if (r) {
      const v = 2 * r.mult, nm = a => a.map(i => esc(g.players[i].name)).join(' et '), tm = k => `<span class="tc${k}">les ${L.TEAMS[k]}</span>`;
      lines.push(`<b>Point plus bas :</b> ${r.low.team != null ? `${nm(r.low.players)}, net ${r.low.net} : ${v} points pour ${tm(r.low.team)}.` : `égalité au plus bas net (${r.low.net}), pas de points.`}`);
      lines.push(`<b>Point plus haut :</b> ${r.high.team != null ? `${nm(r.high.players)}, net ${r.high.net} : ${v} points pour ${tm(1 - r.high.team)}.` : `égalité au plus haut net (${r.high.net}), pas de points.`}`);
      if (mult > 1) lines.push(`<b>Multiplicateur :</b> ${mult === 4 ? 'reroll, points ×4' : 'press, points ×2'} (déjà compté ci-dessus).`);
    }
    const sk = L.describeSkin(g, h); if (sk) lines.push(`<b>Skin :</b> ${esc(sk)}`);
    const p3 = L.describePar3(g, h); if (p3) lines.push(`<b>Normale 3 :</b> ${esc(p3)}`);
    const hp = L.holeTotal(g, h); if (hp) lines.push(`<b>Résultat du trou :</b> <span class="tc0">Rouges ${hp[0]}</span> · <span class="tc1">Bleus ${hp[1]}</span>`);
    const cum = [0, 0]; for (let x = 1; x <= h; x++) { const t = L.holeTotal(g, x); if (t) { cum[0] += t[0]; cum[1] += t[1]; } }
    if (hp) lines.push(`<b>Après ce trou :</b> ${cum[0] === cum[1] ? 'égalité' : cum[0] > cum[1] ? `<span class="tc0">Rouges ${cum[0]}</span> · Bleus ${cum[1]}` : `<span class="tc1">Bleus ${cum[1]}</span> · Rouges ${cum[0]}`}`);
    openSheet(`<h3>Trou ${h}</h3><p class="note" style="margin-top:-8px">Normale ${ih.par} · Handicap ${ih.si}</p>
      <table class="detail-t"><thead><tr><th>Joueur</th><th>Brut</th><th>Coups</th><th>Net</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="detail-lines">${lines.map(l => `<p>${l}</p>`).join('')}</div>
      <p class="note">Calcul abrégé : ${esc(L.calcText(g, h).replace(/^ · /, ''))}</p>
      <div class="sheet-actions">${isOwner() ? '<button class="btn ghost" data-edithole type="button">Modifier le trou (press, reroll, skin)</button>' : ''}<button class="btn" data-close type="button">Fermer</button></div>`, sh => { sh.querySelector('[data-close]').onclick = closeSheet; const eh = sh.querySelector('[data-edithole]'); if (eh) eh.onclick = () => { closeSheet(); setTimeout(() => holeSheet(h), 50); }; });
  }
  function allScoresSheet(h) {
    const g = S.game, P = g.players;
    const vals = P.map((p, pi) => L.getScore(g, h, pi));
    const st0 = L.skinTeam(g, h);
    let skin = st0 == null ? undefined : st0; // undefined = pas encore dit ; -1 = pas de skin ; 0/1 = équipe
    let skinPlayer = ((g.events || {})[h] || {}).skinPlayer; if (skinPlayer === undefined) skinPlayer = null;
    const neuf = isAlt(g), T = neuf ? null : L.getTeams(g), order = neuf ? g.players.map((_, i) => i) : [...T[1], ...T[0]]; // Bleus puis Rouges
    const isWolf = L.formatOf(g) === 'wolf', wf = isWolf ? L.wolfOf(g, h) : -1;
    let wolf = isWolf ? (((g.events || {})[h] || {}).wolf || null) : null;
    const draw = () => {
      const sheet = $('#sheet');
      // tout joueur peut avoir la skin ; s'il ne fait pas la normale (brut), le point va à l'autre équipe
      const eligible = order.filter(pi => vals[pi] != null);
      if (skinPlayer != null && !eligible.includes(skinPlayer)) { skinPlayer = null; if (skin !== -1) skin = st0 == null ? undefined : st0; }
      const needSkin = (!neuf && vals.some(v => v != null) && skin === undefined) || (isWolf && vals.some(v => v != null) && !wolf);
      sheet.innerHTML = `<h3>Trou ${h} · normale ${L.holeInfo(g, h, 0).par}</h3>
        <div class="allscores">${order.map(pi => { const p = P[pi];
          const par = L.holeInfo(g, h, pi).par, k = L.strokesOnHole(p.strokes, g.course.holes[h - 1].si);
          const lo = Math.max(1, par - 2), hi = lo + 5;
          const opts = []; for (let n = lo; n <= hi; n++) opts.push(n);
          if (vals[pi] != null && !opts.includes(vals[pi])) opts.push(vals[pi]);
          return `<div class="as-row ${vals[pi] != null ? 'done' : ''}"><div class="as-name ${neuf ? '' : 'tc' + teamOf(g, pi)}">${esc(p.name)}${k ? ` <small class="as-k">${BALL.repeat(Math.max(0, k))}</small>` : ''}</div>
            <div class="as-opts">${opts.map(n => `<button type="button" class="as-n ${n === par ? 'par' : ''}" data-p="${pi}" data-n="${n}" aria-pressed="${vals[pi] === n}">${n}</button>`).join('')}<button type="button" class="as-n more" data-p="${pi}" data-plus="1" aria-label="Plus">+</button></div></div>`;
        }).join('')}</div>
        ${isWolf ? `<div class="toggles"><div class="tg"><span>Le loup ${esc(P[wf].name)} joue avec…</span>${P.map((p, i) => i === wf ? '' : `<button type="button" class="pill" data-wolfp="${i}" aria-pressed="${!!wolf && wolf.partner === i}">${esc(p.name)}</button>`).join('')}<button type="button" class="pill" data-wolfp="lone" aria-pressed="${!!wolf && wolf.partner == null && !wolf.blind}">Seul (×2)</button><button type="button" class="pill" data-wolfp="blind" aria-pressed="${!!wolf && !!wolf.blind}">Seul à l’aveugle (×3)</button></div></div>` : ''}
        ${neuf ? '' : `<div class="toggles"><div class="tg"><span>Skin à… (sans la normale, le point va à l’autre équipe)</span>${eligible.length ? eligible.map(pi => `<button type="button" class="pill team-pill t${teamOf(g, pi)}" data-skinp="${pi}" aria-pressed="${skinPlayer === pi}">${esc(P[pi].name)}</button>`).join('') : `<span class="note" style="width:auto">${vals.every(v => v == null) ? 'Entrez les scores d\'abord.' : 'Personne n\'a fait la normale.'}</span>`}<button type="button" class="pill" data-skinp="-1" aria-pressed="${skin === -1}">Pas de skin</button></div>
        <p class="note">${skin === 0 || skin === 1 ? (skinPlayer != null ? (vals[skinPlayer] != null && vals[skinPlayer] > L.holeInfo(g, h, skinPlayer).par ? `Skin à ${esc(P[skinPlayer].name)}, sans la normale : le point va aux ${L.TEAMS[1 - skin]}.` : `Skin à ${esc(P[skinPlayer].name)} (${L.TEAMS[skin]}).`) : `Skin pour les ${L.TEAMS[skin]}.`) : skin === -1 ? 'Pas de skin.' : 'Skin pas encore indiquée.'}</p></div>`}
        ${needSkin ? `<p class="warn" style="margin:0">${isWolf ? 'Indiquez le choix du loup avant d’enregistrer.' : 'Choisissez la skin (un joueur) ou « Pas de skin » avant d’enregistrer.'}</p>` : ''}
        <div class="sheet-foot"><button type="button" class="btn ghost small" data-close>Annuler</button><button type="button" class="btn" data-save ${needSkin ? 'disabled' : ''}>Enregistrer</button></div>`;
      sheet.querySelectorAll('[data-n]').forEach(b => b.onclick = () => { const pi = +b.dataset.p, n = +b.dataset.n; vals[pi] = vals[pi] === n ? null : n; draw(); });
      sheet.querySelectorAll('[data-plus]').forEach(b => b.onclick = () => { const pi = +b.dataset.p; vals[pi] = (vals[pi] || Math.max(1, L.holeInfo(g, h, pi).par - 2) + 5) + 1; draw(); });
      sheet.querySelectorAll('[data-wolfp]').forEach(b => b.onclick = () => { const v = b.dataset.wolfp; wolf = v === 'lone' ? { lone: true } : v === 'blind' ? { lone: true, blind: true } : { partner: +v }; draw(); });
      sheet.querySelectorAll('[data-skinp]').forEach(b => b.onclick = () => {
        const v = +b.dataset.skinp;
        if (v === -1) { skin = -1; skinPlayer = null; } else { skinPlayer = v; skin = teamOf(g, v); }
        draw();
      });
      sheet.querySelector('[data-close]').onclick = closeSheet;
      sheet.querySelector('[data-save]').onclick = () => {
        if (needSkin) return toast(isWolf ? 'Indiquez le choix du loup.' : 'Choisissez la skin ou « Pas de skin ».');
        const scores = {}; vals.forEach((v, pi) => { if (v != null && v !== L.getScore(g, h, pi)) scores[pi] = v; });
        const acts = [];
        if (isWolf && wolf) acts.unshift({ type: 'wolf', hole: h, wolf });
        if (Object.keys(scores).length) acts.push({ type: 'scores', hole: h, scores });
        if (!neuf && skin !== undefined && (skin !== st0 || skinPlayer != null)) acts.push({ type: 'skin', hole: h, team: skin, player: skin >= 0 ? skinPlayer : null });
        closeSheet();
        if (acts.length) commit(acts, true);
      };
    };
    openSheet('', () => draw());
  }
  function scoreSheet(h, pi) {
    const g = S.game, p = g.players[pi], par = L.holeInfo(g, h, pi).par;
    openSheet(`<h3>Trou ${h} · ${esc(p.name)}</h3><p class="note">Normale ${par}${L.strokesOnHole(p.strokes, g.course.holes[h - 1].si) ? ' · reçoit un coup' : ''}</p>
      <div class="pad">${Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<button data-n="${n}" class="${n === par ? 'par' : ''}">${n}</button>`).join('')}</div>
      <div class="row"><button class="btn ghost small" data-n="">Effacer</button><button class="btn ghost small" data-close>Fermer</button></div>`, s => {
      s.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
        closeSheet();
        if (b.dataset.n === '') {
          S.undo.push(JSON.parse(JSON.stringify(g)));
          const ng = JSON.parse(JSON.stringify(g)); if (ng.scores[h]) ng.scores[h][pi] = null; S.game = ng; render(); Store.saveGame(ng);
        } else commit([{ type: 'scores', hole: h, scores: { [pi]: +b.dataset.n } }], false);
      });
      s.querySelector('[data-close]').onclick = closeSheet;
    });
  }
  function holeSheet(h) {
    const g = S.game, e = (g.events || {})[h] || {}, isPar3 = L.holeInfo(g, h, 0).par === 3;
    const P = g.players;
    openSheet(`<h3>Trou ${h}</h3>
      <div class="toggles">
        <div class="tg"><span>Aller à ce trou</span><button class="pill" data-goto>Trou courant</button></div>
        <div class="tg"><span>Statut du trou</span>${(() => { const pt = L.pressTeamOf(g, h), st = e.reroll ? 'reroll' : (e.presses || []).length ? 'press' + (pt != null ? pt : '') : 'normal';
          return `<button class="pill" data-status="normal" aria-pressed="${st === 'normal'}">Normal</button>` + [0, 1].map(k => `<button class="pill team-pill t${k}" data-status="press${k}" aria-pressed="${st === 'press' + k}">Pressé par les ${L.TEAMS[k]} (×2)</button>`).join('') + `<button class="pill" data-status="reroll" aria-pressed="${st === 'reroll'}" ${(e.presses || []).length ? '' : 'disabled'}>Reroll (×4)</button>`; })()}
          <span class="note" style="width:auto">Le reroll se choisit après la press.</span></div>
        ${isPar3 ? `<div class="tg"><span>Normale 3</span><span class="note" style="width:auto">Calculée automatiquement : l'équipe qui a la skin et fait la normale gagne l'argent.</span></div>` : ''}
        <div class="tg"><span>Skin à… (1 point, multiplié par la press ; sans la normale, le point va à l’autre équipe)</span>${(() => { const sp = e.skinPlayer, stt = L.skinTeam(g, h), el = P.map((p, i) => i).filter(i => L.getScore(g, h, i) != null);
          return (el.length ? el.map(i => `<button class="pill team-pill t${teamOf(g, i)}" data-skinpl="${i}" aria-pressed="${sp === i}">${esc(P[i].name)}</button>`).join('') : [0, 1].map(k => `<button class="pill team-pill t${k}" data-skin="${k}" aria-pressed="${stt === k}">${L.TEAMS[k]}</button>`).join('')) + `<button class="pill" data-skin="-1" aria-pressed="${stt === -1}">Pas de skin</button>`; })()}</div>
      </div>
      <button class="btn ghost small" data-close>Fermer</button>`, s => {
      const done = acts => { closeSheet(); commit(acts, false); };
      s.querySelector('[data-goto]').onclick = () => done([{ type: 'goto', hole: h }]);
      s.querySelectorAll('[data-status]').forEach(b => b.onclick = () => {
        const v = b.dataset.status;
        if (v === 'normal') return done([{ type: 'unpress', hole: h }]);
        if (v === 'reroll') return done([{ type: 'reroll', hole: h, on: true }]);
        const k = +v.slice(5); // press0 / press1 : on remplace la press existante
        done([{ type: 'unpress', hole: h }, { type: 'press', hole: h, team: k, player: null, force: true }]);
      });
      s.querySelectorAll('[data-skinpl]').forEach(b => b.onclick = () => { const pi = +b.dataset.skinpl; done([{ type: 'skin', hole: h, team: teamOf(g, pi), player: pi }]); });
      s.querySelectorAll('[data-skin]').forEach(b => b.onclick = () => {
        done([{ type: 'skin', hole: h, team: +b.dataset.skin }]);
      });
      s.querySelector('[data-close]').onclick = closeSheet;
    });
  }

  // Saisie manuelle : les 4 scores du trou et la skin, en une seule fois.
  // Gain par joueur de l'équipe qui mène : game + revirements + normales 3 (net) + points × $/point
  function leaderMoney(g) {
    const t = L.teamPoints(g).tot, d = Math.abs(t[0] - t[1]), k = t[0] > t[1] ? 0 : 1, o = 1 - k, p3 = L.par3Results(g);
    const stake = money(g.stake), lc = L.leadChanges(g), lcv = money(g.leadChangeValue), pp = g.perPoint == null || g.perPoint === '' ? 1 : money(g.perPoint);
    const parts = [[stake, 'game'], [lc * lcv, `${lc} revirement${lc > 1 ? 's' : ''}`], [p3.money[k] - p3.money[o], 'normales 3'], [d * pp, `${d} pt${d > 1 ? 's' : ''} × ${fmt$(pp)}`]];
    return { t, d, k, tie: t[0] === t[1], parts, tot: parts.reduce((a, x) => a + x[0], 0) };
  }
  // Texto aux joueurs : ouvre Messages avec les numéros et le résumé de la partie
  function smsSummary(g) {
    if (isAlt(g)) return smsSummaryNeuf(g);
    const m = leaderMoney(g), T = L.getTeams(g);
    const played = Object.keys(g.scores || {}).filter(x => (g.scores[x] || []).some(v => v != null)).map(Number);
    const last = played.length ? Math.max(...played) : 0, done = g.status === 'terminée';
    const date = new Date(g.createdAt || Date.now()).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
    const lines = [`${groupName()} – ${gameName(g)} – ${g.course.name.replace(/^Club de golf /i, '')}, ${date}`];
    lines.push(done ? 'Résultat final :' : last ? `Après ${last} trou${last > 1 ? 's' : ''} :` : 'La partie commence.');
    if (last) {
      if (m.tie) lines.push(`Égalité, ${m.t[0]} points chacun.`);
      else lines.push(`${L.TEAMS[m.k]} ${done ? 'gagnent' : 'mènent'} par ${m.d} point${m.d > 1 ? 's' : ''} nets (Bleus ${m.t[1]} · Rouges ${m.t[0]}).`, `${done ? 'Gain' : 'Gain en ce moment'} : ${fmt$(m.tot)} par joueur pour les ${L.TEAMS[m.k]}.`);
    }
    lines.push(`Bleus : ${T[1].map(i => g.players[i].name).join(', ')}`, `Rouges : ${T[0].map(i => g.players[i].name).join(', ')}`);
    lines.push(inviteLink(g));
    return lines.join('\n');
  }
  // Lignes de la carte selon les trous joués (18, aller ou retour)
  function scoreRows(g, row, sumRow) {
    const [h0, h1] = L.holeRange(g), rows = a => Array.from({ length: 9 }, (_, i) => row(a + i)).join('');
    if (h0 === 1 && h1 === 18) return rows(1) + sumRow('Aller', 1, 9) + rows(10) + sumRow('Retour', 10, 18) + sumRow('Total', 1, 18, true);
    return rows(h0) + sumRow('Total', h0, h1, true);
  }
