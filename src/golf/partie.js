  // ---------------- Partie ----------------
  function vGame() {
    const g = S.game;
    if (!g) { $('#barTitle').textContent = 'Chargement…'; return '<p class="note">Chargement de la partie…</p>'; }
    $('#barTitle').textContent = `${g.course.name.replace(/^Club de golf /i, '')} · ${g.id}`;
    if (isAlt(g)) return vGameNeuf(g);
    const h = g.currentHole || 1;
    const hi = L.holeInfo(g, h, 0);
    const ev = (g.events || {})[h] || {};
    const owner = isOwner();
    const tots = g.players.map((p, i) => L.totals(g, i));
    const played = tots.filter(t => t.played);
    const best = played.length ? Math.min(...played.map(t => t.netToPar)) : null;
    const fmt = n => n === 0 ? 'E' : (n > 0 ? '+' + n : '−' + (-n));
    const dots = k => k > 0 ? BALL.repeat(k) : k < 0 ? '○'.repeat(-k) : '';

    const holeChips = [];
    const meta = [];
    if ((ev.presses || []).length) meta.push(`Pressé${ev.presses.filter(x => x != null).length ? ' par ' + ev.presses.filter(x => x != null).map(x => esc(g.players[x].name)).join(', ') : ''}`);
    else if (ev.noPress) meta.push('Pas de press');
    if (ev.reroll) meta.push('Reroll');
    else if (ev.rerollSet && (ev.presses || []).length) meta.push('Pas de reroll');
    if (hi.par === 3) { const x = L.par3Results(g).results.find(r => r.hole === h); if (x && x.status === 'pending') meta.push(`${x.value} $ en jeu`); }
    { const st = L.skinTeam(g, h); if (st === 0 || st === 1) holeChips.push(`<span class="chip team t${st}">Skin · ${ev.skinPlayer != null ? esc(g.players[ev.skinPlayer].name) : L.TEAMS[st]}</span>`); else if (st === -1) holeChips.push('<span class="chip alt">Pas de skin</span>'); }

    const p3 = L.par3Results(g);
    const colOrder = [...L.getTeams(g)[1], ...L.getTeams(g)[0]]; // Bleus puis Rouges
    const row = hole => {
      const ih = L.holeInfo(g, hole, 0); const e = (g.events || {})[hole] || {};
      const cells = colOrder.map(pi => { const p = g.players[pi];
        const s = L.getScore(g, hole, pi); const k = L.strokesOnHole(p.strokes, ih.si);
        const par = L.holeInfo(g, hole, pi).par;
        const cls = s == null ? '' : (s - k < par ? 'birdie' : s - k > par ? 'bogey' : '');
        return `<td class="pc"><button class="cell ${cls}" data-cell="${hole}:${pi}" ${owner ? '' : 'disabled'} aria-label="Trou ${hole}, ${esc(p.name)}"><span>${s == null ? '' : s}</span>${k ? `<i class="d">${dots(k)}</i>` : ''}${s != null && k ? `<i class="nt">${s - k}</i>` : ''}</button></td>`;
      }).join('');
      // Statut : Normal, Press ou Reroll
      const played = ((g.scores || {})[hole] || []).some(v => v != null);
      const status = e.reroll ? 'Reroll' : (e.presses || []).length ? 'Press' : (played || e.noPress) ? 'Normal' : '';
      const st = status ? [`<i class="${status === 'Normal' ? '' : 'p'}">${status}</i>`] : [];
      let calc = L.calcText(g, hole);
      if (L.holePoints(g, hole) && L.skinTeam(g, hole) == null) calc += ' S?';
      if (ih.par === 3) { const x = p3.results.find(r => r.hole === hole); if (x && x.status === 'won') calc += ` $${x.amount}${x.team === 0 ? 'R' : 'B'}`; else if (x && x.status === 'carried') calc += ` $${x.value}→`; }
      const hp = L.holeTotal(g, hole);
      if (hp) { cum[0] += hp[0]; cum[1] += hp[1]; }
      const tot = hp ? leadHtml(cum) : '';
      const calcTxt = esc(calc.replace(/^ · /, '').trim());
      const sub = (status || calcTxt) ? `<tr class="calc-row ${hole === h ? 'cur' : ''}" data-detail="${hole}"><td colspan="3"></td><td colspan="6">${status ? `<i class="${status === 'Normal' ? '' : 'p'}">${status}</i> ` : ''}${calcTxt}</td></tr>` : '';
      return `<tr class="${hole === h ? 'cur' : ''} ${sub ? 'has-sub' : ''}"><th class="h"><button class="cell" data-hole="${hole}" style="font-size:19px">${hole}</button></th><td class="m">${ih.par}</td><td class="m">${ih.si}</td>${cells}<td class="stat col-wide"><div class="ev">${st.join('')}</div></td><td class="calc col-wide">${calcTxt}</td><td class="tp0">${hp ? hp[0] : ''}</td><td class="tp1">${hp ? hp[1] : ''}</td></tr>${sub}`;
    };
    const sumRow = (label, from, to, final) => {
      const cells = colOrder.map(pi => { const p = g.players[pi];
        let s = 0, any = false; for (let x = from; x <= to; x++) { const v = L.getScore(g, x, pi); if (v != null) { s += v; any = true; } }
        return `<td>${any ? s : ''}</td>`;
      }).join('');
      let par = 0, tb = [0, 0]; for (let x = from; x <= to; x++) { par += L.holeInfo(g, x, 0).par; const hp = L.holeTotal(g, x); if (hp) { tb[0] += hp[0]; tb[1] += hp[1]; } }
      return `<tr class="sum"><td colspan="2">${label}</td><td>${par}</td>${cells}<td class="col-wide"></td><td class="col-wide"></td><td class="tp0">${tb[0]}</td><td class="tp1">${tb[1]}</td></tr>`;
    };
    const cum = [0, 0];
    const ini = L.initials(g.players);
    function leadHtml(t) { return t[0] === t[1] ? '<span>Égal</span>' : t[0] > t[1] ? `<span class="tc0">R ${t[0]}</span>` : `<span class="tc1">B ${t[1]}</span>`; }

    return `
      ${presenceHtml(g)}
      <section class="hole-card" aria-live="polite">
        ${savedBand(g)}
        <div class="hole-top">
          <div class="hole-no">${h}</div>
          <div class="hole-meta">Normale <b>${hi.par}</b> · Handicap <b>${hi.si}</b>${meta.map(m => ` · <b>${m}</b>`).join('')}</div>
          <div class="hole-nav"><button data-nav="-1" aria-label="Trou précédent">‹</button><button data-nav="1" aria-label="Trou suivant">›</button></div>
        </div>
        ${respActions(g, owner, true)}
        <div class="money-boxes${owner && g.status !== 'terminée' ? ' editable' : ''}"${owner && g.status !== 'terminée' ? ' data-editmoney role="button" tabindex="0" title="Toucher pour modifier les montants"' : ''}>
          <div class="mbox green"><span>La game commence à ${info('game')}</span><b>${g.stake ? fmt$(money(g.stake)) : '—'}</b></div>
          <div class="mbox green"><span>À chaque revirement ${info('revirement')}</span><b>${g.leadChangeValue ? fmt$(money(g.leadChangeValue)) : '—'}</b>${g.leadChangeValue ? (n => `<small class="mbox-sub">${n} revirement${n > 1 ? 's' : ''}${n ? ' = ' + fmt$(n * money(g.leadChangeValue)) : ''}</small>`)(L.leadChanges(g)) : ''}</div>
          ${(r => `<div class="mbox yellow"><span>Les pars 3 sont à ${info('par3now')}</span><b>${r.next ? fmt$(r.nextValue) : '—'}</b>${r.next ? `<small class="mbox-sub">au trou ${r.next}</small>` : ''}</div>`)(L.par3Results(g))}
        </div>
        <div class="team-blocks">${[1, 0].map(k => { const tm = L.getTeams(g)[k], teamPts = L.teamPoints(g).tot;
          const tt = L.trailingTeam(g, h), pt = L.pressTeamOf(g, h), started = ((g.scores || {})[h] || []).some(v => v != null);
          let btn = '';
          if (owner && (tt === k || (started && tt == null)) && !(ev.presses || []).length) btn = `<button type="button" class="tb-btn t${k}" data-press-team="${k}">Press</button>`;
          else if (owner && pt === k) btn = `<button type="button" class="tb-btn t${k} on" data-unpress="1">Pressé ✓</button>`;
          else if (owner && pt != null && pt !== k) btn = `<button type="button" class="tb-btn t${k} ${ev.reroll ? 'on' : ''}" data-reroll-team="${ev.reroll ? 0 : 1}">${ev.reroll ? 'Reroll ✓' : 'Reroll'}</button>`;
          else if (!owner && pt === k) btn = `<span class="tb-btn t${k} on">Pressé</span>`;
          else if (!owner && pt != null && ev.reroll) btn = `<span class="tb-btn t${k} on">Reroll</span>`;
          const ph = tm.map(pi => { const p = g.players[pi]; const k = L.strokesOnHole(p.strokes, hi.si); const s = L.getScore(g, h, pi); return `<${owner ? `button type="button" data-allscores="${h}"` : 'div'} class="hp"><div class="nm tc${teamOf(g, pi)}">${esc(p.name)}${g.responsable === pi ? ' ★' : ''}</div><div class="hp-idx">Index ${String(p.index).replace('.', ',')}</div><div class="hp-strk">${strokeHoles(g, p)}</div><div class="dots">${k ? dots(k) + (k < 0 ? ' redonne' : '') : ''}</div><div class="hp-tot">${tots[pi].played ? `<span>Brut <b>${tots[pi].gross}</b> · Net <b>${tots[pi].net}</b></span><span class="hp-n">${tots[pi].played} trou${tots[pi].played > 1 ? 's' : ''}</span>` : 'Aucun trou joué'}</div></${owner ? 'button' : 'div'}>`; });
          if (btn) btn += info('press');
          return `<div class="team-block t${k}"><div class="tb-name">${L.TEAMS[k]}</div><div class="tb-grid two">${ph[0]}${ph[1]}</div>${btn}</div>`; }).join('')}</div>
        ${holeChips.length ? `<div class="chips">${holeChips.join('')}</div>` : ''}
      </section>


      ${(() => { const t = L.teamPoints(g).tot, d = Math.abs(t[0] - t[1]), k = t[0] > t[1] ? 0 : 1, o = 1 - k;
        const pts = `<div class="lb-pts"><span class="tc1">Bleus <b>${t[1]}</b></span><span class="tc0">Rouges <b>${t[0]}</b></span></div>`;
        if (t[0] === t[1]) return `<div class="leader-box even"><span>Meneurs ${info('meneurs')}</span><div><b>Égalité</b><small>0 point net d’écart</small></div>${pts}</div>`;
        const { parts, tot } = leaderMoney(g);
        return `<div class="leader-box t${k}"><span>Meneurs ${info('meneurs')}</span><div><b class="tc${k}">${L.TEAMS[k]}</b><small>+${d} point${d > 1 ? 's' : ''} net${d > 1 ? 's' : ''}</small></div>${pts}
          <div class="lb-money"><span>Gain par joueur des ${L.TEAMS[k]} en ce moment</span><b class="tc${k}">${fmt$(tot)}</b></div>
          <div class="lb-detail">${parts.map(([v, l]) => `<span>${v < 0 ? '−' : '+'} ${fmt$(Math.abs(v))} <i>${l}</i></span>`).join('')}</div></div>`; })()}
      ${handoffBtn(g, owner)}
      <div class="card-scroll"><table class="sc">
        <thead><tr><th>Trou</th><th>Norm.</th><th>Hcp</th>${colOrder.map(i => { const p = g.players[i]; return `<th class="pc tc${teamOf(g, i)}" title="${esc(p.name)}">${esc(ini[i])}</th>`; }).join('')}<th class="col-wide">Statut</th><th class="col-wide">Calcul</th><th class="tc0">Rouge</th><th class="tc1">Bleu</th></tr></thead>
        <tbody>${scoreRows(g, row, sumRow)}</tbody>
      </table></div>
      <button class="btn sms-btn" data-sms type="button">Texto aux joueurs</button>
      ${g.status === 'terminée' ? avisCard('game') + viralCard('game') : ''}
        ${owner ? `<div class="row game-actions bottom-actions">${g.status === 'terminée'
          ? '<span class="note">Partie terminée.</span><button class="btn ghost small" data-reopen type="button">Rouvrir</button>'
          : '<button class="btn small" data-finish type="button">Terminer la partie</button>'}
          ${S.confirmDelGame === g.id
            ? '<button class="btn small" data-delthis type="button" style="background:var(--red)">Confirmer l\'effacement</button><button class="btn ghost small" data-canceldelgame type="button">Annuler</button>'
            : '<button class="btn ghost small" data-askdelthis type="button">Effacer la partie</button>'}</div>` : ''}
      <div class="legend"><span>★ responsable de la partie (il entre les scores)</span><span>${BALL} coup reçu · petit chiffre = net</span><span>Calcul : ↓ plus bas net · ↑ plus haut net · R/B équipe qui reçoit · ×2 press · ×4 reroll · S skin · O oiselet · C cabane · $ normale 3 · = résultat net</span><span>Noms à la couleur de l'équipe : <b class="tc1">Bleus</b> · <b class="tc0">Rouges</b></span><span>${g.players.map((p, i) => `<b class="tc${teamOf(g, i)}">${esc(ini[i])}</b> ${esc(p.name)}`).join(' · ')}</span><span class="narrow-only">Sous chaque trou : statut (Normal, Press, Reroll) et calcul des points</span></div>`;
  }

  function respActions(g, owner, note) {
    if (owner) return '';
    if (!(Store.mode === 'cloud' && Store.email)) return '';
    const r = g.players[g.responsable];
    return S.confirmClaim === g.id
      ? `<div class="row game-actions"><button class="btn small" data-claim type="button">Oui, je deviens responsable</button><button class="btn ghost small" data-cancelclaim type="button">Annuler</button></div>`
      : `<div class="row game-actions"><button class="btn ghost small light" data-askclaim type="button">Devenir responsable de cette partie</button>${note ? `<span class="note light">${r ? 'Responsable : ' + esc(r.name) + '. ' : ''}pour entrer les scores, la terminer ou l'effacer</span>` : ''}</div>`;
  }
