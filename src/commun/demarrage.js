
  // =====================================================================
  // Démarrage
  // =====================================================================
  $('#back').onclick = () => {
    if (S.view === 'course') go(S.editCourse && S.editCourse.web ? 'clubs' : S.draft ? 'setup' : 'courses', { editCourse: null });
    else if (S.view === 'clubs') go('courses');
    else if (S.view === 'compTv') go('comp');
    else if (S.view === 'comp' && S.compMatch) { S.compMatch = null; render(); }
    else if (S.view === 'comp') go('comps');
    else if (S.view === 'compEdit') { if (S.compDraft && S.compDraft.id) openComp(S.compDraft.id); else go('comps'); }
    else go('home');
  };
  $('#acctBtn').onclick = () => { if (S.view !== 'compte') go('compte'); };
  $('#micBtn').onclick = () => Voice.ptt();
  $('#wakeBtn').onclick = () => Voice.setWake(!Voice.wake);
  $('#typeForm').onsubmit = e => { e.preventDefault(); const t = $('#typeInput').value.trim(); if (t) { $('#typeInput').value = ''; handle(t); } };
  $('#typeInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#typeForm').requestSubmit(); } });
  Voice.onText = text => handle(text);
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
    if (Store.redirecting) { $('#view').innerHTML = '<p class="note">Albert vous reconnaît…</p>'; return; }
    // Menu d'Albert (compte HoldingAI), en haut à droite, comme dans toutes les apps HoldingAI
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
      Object.assign(S, { players: snap.players, quatuors: snap.quatuors || [], jeux: snap.jeux || [], groups: snap.groups || [], courses: [...(snap.courses || []), ...(window.QC_COURSES || []).filter(q => !(snap.courses || []).some(c => c.id === q.id) && !(snap.retired || []).includes(q.id))].sort((x, y) => x.name.localeCompare(y.name, 'fr')) });
      render();
    }
    const [courses, players, quatuors, jeux, groups] = await Promise.all([
      Store.listCourses().catch(() => []), Store.listPlayers().catch(() => []), Store.listQuatuors().catch(() => []),
      Store.listJeux().catch(() => []), Store.listGroups().catch(() => [])]);
    // Hors ligne : la base ne répond pas ; on garde la copie de l'appareil plutôt que des listes vides
    const garde = (v, old) => (v && v.length) || navigator.onLine !== false || !old ? v : old;
    Object.assign(S, { courses: garde(courses, S.courses), players: garde(players, S.players), quatuors: garde(quatuors, S.quatuors), jeux: garde(jeux, S.jeux), groups: garde(groups, S.groups) });
    setTimeout(chargerRetour, 800);
    setTimeout(chargerPropositions, 1200);   // terrains proposés : en attente pour le groupe, à approuver pour l'équipe Fanion   // boucle de retour : réponses de l'équipe, nouveautés, sondage (sans retarder l'ouverture)
    if (navigator.onLine !== false) try { ls.set(snapK, { players, quatuors, jeux, groups, courses: courses.filter(c => !(window.QC_COURSES || []).some(q => q === c)), retired: (Store.retired || []).map(c => c.id), at: Date.now() }); } catch (e) { }
    // Groupes créés avant le compteur : on l'initialise une fois avec le nombre de joueurs
    // (le compteur de joueurs est tenu par la base)
    Push.refresh().catch(() => { });
    // Groupes du joueur (sans les groupes supprimés ni archivés pour le lien « Changer de groupe »)
    Store.myGroupList().then(l => { S.myPlayers = l; if (S.view === 'home' && l.some(x => !x.archived && x.gid !== Store.gid)) render(); }).catch(() => { });
    const params = new URLSearchParams(location.search);
    const code = (params.get('partie') || params.get('code') || '').toUpperCase();
    const offreId = params.get('offre');
    if (params.get('compte')) { history.replaceState(null, '', location.pathname); go('compte', { fromLogin: true }); return; }
    if (curGroup().deleted) { toast('Ce groupe a été supprimé par son propriétaire. Choisissez un autre groupe.'); go('compte', { fromLogin: true }); return; }
    if (offreId) go('offre', { offreId });
    else if (code) openGame(code);
    else if (params.has('ecoute') || params.has('pelland')) {
      // Ouverture par le raccourci Siri : reprendre la dernière partie et écouter
      const last = ls.get('pelland.lastGame', null);
      if (last) openGame(last); else render();
    } else if (!snap || (S.view === 'home' && !document.querySelector('#sheetWrap:not([hidden]), #welcome'))) render();
  })();
})();
