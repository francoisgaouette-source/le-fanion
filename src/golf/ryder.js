  // ---------- Coupe Ryder : deux camps, sessions de matchs ----------
  const RY_TYPES = { quatre: 'Quatre balles (meilleure balle, 2 contre 2)', alterne: 'Coups alternés (une balle, 2 contre 2)', simple: 'Simples (1 contre 1)' };
  const RY_COURT = { quatre: 'Quatre balles', alterne: 'Coups alternés', simple: 'Simples' };
  const ryPlayer = (c, id) => { for (const s of c.ryder.sides) { const p = s.p.find(x => x.id === id); if (p) return p; } return { name: '?', index: '' }; };
  function ryMatch(c, m, type) {
    const A = m.a.map(id => ryPlayer(c, id)), B = m.b.map(id => ryPlayer(c, id));
    return { m, A, B, ...playMatch(c.course, compTee(c), A, B, (c.scores || {})[m.id], type) };
  }
  function ryTotals(c) {
    const tot = [0, 0], all = []; let n = 0;
    (c.ryder.sessions || []).forEach(s => s.matches.forEach(m => { const r = ryMatch(c, m, s.type); all.push({ s, r }); n++; tot[0] += r.pts[0]; tot[1] += r.pts[1]; }));
    return { tot, all, n, gagner: n / 2 + 0.5 };
  }
  // Paires par défaut d'une session : joueurs dans l'ordre (1-2 contre 1-2, 3-4 contre 3-4…), ou un contre un
  function ryAutoMatches(c, type) {
    const [A, B] = c.ryder.sides.map(s => s.p.map(p => p.id)), k = type === 'simple' ? 1 : 2, n = Math.floor(Math.min(A.length, B.length) / k);
    return Array.from({ length: n }, (_, i) => ({ id: uid6(), a: A.slice(i * k, i * k + k), b: B.slice(i * k, i * k + k) }));
  }
