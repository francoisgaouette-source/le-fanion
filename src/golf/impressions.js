  // ---------- Impressions : cartes de pointage et affiches de voiturette ----------
  function imprimer(c, kind) {
    const tee = compTee(c), holes = c.course.holes, par = h => L.holePar(c.course, tee, h);
    const units = c.format === 'ryder' ? c.ryder.sessions.flatMap(s => s.matches.map(m => ({ titre: `${s.name || RY_COURT[s.type]}`, ps: [...m.a.map(id => ({ ...ryPlayer(c, id), camp: c.ryder.sides[0].name })), ...m.b.map(id => ({ ...ryPlayer(c, id), camp: c.ryder.sides[1].name }))], ph: null, dep: '' })))
      : c.format === 'tableau' ? (() => { const { main } = tbBrackets(c); const rd = main.rounds.find(r => r.ms.some(m => m.a && m.b && !m.res.winner)) || main.rounds[0]; return rd.ms.filter(m => m.a && m.b).map(m => ({ titre: rd.name, ps: [m.a, m.b], dep: '' })); })()
      : (c.teams || []).map((t, i) => { const r = compTeamResult(c, t, 0); return { titre: 'Équipe ' + (i + 1), ps: eff(c) === 'texas' ? t.p.map(p => ({ ...p, ph: null })) : r.ps, teamPh: eff(c) === 'texas' ? r.ph : null, dep: t.dep || '' }; });
    const fmt = esc(fmtName(c.format)) + (c.format === 'invite' ? ' · ' + ({ match: 'match play', stableford: 'Stableford', coups: 'en coups' })[c.jeu || 'match'] : '');
    const carte = u => {
      const row = (lab, f) => `<tr><th>${lab}</th>${holes.slice(0, 9).map((_, i) => `<td>${f(i + 1)}</td>`).join('')}<td class="s">${''}</td>${holes.slice(9).map((_, i) => `<td>${f(i + 10)}</td>`).join('')}<td class="s"></td><td class="s"></td></tr>`;
      const pts = (ph, h) => { const k = ph == null ? 0 : L.strokesOnHole(ph, holes[h - 1].si); return k ? '•'.repeat(Math.min(k, 3)) : ''; };
      return `<section class="carte"><header><b>${esc(c.name)}</b><span>${esc(u.titre)}${u.dep ? ' · départ ' + esc(u.dep) : ''}</span><span>${esc(c.course.name)} · tertre ${esc(c.tee)} · ${esc(dateLong(c.date))}</span><span>${fmt}${u.teamPh != null ? ' · hcp d’équipe ' + u.teamPh : ''}</span></header>
        <table><thead><tr><th>Trou</th>${holes.slice(0, 9).map((_, i) => `<th>${i + 1}</th>`).join('')}<th class="s">Aller</th>${holes.slice(9).map((_, i) => `<th>${i + 10}</th>`).join('')}<th class="s">Ret.</th><th class="s">Total</th></tr></thead><tbody>
        ${row('Normale', par)}${row('Hcp', h => holes[h - 1].si)}
        ${u.ps.map(p => row(`${esc(p.name)}${p.camp ? ` <small>${esc(p.camp)}</small>` : ''}${p.ph != null ? ` <small>(${p.ph})</small>` : ''}`, h => `<i>${pts(p.ph, h)}</i>`)).join('')}
        ${eff(c) === 'texas' && c.format !== 'ryder' && c.format !== 'tableau' ? row('Équipe', h => `<i>${pts(u.teamPh, h)}</i>`) + row('Départ de', () => '') : ''}
        </tbody></table><footer>Marqueur : ____________________ Joueur : ____________________ · Les points (•) sont les coups reçus.</footer></section>`;
    };
    const affiche = u => `<section class="affiche"><small>${esc(c.name)}</small><h1>${u.ps.map(p => esc(p.name)).join('<br>')}</h1><p>${esc(u.titre)}${u.dep ? ' · départ ' + esc(u.dep) : ''}</p><small>${esc(c.course.name)} · ${esc(dateLong(c.date))}</small></section>`;
    const css = `@page{size:${kind === 'affiches' ? 'letter landscape' : 'letter'};margin:12mm}body{font-family:Inter,Arial,sans-serif;color:#111;margin:0}
      .carte{page-break-inside:avoid;border:1.5px solid #222;border-radius:6px;padding:8px;margin:0 0 10mm}.carte header{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:11px;margin-bottom:6px}.carte header b{font-size:14px;width:100%}
      .carte table{width:100%;border-collapse:collapse;font-size:11px;table-layout:fixed}.carte thead th:first-child,.carte tbody th{width:24%}.carte th,.carte td{border:1px solid #999;text-align:center;height:22px;padding:0 2px}.carte tbody th{text-align:left;white-space:nowrap;padding:0 4px;max-width:120px}.carte .s{background:#eee;width:30px}.carte i{font-style:normal;font-size:9px;vertical-align:top;float:right}.carte small{font-weight:400;color:#555}.carte footer{font-size:10px;margin-top:6px;color:#444}
      .affiche{page-break-after:always;height:170mm;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;border:3px solid #0d4a2e;border-radius:14px}.affiche h1{font-size:44px;line-height:1.15;margin:12px 0}.affiche p{font-size:22px;margin:0 0 10px}.affiche small{font-size:16px;color:#333}`;
    const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${esc(c.name)} · ${kind === 'affiches' ? 'Affiches' : 'Cartes de pointage'}</title><style>${css}</style></head><body>${units.map(kind === 'affiches' ? affiche : carte).join('')}<script>onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`;
    const w = window.open('', '_blank'); if (!w) return toast('Permettez les fenêtres surgissantes pour imprimer.');
    w.document.open(); w.document.write(html); w.document.close();
  }

  function openComp(id) {
    if (S.unwatchComp) { S.unwatchComp(); S.unwatchComp = null; }
    S.comp = null; S.compTab = S.compTab || 'class'; S.confirmDelComp = false; S.compMatch = null; S.compRound = null;
    go('comp');
    // Pendant qu'on entre des scores, l'écran ne se redessine pas (on garderait la case active) ; le classement, lui, suit en direct
    S.unwatchComp = Store.watchComp(id, c => { const first = !S.comp; S.comp = c; if (!['comp', 'compTv'].includes(S.view)) return; if (!first && S.view === 'comp' && ((S.compTab || 'class') === 'score' || S.compMatch)) return; render(); });
  }
  const draftOf = c => ({ id: c.id, format: c.format || 'match', jeu: c.jeu || 'match', teamSize: c.teamSize, minDrives: c.minDrives, name: c.name, date: c.date, courseId: c.courseId, tee: c.tee, allowance: c.allowance, flights: c.flights,
    teams: JSON.parse(JSON.stringify(c.teams || [])), rounds: (c.rounds || []).map(r => ({ date: r.date, courseId: r.courseId, tee: r.tee })), ryder: c.ryder ? JSON.parse(JSON.stringify(c.ryder)) : undefined, tableau: c.tableau ? JSON.parse(JSON.stringify(c.tableau)) : undefined });

  Object.assign(bind, {
    comps(v) {
      v.querySelectorAll('[data-comp]').forEach(b => b.onclick = () => openComp(b.dataset.comp));
      v.querySelectorAll('[data-go="comps"]').forEach(b => b.onclick = () => go('comps', { compLive: false }));
      v.querySelectorAll('[data-merit]').forEach(b => b.onclick = () => { S.meritYear = +b.dataset.merit; render(); });
      v.querySelectorAll('[data-compnew]').forEach(n => n.onclick = () => go('compEdit', { compDraft: newCompDraft(n.dataset.compnew || 'match') }));
    },
    compEdit(v) {
      const d = S.compDraft; if (!d || !$('#cmFmt')) return;
      const val = s => { const e = $(s); return e ? e.value : null; };
      const sync = () => {
        d.name = val('#cmName'); d.date = val('#cmDate'); d.tee = val('#cmTee');
        if ($('#cmJeu')) d.jeu = val('#cmJeu');
        if ($('#cmSize')) d.teamSize = +val('#cmSize'); if ($('#cmMinDr')) d.minDrives = +val('#cmMinDr');
        if ($('#cmAllow')) d.allowance = +val('#cmAllow'); if ($('#cmFl')) d.flights = +val('#cmFl');
        v.querySelectorAll('[data-rdate]').forEach(i => { d.rounds[+i.dataset.rdate].date = i.value; });
        v.querySelectorAll('[data-rtee]').forEach(i => { d.rounds[+i.dataset.rtee].tee = i.value; });
        v.querySelectorAll('[data-cmn]').forEach(i => { const [a, b] = i.dataset.cmn.split('.'); d.teams[a].p[b].name = i.value.trim(); });
        v.querySelectorAll('[data-cmi]').forEach(i => { const [a, b] = i.dataset.cmi.split('.'); d.teams[a].p[b].index = i.value.trim(); });
        v.querySelectorAll('[data-cmdep]').forEach(i => { d.teams[+i.dataset.cmdep].dep = i.value.trim(); });
        v.querySelectorAll('[data-ryname]').forEach(i => { d.ryder.sides[+i.dataset.ryname].name = i.value.trim() || ['Rouges', 'Bleus'][+i.dataset.ryname]; });
        v.querySelectorAll('[data-ryn]').forEach(i => { const [k, j] = i.dataset.ryn.split('.'); d.ryder.sides[k].p[j].name = i.value.trim(); });
        v.querySelectorAll('[data-ryi]').forEach(i => { const [k, j] = i.dataset.ryi.split('.'); d.ryder.sides[k].p[j].index = i.value.trim(); });
        v.querySelectorAll('[data-msel]').forEach(i => { const [si, mi, side, q] = i.dataset.msel.split('.'); d.ryder.sessions[si].matches[mi][side][q] = i.value; });
        v.querySelectorAll('[data-tbn]').forEach(i => { d.tableau.entrants[+i.dataset.tbn].name = i.value.trim(); });
        v.querySelectorAll('[data-tbi]').forEach(i => { d.tableau.entrants[+i.dataset.tbi].index = i.value.trim(); });
        if ($('#tbSeed')) d.tableau.seeding = val('#tbSeed'); if ($('#tbConso')) d.tableau.consolation = $('#tbConso').checked;
      };
      // Nom choisi dans la liste du groupe : on reprend le dernier index connu de ce joueur
      v.querySelectorAll('[data-cmn],[data-ryn],[data-tbn]').forEach(i => i.addEventListener('change', () => { const last = (ls.get('pelland.lastPlayers', []) || []).find(p => p && L.norm(p.name || '') === L.norm(i.value)); const ix = i.nextElementSibling; if (last && last.index && ix && !ix.value) ix.value = last.index; }));
      $('#cmFmt').onchange = () => { sync(); const keep = { id: d.id, name: d.name, date: d.date, courseId: d.courseId, tee: d.tee }; const n = newCompDraft($('#cmFmt').value);
        const people = [...(d.teams || []).flatMap(t => t.p), ...((d.ryder || {}).sides || []).flatMap(s => s.p), ...((d.tableau || {}).entrants || [])].filter(p => p.name);
        Object.assign(d, n, keep, { name: n.name }); if (keep.id) d.name = keep.name;
        if (people.length && !['ryder', 'tableau'].includes(d.format)) { const k = teamSizeOf(d); d.teams = []; for (let i = 0; i < people.length; i += k) d.teams.push({ id: uid6(), dep: '', p: Array.from({ length: k }, (_, j) => people[i + j] ? { name: people[i + j].name, index: people[i + j].index } : { name: '', index: '' }) }); }
        if (people.length && d.format === 'tableau') d.tableau.entrants = people.map(p => ({ id: uid6(), name: p.name, index: p.index }));
        render(); };
      if ($('#cmJeu')) $('#cmJeu').onchange = () => { sync(); d.allowance = d.jeu === 'match' ? 90 : 85; if (d.jeu === 'match') d.rounds = []; render(); };
      $('#cmCourse').onchange = e => { sync(); d.courseId = e.target.value; const cc = S.courses.find(x => x.id === d.courseId); d.tee = ((cc && cc.tees[0]) || {}).name; render(); };
      v.querySelectorAll('[data-rcourse]').forEach(s => s.onchange = () => { sync(); const r = d.rounds[+s.dataset.rcourse]; r.courseId = s.value; const cc = S.courses.find(x => x.id === r.courseId); r.tee = ((cc && cc.tees[0]) || {}).name; render(); });
      if ($('#cmRoundAdd')) $('#cmRoundAdd').onclick = () => { sync(); const prev = d.rounds.length ? d.rounds[d.rounds.length - 1] : { date: d.date, courseId: d.courseId, tee: d.tee }; const nd = prev.date ? new Date(new Date(prev.date + 'T12:00').getTime() + 864e5).toISOString().slice(0, 10) : ''; d.rounds.push({ date: nd, courseId: prev.courseId, tee: prev.tee }); render(); };
      v.querySelectorAll('[data-rdel]').forEach(b => b.onclick = () => { sync(); d.rounds.splice(+b.dataset.rdel, 1); render(); });
      if ($('#cmAllow')) $('#cmAllow').onchange = () => { sync(); render(); };
      const resize = n => d.teams.forEach(t => { while (t.p.length < n) t.p.push({ name: '', index: '' }); t.p.length = n; });
      if ($('#cmSize')) $('#cmSize').onchange = () => { sync(); resize(d.teamSize); render(); };
      if ($('#cmAdd')) $('#cmAdd').onclick = () => { sync(); d.teams.push(blankTeam(teamSizeOf(d))); render(); };
      v.querySelectorAll('[data-cmdel]').forEach(b => b.onclick = () => { sync(); d.teams.splice(+b.dataset.cmdel, 1); render(); });
      v.querySelectorAll('[data-balance]').forEach(b => b.onclick = () => { sync(); balanceSheet(b.dataset.balance); });
      // Coupe Ryder
      v.querySelectorAll('[data-ryadd]').forEach(b => b.onclick = () => { sync(); d.ryder.sides[+b.dataset.ryadd].p.push({ id: uid6(), name: '', index: '' }); render(); });
      v.querySelectorAll('[data-rypop]').forEach(b => b.onclick = () => { sync(); const s = d.ryder.sides[+b.dataset.rypop], gone = s.p.pop(); d.ryder.sessions.forEach(x => x.matches = x.matches.filter(m => ![...m.a, ...m.b].includes(gone.id))); render(); });
      if ($('#rySessAdd')) $('#rySessAdd').onclick = () => { sync(); const type = val('#rySessType'), named = { ...d, ryder: { ...d.ryder, sides: d.ryder.sides.map(s => ({ ...s, p: s.p.filter(p => p.name) })) } };
        const ms = ryAutoMatches(named, type); if (!ms.length) return toast(type === 'simple' ? 'Nommez au moins un joueur dans chaque camp.' : 'Nommez au moins deux joueurs dans chaque camp.');
        const nType = d.ryder.sessions.filter(s => s.type === type).length; d.ryder.sessions.push({ id: uid6(), type, name: RY_COURT[type] + (nType ? ' ' + (nType + 1) : ''), matches: ms }); render(); };
      v.querySelectorAll('[data-sdel]').forEach(b => b.onclick = () => { sync(); d.ryder.sessions.splice(+b.dataset.sdel, 1); render(); });
      v.querySelectorAll('[data-sregen]').forEach(b => b.onclick = () => { sync(); const s = d.ryder.sessions[+b.dataset.sregen]; s.matches = ryAutoMatches({ ...d, ryder: { ...d.ryder, sides: d.ryder.sides.map(x => ({ ...x, p: x.p.filter(p => p.name) })) } }, s.type); render(); });
      // Tableau
      if ($('#tbAdd')) $('#tbAdd').onclick = () => { sync(); for (let i = 0; i < 4; i++) d.tableau.entrants.push({ id: uid6(), name: '', index: '' }); render(); };
      $('#cmCancel').onclick = () => d.id ? openComp(d.id) : go('comps', { compList: null });
      $('#cmSave').onclick = async () => {
        sync();
        if (!d.name.trim()) return toast('Donnez un nom à la compétition.');
        const course = S.courses.find(x => x.id === d.courseId) || S.courses[0];
        if (!course) return toast('Ajoutez d’abord un terrain dans Terrains.');
        const needIdx = p => parseIdx(p.index) == null ? toast(`Entrez l’index de ${p.name} (ex. 12,4).`) || true : false;
        let extra = {};
        if (d.format === 'ryder') {
          const sides = d.ryder.sides.map(s => ({ name: s.name, p: s.p.filter(p => p.name) }));
          if (sides.some(s => !s.p.length)) return toast('Chaque camp a besoin d’au moins un joueur.');
          for (const s of sides) for (const p of s.p) if (needIdx(p)) return;
          extra = { ryder: { sides, sessions: d.ryder.sessions.map(s => ({ ...s, matches: s.matches.filter(m => [...m.a, ...m.b].every(id => sides.some(x => x.p.some(p => p.id === id)))) })) }, teams: [] };
        } else if (d.format === 'tableau') {
          const E = d.tableau.entrants.filter(e => e.name);
          if (E.length < 3) return toast('Il faut au moins 3 joueurs dans le tableau.');
          for (const p of E) if (needIdx(p)) return;
          const old = S.comp && d.id ? S.comp.tableau || {} : {};
          const order = d.tableau.seeding === 'tirage' ? ((old.order || []).length && E.every(e => (old.order || []).includes(e.id)) ? old.order : E.map(e => e.id).sort(() => Math.random() - 0.5)) : null;
          extra = { tableau: { entrants: E, seeding: d.tableau.seeding, consolation: !!d.tableau.consolation, manual: old.manual || {}, ...(order ? { order } : {}) }, teams: [] };
        } else {
          const teams = d.teams.filter(t => t.p.some(p => p.name));
          for (const t of teams) for (const p of t.p) { if (!p.name) return toast(`Chaque équipe a besoin de ${t.p.length} joueurs.`); if (needIdx(p)) return; }
          if (teams.length < 2) return toast('Il faut au moins deux équipes.');
          const rounds = (['coups', 'stableford', 'texas', 'scramble'].includes(d.format) || d.format === 'invite' && d.jeu !== 'match') ? d.rounds.map(r => { const cc = S.courses.find(x => x.id === r.courseId) || course; return { date: r.date || d.date, courseId: cc.id, course: JSON.parse(JSON.stringify(cc)), tee: r.tee || (cc.tees[0] || {}).name }; }) : [];
          extra = { teams, rounds };
        }
        const c = { ...(d.id ? S.comp : {}), id: d.id || Date.now().toString(36), groupId: Store.gid, kind: d.format === 'invite' ? 'membre-invite' : d.format === 'ryder' ? 'ryder' : d.format === 'tableau' ? 'tableau' : 'membre-membre', format: d.format || 'match',
          jeu: d.format === 'invite' ? (d.jeu || 'match') : null, name: d.name.trim(), date: d.date, courseId: course.id, course: JSON.parse(JSON.stringify(course)), tee: d.tee, allowance: d.allowance, flights: d.flights,
          teamSize: ['texas', 'scramble'].includes(d.format) ? (d.format === 'scramble' ? 4 : d.teamSize || 4) : 2, minDrives: d.format === 'texas' ? (d.minDrives == null ? 3 : d.minDrives) : d.format === 'scramble' ? 0 : null,
          by: ls.get('pelland.me', '') || '', createdAt: (S.comp && d.id && S.comp.createdAt) || Date.now(), ...extra };
        try { await Store.saveComp(c); S.compList = null; openComp(c.id); toast(d.id ? 'Compétition modifiée.' : 'Compétition créée.');
          if (!d.id) Push.notify({ title: 'Nouvelle compétition : ' + c.name, body: `${c.course.name}, ${dateLong(c.date)}. Suivez le classement en direct.`, url: './', tag: 'comp-' + c.id }); } catch (e) { toast('Enregistrement impossible : ' + e.message); }
      };
    },
    comp(v) {
      v.querySelectorAll('[data-ctab]').forEach(b => b.onclick = () => { S.compTab = b.dataset.ctab; S.compMatch = null; render(); });
      v.querySelectorAll('[data-cround]').forEach(b => b.onclick = () => { S.compRound = b.dataset.cround === 'total' ? null : +b.dataset.cround; render(); });
      const sel = v.querySelector('#cmTeamSel'); if (sel) sel.onchange = () => { S.compTeam = sel.value; render(); };
      const ed = v.querySelector('[data-cedit]'); if (ed) ed.onclick = () => go('compEdit', { compDraft: draftOf(S.comp) });
      const dl = v.querySelector('[data-cdel]'); if (dl) dl.onclick = () => { S.confirmDelComp = true; render(); };
      const dok = v.querySelector('[data-cdelok]'); if (dok) dok.onclick = async () => { try { await Store.deleteComp(S.comp.id); if (S.unwatchComp) { S.unwatchComp(); S.unwatchComp = null; } go('comps', { compList: null }); toast('Compétition effacée.'); } catch (e) { toast('Impossible : ' + e.message); } };
      const tv = v.querySelector('[data-tv]'); if (tv) tv.onclick = () => { go('compTv'); try { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => { }); } catch (e) { } };
      v.querySelectorAll('[data-print]').forEach(b => b.onclick = () => imprimer(S.comp, b.dataset.print));
      v.querySelectorAll('[data-mscore]').forEach(b => b.onclick = () => { S.compMatch = b.dataset.mscore; render(); window.scrollTo(0, 0); });
      const mb = v.querySelector('[data-mback]'); if (mb) mb.onclick = () => { S.compMatch = null; render(); };
      // Gagnant d'un match du tableau indiqué par l'organisateur
      v.querySelectorAll('[data-tbw]').forEach(s => s.onchange = async () => {
        const c = S.comp, k = s.dataset.tbw, man = { ...(c.tableau.manual || {}) };
        if (s.value) man[k] = { w: s.value, txt: 'Gagné' }; else delete man[k];
        c.tableau = { ...c.tableau, manual: man }; render();
        try { await Store.setCompField(c.id, 'tableau.manual', man); } catch (e) { toast('Non enregistré : ' + e.message); }
      });
      // Pointage d'un match (Coupe Ryder, tableau) : [scores des joueurs], mis à jour sur place
      const msAll = [...v.querySelectorAll('[data-ms]')];
      msAll.forEach((inp, k) => inp.addEventListener('input', () => { const x = inp.value.trim(); if ((x.length === 1 && x !== '1') || x.length === 2) { const nx = msAll[k + 1]; if (nx) nx.focus(); } }));
      msAll.forEach(inp => inp.onchange = async () => {
        const [key, h, i] = inp.dataset.ms.split('.'), c = S.comp, raw = inp.value.trim(), val = raw === '' ? null : parseInt(raw, 10);
        if (raw !== '' && !(val >= 1 && val <= 15)) { toast('Score invalide.'); inp.value = ''; return; }
        const n = v.querySelectorAll(`[data-ms^="${key}.${h}."]`).length, cur = ((c.scores || {})[key] || {})[h] || [], arr = Array.from({ length: n }, (_, j) => cur[j] == null ? null : cur[j]); arr[+i] = val;
        c.scores = c.scores || {}; c.scores[key] = c.scores[key] || {}; c.scores[key][h] = arr;
        const sm = v.querySelector('.cm-sum b'); const keep = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.ms : null;
        try { await Store.setCompScore(c.id, key, +h, arr); } catch (e) { toast('Score non enregistré : ' + e.message); }
        render(); if (keep) { const el = document.querySelector(`[data-ms="${keep}"]`); if (el) el.focus(); }
        void sm;
      });
      // Texas scramble : score de l'équipe et départ choisi, enregistrés ensemble [score, joueur]
      const R = () => Math.min(S.compRound || 0, nRounds(S.comp) - 1);
      const tidOf = c => S.compTeam && c.teams.find(t => t.id === S.compTeam) ? S.compTeam : c.teams[0].id;
      const txSave = async h => {
        const c = S.comp, tid = tidOf(c), t = c.teams.find(x => x.id === tid), key = skey(t, R());
        const gi = v.querySelector(`[data-tx="${h}"]`), di = v.querySelector(`[data-td="${h}"]`), raw = gi.value.trim(), g = raw === '' ? null : parseInt(raw, 10);
        if (raw !== '' && !(g >= 1 && g <= 15)) { toast('Score invalide.'); gi.value = ''; return; }
        const arr = [g, di.value === '' ? null : +di.value];
        c.scores = c.scores || {}; c.scores[key] = c.scores[key] || {}; c.scores[key][h] = arr;
        const r = compTeamResult(c, t, R()), hh = r.holes[h - 1];
        const cell = gi.closest('tr').querySelector('.cm-best'); cell.textContent = hh.best == null ? '' : hh.best; cell.classList.toggle('under', hh.best != null && hh.best < hh.par);
        const sm = v.querySelector('.cm-sum'); if (sm) sm.innerHTML = sumHtml(c, r);
        const dr = v.querySelector('.tx-drv'); if (dr) dr.innerHTML = 'Départs : ' + drivesTxt(c, r) + (c.minDrives ? ` (minimum ${c.minDrives} chacun)` : '');
        try { await Store.setCompScore(c.id, key, h, arr); } catch (e) { toast('Score non enregistré : ' + e.message); }
      };
      v.querySelectorAll('[data-tx]').forEach(i => { i.onchange = () => txSave(+i.dataset.tx); i.addEventListener('input', () => { const x = i.value.trim(); if ((x.length === 1 && x !== '1') || x.length === 2) { const s2 = v.querySelector(`[data-td="${i.dataset.tx}"]`); if (s2) s2.focus(); } }); });
      v.querySelectorAll('[data-td]').forEach(s2 => s2.onchange = () => { txSave(+s2.dataset.td); const nx = v.querySelector(`[data-tx="${+s2.dataset.td + 1}"]`); if (nx) nx.focus(); });
      const all = [...v.querySelectorAll('[data-cms]')];
      all.forEach((inp, k) => inp.addEventListener('input', () => { const x = inp.value.trim(); if ((x.length === 1 && x !== '1') || x.length === 2) { const nx = all[k + 1]; if (nx) nx.focus(); } }));
      all.forEach(inp => {
        inp.onchange = async () => {
          const [h, i] = inp.dataset.cms.split('.').map(Number), c = S.comp, tid = tidOf(c), t = c.teams.find(x => x.id === tid), key = skey(t, R());
          const raw = inp.value.trim(), val = raw === '' ? null : parseInt(raw, 10);
          if (raw !== '' && !(val >= 1 && val <= 15)) { toast('Score invalide.'); inp.value = ''; return; }
          const cur = ((c.scores || {})[key] || {})[h] || [null, null], arr = [cur[0] == null ? null : cur[0], cur[1] == null ? null : cur[1]]; arr[i] = val;
          c.scores = c.scores || {}; c.scores[key] = c.scores[key] || {}; c.scores[key][h] = arr;
          // Mise à jour sur place (sans redessiner l'écran, pour ne pas perdre la case où l'on tape)
          const r = compTeamResult(c, t, R()), hh = r.holes[h - 1];
          const cell = inp.closest('tr').querySelector('.cm-best'); cell.textContent = hh.best == null ? '' : hh.best; cell.classList.toggle('under', hh.best != null && hh.best < hh.par);
          if (eff(c) === 'stableford') cell.innerHTML = hh.best == null ? '' : `${hh.best}<small>${hh.sp} pt${hh.sp > 1 ? 's' : ''}</small>`;
          const sm = v.querySelector('.cm-sum'); if (sm) sm.innerHTML = sumHtml(c, r);
          try { await Store.setCompScore(c.id, key, h, arr); } catch (e) { toast('Score non enregistré : ' + e.message); }
        };
      });
    },
    compTv(v) {
      const q = v.querySelector('[data-tvquit]'); if (q) q.onclick = () => { try { document.fullscreenElement && document.exitFullscreen(); } catch (e) { } go('comp'); };
      // Les classes défilent toutes les 12 secondes si elles dépassent l'écran
      clearInterval(S.tvTimer); const body = v.querySelector('.tv-body');
      S.tvTimer = setInterval(() => { if (S.view !== 'compTv') return clearInterval(S.tvTimer); if (!body || body.scrollHeight <= body.clientHeight + 4) return; body.scrollTop = body.scrollTop + body.clientHeight >= body.scrollHeight - 4 ? 0 : body.scrollTop + body.clientHeight * 0.85; }, 12000);
    }
  });
