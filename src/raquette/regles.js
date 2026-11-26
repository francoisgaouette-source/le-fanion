  // =====================================================================
  // Les six sports : comment se joue une manche et comment se compte le pointage.
  // Logique pure (aucun accès à l'écran) : testée par outils/tests-raquette.js.
  // =====================================================================
  // unite : 'points' (on compte les points de la manche) ou 'jeux' (tennis, padel : on compte les jeux du set)
  // cible : points ou jeux pour gagner ; ecart : avance minimale ; plafond : score qui gagne même sans écart
  const SPORTS = {
    pickleball: { nom: 'Pickleball', lieu: 'terrain', modes: ['double', 'simple'], mode: 'double', unite: 'points', cible: 11, ecart: 2, cibles: [11, 15, 21] },
    tennis: { nom: 'Tennis', lieu: 'terrain', modes: ['double', 'simple'], mode: 'double', unite: 'jeux', cible: 6, ecart: 2, bris: true, cibles: [4, 6] },
    badminton: { nom: 'Badminton', lieu: 'terrain', modes: ['double', 'simple'], mode: 'double', unite: 'points', cible: 21, ecart: 2, plafond: 30, cibles: [11, 15, 21] },
    padel: { nom: 'Padel', lieu: 'terrain', modes: ['double'], mode: 'double', unite: 'jeux', cible: 6, ecart: 2, bris: true, cibles: [4, 6] },
    squash: { nom: 'Squash', lieu: 'terrain', modes: ['simple', 'double'], mode: 'simple', unite: 'points', cible: 11, ecart: 2, cibles: [11, 15] },
    tennisTable: { nom: 'Tennis de table', lieu: 'table', modes: ['simple', 'double'], mode: 'simple', unite: 'points', cible: 11, ecart: 2, cibles: [11, 21] },
  };
  const SPORTS_ORDRE = ['pickleball', 'tennis', 'badminton', 'padel', 'squash', 'tennisTable'];
  // Règle d'une soirée : le sport, avec la cible choisie par l'organisateur
  function regleDe(sport, cible) {
    const s = SPORTS[sport] || SPORTS.pickleball;
    return { ...s, id: SPORTS[sport] ? sport : 'pickleball', cible: Number(cible) || s.cible };
  }
  const motLieu = (r, n) => (r.lieu === 'table' ? 'table' : 'terrain') + (n > 1 ? 's' : '');
  function texteRegle(r) {
    if (r.unite === 'jeux') return `Set à ${r.cible} jeux${r.bris ? `, bris d’égalité à ${r.cible}-${r.cible}` : ''}`;
    return `Manche à ${r.cible}, gagner par ${r.ecart}${r.plafond && r.cible === SPORTS[r.id].cible ? `, maximum ${r.plafond}` : ''}`;
  }
  // Vérifie un pointage. Rend { ok, gagnant: 0|1, message } ; un pointage inhabituel reste permis (ok: false + message)
  function verifierPointage(r, a, b) {
    a = Number(a); b = Number(b);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return { ok: false, gagnant: -1, message: 'Entrez deux nombres entiers.' };
    if (a === b) return { ok: false, gagnant: -1, message: 'Il faut un gagnant : le pointage est égal.' };
    const g = a > b ? 0 : 1, hi = Math.max(a, b), lo = Math.min(a, b);
    let ok;
    if (r.unite === 'jeux') {
      // 6-0 à 6-4 ; 7-5 ; 7-6 avec bris d'égalité (set à 4 : 4-0 à 4-2, 5-3, 5-4)
      ok = (hi === r.cible && lo <= r.cible - 2) || (hi === r.cible + 1 && (lo === r.cible - 1 || (r.bris && lo === r.cible)));
    } else {
      const plafond = r.plafond && r.cible === SPORTS[r.id].cible ? r.plafond : null;
      ok = (plafond == null || hi <= plafond) && ((hi === r.cible && lo <= r.cible - r.ecart) || (hi > r.cible && hi - lo === r.ecart) || (plafond != null && hi === plafond && lo === plafond - 1));
    }
    return { ok, gagnant: g, message: ok ? '' : `Pointage inhabituel pour : ${texteRegle(r).toLowerCase()}.` };
  }

  // Classement de la soirée : manches gagnées, puis écart de points, puis points marqués
  function classementSoiree(soiree, resultats) {
    const t = {};
    const ligne = id => t[id] || (t[id] = { id, jouees: 0, gagnees: 0, pour: 0, contre: 0 });
    (soiree.joueurs || []).forEach(ligne);
    (soiree.manches || []).forEach((m, i) => m.matchs.forEach((x, j) => {
      const r = resultats[cleResultat(i, j)]; if (!r || r.annule) return;
      [[x.a, r.a, r.b], [x.b, r.b, r.a]].forEach(([ids, pour, contre]) => ids.forEach(id => {
        const l = ligne(id); l.jouees++; l.pour += pour; l.contre += contre; if (pour > contre) l.gagnees++;
      }));
    }));
    return Object.values(t).map(l => ({ ...l, ecart: l.pour - l.contre }))
      .sort((x, y) => y.gagnees - x.gagnees || y.ecart - x.ecart || y.pour - x.pour);
  }
  const cleResultat = (manche, match) => `r${manche}-${match}`;
