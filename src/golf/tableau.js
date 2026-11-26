  // ---------- Tableau à élimination ----------
  // Ordre des têtes de série dans un tableau de taille 2^k (1 contre 16, 8 contre 9, …)
  function seedOrder(n) { let o = [1]; while (o.length < n) { const m = o.length * 2 + 1; o = o.flatMap(x => [x, m - x]); } return o; }
  const ROUND_NAMES = n => n === 2 ? 'Finale' : n === 4 ? 'Demi-finales' : n === 8 ? 'Quarts de finale' : n === 16 ? 'Huitièmes de finale' : `Ronde de ${n}`;
  function tbSeeds(c) {
    const T = c.tableau, E = T.entrants.filter(e => e.name);
    if (T.seeding === 'index') return [...E].sort((a, b) => (parseIdx(a.index) ?? 99) - (parseIdx(b.index) ?? 99));
    if (T.seeding === 'tirage') { const ord = T.order || []; return [...E].sort((a, b) => (ord.indexOf(a.id) + 1 || 999) - (ord.indexOf(b.id) + 1 || 999)); }
    return E;
  }
  // Résultat d'un match du tableau : pointage trou par trou (match play net, 100 %) ou gagnant indiqué à la main
  function tbResult(c, key, a, b) {
    const man = ((c.tableau.manual || {})[key]) || null;
    const r = playMatch(c.course, compTee(c), [a], [b], (c.scores || {})[key], 'simple');
    if (man && man.w) return { ...r, winner: man.w === 'a' ? a : b, loser: man.w === 'a' ? b : a, txt: man.txt || 'Gagné', manual: true };
    if (r.done && r.d !== 0) return { ...r, winner: r.d > 0 ? a : b, loser: r.d > 0 ? b : a };
    return { ...r, winner: null, egal: r.done && r.d === 0 };
  }
  // Tableau à partir des places de la première ronde : joueur, null (exempté) ou PEND (pas encore connu)
  const PEND = { pend: true };
  function tbBuildSlots(c, slots, prefix) {
    const rounds = [];
    for (let n = slots.length, r = 0; n >= 2; n /= 2, r++) {
      const ms = [];
      for (let i = 0; i < slots.length; i += 2) {
        const key = `${prefix}${r}-${i / 2}`, a = slots[i], b = slots[i + 1];
        const res = a === PEND || b === PEND ? { pend: true, winner: null } : !a || !b ? { bye: true, winner: a || b || null } : tbResult(c, key, a, b);
        ms.push({ key, a: a === PEND ? null : a, b: b === PEND ? null : b, pendA: a === PEND, pendB: b === PEND, res });
      }
      rounds.push({ name: ROUND_NAMES(n), ms });
      slots = ms.map(m => m.res.bye ? m.res.winner : m.res.winner || PEND);
    }
    return { rounds, champion: rounds.length ? rounds[rounds.length - 1].ms[0].res.winner || null : null };
  }
  function tbBrackets(c) {
    const seeds = tbSeeds(c), size = Math.max(2, 2 ** Math.ceil(Math.log2(Math.max(2, seeds.length))));
    const main = tbBuildSlots(c, seedOrder(size).map(k => seeds[k - 1] || null), 'T');
    let conso = null;
    // Consolation : les perdants de la première ronde, chacun à la place de son match (un match d'exempté laisse une place vide)
    if (c.tableau.consolation && main.rounds[0].ms.length >= 2) {
      const sl = main.rounds[0].ms.filter(m => !m.res.bye).map(m => m.res.loser || PEND);
      if (sl.length >= 2) { while (sl.length & (sl.length - 1)) sl.push(null); conso = tbBuildSlots(c, sl, 'C'); }
    }
    return { seeds, main, conso };
  }
  const tbName = (c, p, pend) => { if (pend) return '<i class="tb-tbd">à déterminer</i>'; if (!p) return '<i class="tb-tbd">—</i>'; const s = tbSeeds(c).indexOf(p) + 1; return `${s ? `<small class="tb-seed">${s}</small>` : ''}${esc(p.name)}`; };
