
  // =====================================================================
  // Démarrage
  // =====================================================================
  $('#back').onclick = () => { if (!MODULE.retour()) go('home'); };

  $('#acctBtn').onclick = () => { if (S.view !== 'compte') go('compte'); };
  $('#micBtn').onclick = () => Voice.ptt();
  $('#wakeBtn').onclick = () => Voice.setWake(!Voice.wake);
  $('#typeForm').onsubmit = e => { e.preventDefault(); const t = $('#typeInput').value.trim(); if (t) { $('#typeInput').value = ''; MODULE.phrase(t); } };
  $('#typeInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#typeForm').requestSubmit(); } });
  Voice.onText = text => MODULE.phrase(text);
  if ('speechSynthesis' in window) speechSynthesis.getVoices();

  // Réseau perdu / retrouvé : on l'indique ; les scores en attente partent au retour du réseau (Store.flush)
  window.addEventListener('offline', () => { render(); toast('Hors ligne : les scores sont gardés et seront envoyés au retour du réseau.'); });
  window.addEventListener('online', () => { render(); toast('Réseau retrouvé : scores envoyés.'); });
  (function captureRef() {
    const r = new URLSearchParams(location.search).get('ref');
    if (r && /^[a-z0-9_-]{2,60}$/i.test(r)) ls.set('pelland.ref', { code: r, until: Date.now() + 90 * 864e5 });
  })();
  (async function start() {
    $('#view').innerHTML = '<p class="note">Démarrage…</p>';
    await Store.init();
    if (Store.redirecting) { $('#view').innerHTML = '<p class="note">Philou vous reconnaît…</p>'; return; }
    // Menu de Philou (compte HoldingAI), en haut à droite, comme dans toutes les apps HoldingAI
    if (Store.mode === 'cloud') {
      window.HOLDINGAI_PORTE = Store.uid
        ? { app: MARQUE.id, nomApp: MARQUE.nomApp, personnage: MARQUE.personnage, prenom: Store.nom || '', connecte: true,
            liens: Store.noGroup ? [] : [{ texte: 'Mes groupes et forfait', action: () => go('compte') }], surDeconnexion: () => Store.logout() }
        : { app: MARQUE.id, nomApp: MARQUE.nomApp, personnage: MARQUE.personnage, barriere: true };
      if (!Store.uid && window.HoldingAIPorte) try { HoldingAIPorte.barriere(); } catch (e) { }
    }
    if (Store.needLogin) {
      [S.players, S.groups] = await Promise.all([Store.listPlayers(true).catch(() => []), Store.listGroups().catch(() => [])]);
      S.view = 'login'; render(); return;
    }
    // Lien d'invitation (?joueur=…) : le compte y a déjà été relié s'il a le bon cellulaire (Store.ensureMember)
    if (new URLSearchParams(location.search).get('joueur')) history.replaceState(null, '', location.pathname);
    // Ouverture rapide : on affiche tout de suite la dernière copie du groupe gardée sur l'appareil,
    // puis on charge la version à jour (toutes les lectures en même temps) et on rafraîchit l'écran.
    const params0 = new URLSearchParams(location.search), snapK = 'fanion.snap.' + Store.gid + '.' + (Store.uid || '');
    const plain = !['partie', 'code', 'offre', 'compte', 'ecoute', 'pelland', 'joueur'].some(k => params0.has(k));
    const snap = plain ? ls.get(snapK, null) : null;
    if (snap && snap.players && snap.players.length) {
      Object.assign(S, { players: snap.players, groups: snap.groups || [] }); MODULE.depuisCopie(snap);
      render();
    }
    const [donnees, players, groups] = await Promise.all([MODULE.charger(), Store.listPlayers().catch(() => []), Store.listGroups().catch(() => [])]);
    // Hors ligne : la base ne répond pas ; on garde la copie de l'appareil plutôt que des listes vides
    const garde = (v, old) => (v && v.length) || navigator.onLine !== false || !old ? v : old;
    Object.assign(S, { players: garde(players, S.players), groups: garde(groups, S.groups) }); MODULE.garder(donnees, garde);
    setTimeout(chargerRetour, 800);
    MODULE.ensuite();
    if (navigator.onLine !== false) try { ls.set(snapK, { players, groups, ...MODULE.copie(donnees), at: Date.now() }); } catch (e) { }
    // Groupes créés avant le compteur : on l'initialise une fois avec le nombre de joueurs
    // (le compteur de joueurs est tenu par la base)
    Push.refresh().catch(() => { });
    // Groupes du joueur (sans les groupes supprimés ni archivés pour le lien « Changer de groupe »)
    Store.myGroupList().then(l => { S.myPlayers = l; if (S.view === 'home' && l.some(x => !x.archived && x.gid !== Store.gid)) render(); }).catch(() => { });
    const params = new URLSearchParams(location.search);
    const offreId = params.get('offre');
    if (params.get('compte')) { history.replaceState(null, '', location.pathname); go('compte', { fromLogin: true }); return; }
    if (curGroup().deleted) { toast('Ce groupe a été supprimé par son propriétaire. Choisissez un autre groupe.'); go('compte', { fromLogin: true }); return; }
    if (offreId) go('offre', { offreId });
    else if (MODULE.lien(params)) { }
    else if (!snap || (S.view === 'home' && !document.querySelector('#sheetWrap:not([hidden]), #welcome'))) render();
  })();
})();
