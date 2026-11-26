  // =====================================================================
  // Le module golf, vu du tronc commun : écrans, navigation, données au démarrage, liens d'ouverture
  // =====================================================================
  const MODULE = {
    vues: { home: vHome, jeux: vJeux, jeuEdit: vJeuEdit, quatuors: vQuatuors, setup: vSetup, game: vGame, join: vJoin, history: vHistory, live: vHistory, courses: vCourses, course: vCourse, clubs: vClubs, comps: vComps, compEdit: vCompEdit, comp: vComp, compTv: vCompTv },
    // Avant de changer d'écran : on arrête de suivre en direct ce qu'on quitte
    quitter(view) {
      if (S.unwatch && view !== 'game') { S.unwatch(); S.unwatch = null; S.game = null; }
      if (S.unwatchPres && view !== 'game') { S.unwatchPres(); S.unwatchPres = null; }
      if (S.unwatchComp && view !== 'comp' && view !== 'compEdit') { S.unwatchComp(); S.unwatchComp = null; }
      if (view === 'comps') S.compList = null;
    },
    avant(view) {
      if (view !== 'game' && view !== 'setup' && Voice.wake) Voice.setWake(false);
    },
    // Après avoir changé d'écran
    aller(view, opts) {
      if (view === 'setup' && !S.offres) Store.listOffres().then(l => { S.offres = l; if (S.view === 'setup') render(); });
      if (view === 'quatuors') { Store.listOffres().then(l => { S.offres = l; if (S.view === 'quatuors') render(); }); Store.listQuatuors().then(l => { S.quatuors = l; }); }
      if (view === 'course' && 'editCourse' in opts) { S.cardImgs = []; S.cardStatus = ''; }
      if (view === 'history' || view === 'live') { S.historyList = null; S.confirmDelGame = null; }
      if (view === 'setup') { setHeard('Touchez le micro et dites les joueurs et leurs index.'); setReply(''); }
      if (view === 'game') { setHeard('Appuyez sur le micro et parlez.'); setReply(''); }
    },
    // Bouton retour : vrai si le module s'en occupe (sinon : accueil)
    retour() {
      if (S.view === 'course') go(S.editCourse && S.editCourse.web ? 'clubs' : S.draft ? 'setup' : 'courses', { editCourse: null });
      else if (S.view === 'clubs') go('courses');
      else if (S.view === 'compTv') go('comp');
      else if (S.view === 'comp' && S.compMatch) { S.compMatch = null; render(); }
      else if (S.view === 'comp') go('comps');
      else if (S.view === 'compEdit') { if (S.compDraft && S.compDraft.id) openComp(S.compDraft.id); else go('comps'); }
      else return false;
      return true;
    },
    phrase(text) { handle(text); },
    ouvrir(id) { openGame(id); },
    nouvellePartie() { typePartieSheet(); },
    groupesTexte(n) { return groupsText(n); },
    // Démarrage : copie gardée sur l'appareil, puis chargement à jour
    depuisCopie(snap) {
      Object.assign(S, { quatuors: snap.quatuors || [], jeux: snap.jeux || [], courses: [...(snap.courses || []), ...(window.QC_COURSES || []).filter(q => !(snap.courses || []).some(c => c.id === q.id) && !(snap.retired || []).includes(q.id))].sort((x, y) => x.name.localeCompare(y.name, 'fr')) });
    },
    async charger() {
      const [courses, quatuors, jeux] = await Promise.all([Store.listCourses().catch(() => []), Store.listQuatuors().catch(() => []), Store.listJeux().catch(() => [])]);
      return { courses, quatuors, jeux };
    },
    garder(d, garde) { Object.assign(S, { courses: garde(d.courses, S.courses), quatuors: garde(d.quatuors, S.quatuors), jeux: garde(d.jeux, S.jeux) }); },
    ensuite() { setTimeout(chargerPropositions, 1200); },   // terrains proposés : en attente pour le groupe, à approuver pour l'équipe Fanion
    copie(d) { return { quatuors: d.quatuors, jeux: d.jeux, courses: d.courses.filter(c => !(window.QC_COURSES || []).some(q => q === c)), retired: (Store.retired || []).map(c => c.id) }; },
    // Ouverture par un lien (?partie=…) ou par le raccourci Siri ; vrai si le module s'en occupe
    lien(params) {
      const code = (params.get('partie') || params.get('code') || '').toUpperCase();
      if (code) openGame(code);
      else if (params.has('ecoute') || params.has('pelland')) {
        // Ouverture par le raccourci Siri : reprendre la dernière partie et écouter
        const last = ls.get('pelland.lastGame', null);
        if (last) openGame(last); else render();
      } else return false;
      return true;
    },
  };
