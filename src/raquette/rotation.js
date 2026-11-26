  // =====================================================================
  // Rotations : qui joue avec qui, contre qui, sur quel terrain, à chaque manche.
  // Logique pure : testée par outils/tests-raquette.js.
  //  - chacun joue autant que possible : on repose ceux qui se sont le moins reposés, à tour de rôle ;
  //  - en double, on évite de rejouer avec le même partenaire, puis contre les mêmes adversaires ;
  //  - même graine, mêmes joueurs : mêmes manches (tous les téléphones voient la même chose).
  // =====================================================================
  function hasard(graine) {
    let s = 0; for (const c of String(graine)) s = (Math.imul(s, 31) + c.charCodeAt(0)) | 0;
    return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const paire = (x, y) => x < y ? x + '|' + y : y + '|' + x;
  // Ce que les manches déjà jouées ont laissé : partenaires, adversaires, repos, manches de suite
  function historiqueDe(manches) {
    const h = { partenaires: {}, adversaires: {}, repos: {}, joue: {} };
    const plus = (o, k) => { o[k] = (o[k] || 0) + 1; };
    (manches || []).forEach(m => {
      (m.repos || []).forEach(id => plus(h.repos, id));
      m.matchs.forEach(x => {
        [x.a, x.b].forEach(eq => { eq.forEach(id => plus(h.joue, id)); if (eq.length === 2) plus(h.partenaires, paire(eq[0], eq[1])); });
        x.a.forEach(i => x.b.forEach(j => plus(h.adversaires, paire(i, j))));
      });
    });
    return h;
  }
  function coutManche(matchs, h) {
    let c = 0;
    matchs.forEach(x => {
      [x.a, x.b].forEach(eq => { if (eq.length === 2) { const n = h.partenaires[paire(eq[0], eq[1])] || 0; c += n * n * 100; } });
      x.a.forEach(i => x.b.forEach(j => { const n = h.adversaires[paire(i, j)] || 0; c += n * n * 10; }));
    });
    return c;
  }
  // Une manche : { matchs: [{ terrain, a: [ids], b: [ids] }], repos: [ids] }
  function uneManche(joueurs, terrains, mode, h, rnd) {
    const parMatch = mode === 'simple' ? 2 : 4;
    const nbMatchs = Math.min(terrains, Math.floor(joueurs.length / parMatch));
    if (nbMatchs < 1) return { matchs: [], repos: joueurs.slice() };
    // Repos : ceux qui se sont le moins reposés, puis ceux qui ont le plus joué ; égalités au hasard
    const ordre = joueurs.map(id => ({ id, r: h.repos[id] || 0, j: h.joue[id] || 0, x: rnd() }))
      .sort((p, q) => p.r - q.r || q.j - p.j || p.x - q.x);
    const nbRepos = joueurs.length - nbMatchs * parMatch;
    const repos = ordre.slice(0, nbRepos).map(p => p.id), actifs = ordre.slice(nbRepos).map(p => p.id);
    // On essaie plusieurs façons de répartir les actifs et on garde la moins coûteuse
    let best = null, bestC = Infinity;
    const essais = 300;
    for (let k = 0; k < essais && bestC > 0; k++) {
      const a = actifs.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
      const matchs = [];
      for (let t = 0; t < nbMatchs; t++) {
        const g = a.slice(t * parMatch, (t + 1) * parMatch);
        matchs.push(parMatch === 2 ? { terrain: t + 1, a: [g[0]], b: [g[1]] } : { terrain: t + 1, a: [g[0], g[1]], b: [g[2], g[3]] });
      }
      const c = coutManche(matchs, h);
      if (c < bestC) { bestC = c; best = matchs; }
    }
    return { matchs: best, repos };
  }
  // Prépare les manches : on garde celles déjà commencées (deja) et on calcule les suivantes pour les joueurs présents
  function preparerManches({ joueurs, terrains, mode, nombre, deja = [], graine = 'soiree' }) {
    const manches = deja.slice(), js = joueurs.slice().sort();
    const rnd = hasard(graine + ':' + js.join(',') + ':' + manches.length);
    while (manches.length < nombre) manches.push(uneManche(js, terrains, mode, historiqueDe(manches), rnd));
    return manches;
  }
  // Nombre de manches proposé : assez pour que chacun ait joué avec plusieurs partenaires, sans dépasser la soirée
  function manchesConseillees(nbJoueurs, terrains, mode, minutes = 120, dureeManche = 15) {
    const parMatch = mode === 'simple' ? 2 : 4;
    if (Math.min(terrains, Math.floor(nbJoueurs / parMatch)) < 1) return 0;
    return Math.max(1, Math.min(20, Math.floor(minutes / dureeManche)));
  }
