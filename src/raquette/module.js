  // =====================================================================
  // Le module raquette, vu du tronc commun : écrans, navigation, données au démarrage, liens d'ouverture
  // =====================================================================
  const MODULE = {
    vues: { home: vHomeRaquette, lieux: vLieux, soirees: vSoirees, soiree: vSoiree },
    quitter(view) { if (view !== 'soiree' && S.unwatchSoiree) { S.unwatchSoiree(); S.soiree = undefined; } },
    avant(view) { S.confirmDelS = false; },
    aller(view) {
      if (view === 'soirees' || view === 'home') Store.listSoirees().then(l => { S.soirees = l; if (S.view === view) render(); }).catch(() => { });
      if (view === 'lieux' || view === 'soirees') Store.listLieux().then(l => { S.lieux = l; if (S.view === view) render(); }).catch(() => { });
    },
    retour() { if (S.view === 'soiree') { go('soirees'); return true; } return false; },
    phrase() { },
    ouvrir(id) { ouvrirSoiree(id); },
    nouvellePartie() { go('soirees'); },
    groupesTexte(n) { return n >= 4 ? `${Math.floor(n / 4)} double${n >= 8 ? 's' : ''}` : ''; },
    depuisCopie(snap) { Object.assign(S, { lieux: snap.lieux || [], soirees: snap.soirees || [] }); },
    async charger() {
      const [lieux, soirees] = await Promise.all([Store.listLieux().catch(() => []), Store.listSoirees().catch(() => [])]);
      return { lieux, soirees };
    },
    garder(d, garde) { Object.assign(S, { lieux: garde(d.lieux, S.lieux), soirees: garde(d.soirees, S.soirees) }); },
    ensuite() { },
    copie(d) { return { lieux: d.lieux, soirees: (d.soirees || []).slice(0, 20) }; },
    // Lien d'une soirée (?soiree=…), envoyé dans la notification
    lien(params) { const id = params.get('soiree'); if (!id) return false; ouvrirSoiree(id); return true; },
  };
