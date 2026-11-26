  const CLASSES_LETTRES = ['A', 'B', 'C', 'D'];
  const toParTxt = x => x === 0 ? 'Par' : (x > 0 ? '+' : '−') + Math.abs(x);
  const parseIdx = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? null : n; };
  const uid6 = () => Math.random().toString(36).slice(2, 8);
  const prenom = n => esc(String(n || '?').split(' ')[0]);
  const dateLong = d => d ? new Date(d + 'T12:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
  // Moteur de pointage réellement utilisé : le membre-invité suit le jeu choisi, le scramble à 4 suit le Texas scramble
  const eff = c => c.format === 'invite' ? (c.jeu || 'match') : c.format === 'scramble' ? 'texas' : (c.format || 'match');
  const isStroke = c => ['coups', 'stableford', 'texas'].includes(eff(c)) && !['ryder', 'tableau'].includes(c.format);
  const nRounds = c => isStroke(c) ? 1 + (c.rounds || []).length : 1;
  const roundOf = (c, r) => !r ? { date: c.date, course: c.course, tee: c.tee } : (c.rounds || [])[r - 1] || { date: c.date, course: c.course, tee: c.tee };
  const skey = (t, r) => r ? t.id + '@' + r : t.id;
  function compTee(c, r) { const R = roundOf(c, r); return (R.course.tees || []).find(t => t.name === R.tee) || (R.course.tees || [])[0]; }
  const chOf = (idx, course, tee) => { const i = parseIdx(idx); return i == null || !tee ? 0 : L.courseHandicap(i, tee, L.teePar(course, tee)); };
  // Handicap de jeu de chaque joueur : handicap de parcours × allocation (85 % en meilleure balle, selon le système mondial)
  function compPlayers(c, t, r) {
    const R = roundOf(c, r), tee = compTee(c, r);
    return t.p.map(p => { const ch = chOf(p.index, R.course, tee); return { ...p, ch, ph: Math.round(ch * (c.allowance || 85) / 100) }; });
  }
  // Texas scramble : handicap d'équipe selon le système mondial (4 joueurs : 25-20-15-10 % ; 3 : 30-20-10 % ; 2 : 35-15 %)
  const TX_W = { 2: [0.35, 0.15], 3: [0.30, 0.20, 0.10], 4: [0.25, 0.20, 0.15, 0.10] };
  function texasHcp(c, t, r) {
    const R = roundOf(c, r), tee = compTee(c, r);
    const chs = t.p.map(p => chOf(p.index, R.course, tee)).sort((a, b) => a - b);
    const w = TX_W[chs.length] || TX_W[4];
    return Math.round(chs.reduce((a, ch, k) => a + ch * (w[k] || 0), 0));
  }
  // Résultat d'une équipe pour une ronde : meilleure balle nette à chaque trou (ou score unique en scramble)
  function compTeamResult(c, t, r = 0) {
    const R = roundOf(c, r), tee = compTee(c, r), sc = (c.scores || {})[skey(t, r)] || {};
    if (eff(c) === 'texas') {
      const th = texasHcp(c, t, r), drives = t.p.map(() => 0);
      let toPar = 0, thru = 0, gross = 0, net = 0; const holes = [];
      for (let h = 1; h <= 18; h++) {
        const par = L.holePar(R.course, tee, h), si = R.course.holes[h - 1].si, s = sc[h] || [];
        const g = s[0] == null || s[0] === '' ? null : Number(s[0]), dv = s[1] == null ? null : Number(s[1]);
        const best = g == null ? null : g - L.strokesOnHole(th, si);
        if (dv != null && drives[dv] != null && g != null) drives[dv]++;
        holes.push({ h, par, si, best, s, g, dv });
        if (best != null) { thru++; toPar += best - par; gross += g; net += best; }
      }
      return { t, ps: t.p.map(p => ({ ...p, ph: 0 })), toPar, thru, net, gross, pts: 0, holes, ph: th, drives };
    }
    const ps = compPlayers(c, t, r);
    let toPar = 0, thru = 0, net = 0, pts = 0; const holes = [];
    for (let h = 1; h <= 18; h++) {
      const par = L.holePar(R.course, tee, h), si = R.course.holes[h - 1].si, s = sc[h] || [];
      const nets = ps.map((p, i) => s[i] == null || s[i] === '' ? null : Number(s[i]) - L.strokesOnHole(p.ph, si)).filter(x => x != null);
      const best = nets.length ? Math.min(...nets) : null;
      // Stableford : 2 points pour la normale nette, 1 de plus par coup sous la normale, 1 de moins par coup au-dessus (minimum 0)
      const sp = best == null ? null : Math.max(0, 2 + par - best);
      holes.push({ h, par, si, best, s, sp });
      if (best != null) { thru++; toPar += best - par; net += best; pts += sp; }
    }
    return { t, ps, toPar, thru, net, pts, holes, ph: ps.reduce((a, p) => a + p.ph, 0) };
  }
  // Cumul de toutes les rondes (une seule ronde : le résultat de cette ronde)
  function compTeamTotal(c, t) {
    const n = nRounds(c), rs = Array.from({ length: n }, (_, r) => compTeamResult(c, t, r));
    if (n === 1) return { ...rs[0], rounds: rs };
    const sum = k => rs.reduce((a, x) => a + (x[k] || 0), 0);
    return { t, ps: rs[0].ps, ph: rs[0].ph, drives: eff(c) === 'texas' ? t.p.map((_, i) => rs.reduce((a, x) => a + (x.drives[i] || 0), 0)) : null,
      toPar: sum('toPar'), thru: sum('thru'), net: sum('net'), gross: sum('gross'), pts: sum('pts'), holes: rs[0].holes, rounds: rs };
  }
  // Classes : les équipes sont classées par handicap d'équipe, puis réparties également ; classement par ronde ou cumulé
  function compFlights(c, r) {
    const res = (c.teams || []).map(t => r == null ? compTeamTotal(c, t) : compTeamResult(c, t, r)).sort((a, b) => a.ph - b.ph);
    const n = Math.max(1, Math.min(c.flights || 1, res.length || 1)), out = [];
    let k = 0; for (let f = 0; f < n; f++) { const size = Math.floor(res.length / n) + (f < res.length % n ? 1 : 0); out.push({ name: n > 1 ? 'Classe ' + CLASSES_LETTRES[f] : 'Classement', teams: res.slice(k, k + size) }); k += size; }
    out.forEach(fl => {
      const key = x => eff(c) === 'stableford' ? -x.pts : x.toPar;
      fl.teams.sort((a, b) => (a.thru ? 0 : 1) - (b.thru ? 0 : 1) || key(a) - key(b) || b.thru - a.thru);
      let pos = 0; fl.teams.forEach((x, i) => { if (i === 0 || key(x) !== key(fl.teams[i - 1]) || !x.thru) pos = i + 1; x.pos = x.thru ? pos : null; x.tie = x.thru && fl.teams.filter(y => y.thru && key(y) === key(x)).length > 1; });
    });
    return out;
  }
  const teamLabel = t => t.p.map(p => esc(p.name || '?')).join(' · ');
  // Match play générique : côtés A et B, allocation selon le type ; les coups se donnent à partir du plus bas handicap du match
  //   quatre (quatre balles) : 90 % chacun, meilleure balle nette ; alterne : 50 % de la somme par côté ; simple : 100 %
  function playMatch(course, tee, A, B, sc, type) {
    const par = L.teePar(course, tee), ch = p => chOf(p.index, course, tee);
    let ha, hb;
    if (type === 'alterne') { ha = [Math.round(A.reduce((s, p) => s + ch(p), 0) * 0.5)]; hb = [Math.round(B.reduce((s, p) => s + ch(p), 0) * 0.5)]; }
    else { const k = type === 'quatre' ? 0.9 : 1; ha = A.map(p => Math.round(ch(p) * k)); hb = B.map(p => Math.round(ch(p) * k)); }
    const base = Math.min(...ha, ...hb); ha = ha.map(x => x - base); hb = hb.map(x => x - base);
    const na = ha.length;
    const best = (hs, s, off, si) => { const n = hs.map((x, i) => s[off + i] == null || s[off + i] === '' ? null : Number(s[off + i]) - L.strokesOnHole(x, si)).filter(x => x != null); return n.length === hs.length || type === 'quatre' && n.length ? Math.min(...n) : null; };
    let d = 0, played = 0, last = 0, fini = false; const holes = [];
    for (let h = 1; h <= 18; h++) {
      const si = course.holes[h - 1].si, s = (sc || {})[h] || [], x = best(ha, s, 0, si), y = best(hb, s, na, si);
      holes.push({ h, si, par: L.holePar(course, tee, h), s, x, y });
      if (fini || x == null || y == null) continue;
      played++; last = h; if (x < y) d++; else if (y < x) d--;
      holes[h - 1].d = d;
      if (Math.abs(d) > 18 - h) fini = true;   // match décidé
    }
    const left = 18 - last, done = played > 0 && (Math.abs(d) > left || last === 18);
    const txt = !played ? 'À jouer' : d === 0 ? (done ? 'Match nul' : `Égal après ${last}`) : done && left > 0 ? `${Math.abs(d)} et ${left}` : done ? `${Math.abs(d)} UP` : `${Math.abs(d)} UP après ${last}`;
    return { d, played, last, done, txt, holes, ha, hb, pts: done ? (d > 0 ? [1, 0] : d < 0 ? [0, 1] : [0.5, 0.5]) : [0, 0] };
  }
  // Membre-membre en match play : chaque équipe affronte toutes celles de sa classe (meilleure balle nette)
  function compMatch(c, A, B) {
    const pa = compPlayers(c, A), pb = compPlayers(c, B), base = Math.min(...pa.concat(pb).map(p => p.ph));
    const sa = (c.scores || {})[A.id] || {}, sb = (c.scores || {})[B.id] || {};
    const best = (ps, s, si) => { const n = ps.map((p, i) => s[i] == null || s[i] === '' ? null : Number(s[i]) - L.strokesOnHole(p.ph - base, si)).filter(x => x != null); return n.length ? Math.min(...n) : null; };
    let d = 0, played = 0, last = 0;
    for (let h = 1; h <= 18; h++) {
      const si = c.course.holes[h - 1].si, x = best(pa, sa[h] || [], si), y = best(pb, sb[h] || [], si);
      if (x == null || y == null) continue;
      played++; last = h; if (x < y) d++; else if (y < x) d--;
      if (Math.abs(d) > 18 - h) break;
    }
    const left = 18 - last, done = played > 0 && (Math.abs(d) > left || (last === 18 && played === 18));
    const lead = d > 0 ? A : d < 0 ? B : null;
    const txt = !played ? 'À jouer' : d === 0 ? (done ? 'Match nul' : `Égal après ${last}`) : done && left > 0 ? `${Math.abs(d)} et ${left}` : done ? `${Math.abs(d)} UP` : `${Math.abs(d)} UP après ${last}`;
    return { A, B, d, played, last, done, lead, txt, pts: done ? (d > 0 ? [1, 0] : d < 0 ? [0, 1] : [0.5, 0.5]) : [0, 0] };
  }
  function compStandings(c, fl) {
    const T = fl.teams.map(r => ({ r, pts: 0, w: 0, h: 0, l: 0, diff: 0 })), M = [];
    for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
      const m = compMatch(c, T[i].r.t, T[j].r.t); M.push(m);
      T[i].pts += m.pts[0]; T[j].pts += m.pts[1];
      if (m.done) { if (m.d > 0) { T[i].w++; T[j].l++; } else if (m.d < 0) { T[j].w++; T[i].l++; } else { T[i].h++; T[j].h++; } }
      T[i].diff += m.d; T[j].diff -= m.d;
    }
    T.sort((a, b) => b.pts - a.pts || b.diff - a.diff);
    T.forEach((x, k) => { x.pos = k && x.pts === T[k - 1].pts && x.diff === T[k - 1].diff ? T[k - 1].pos : k + 1; });
    return { T, M };
  }
  const fmtPt = x => String(x).replace('.5', ',5');
  const drivesTxt = (c, r) => { const min = (c.minDrives || 0) * (r.rounds ? r.rounds.length : 1); return r.t.p.map((p, i) => `${prenom(p.name)} ${r.drives[i]}${min && r.drives[i] < min ? '⚠' : ''}`).join(' · '); };
  const sumHtml = (c, r) => `<span>${r.thru ? `Après ${r.thru} trou${r.thru > 1 ? 's' : ''}` : 'Aucun score'}</span><b class="${eff(c) !== 'stableford' && r.toPar < 0 ? 'under' : ''}">${!r.thru ? '' : eff(c) === 'stableford' ? r.pts + ' pts' : toParTxt(r.toPar)}</b>`;
