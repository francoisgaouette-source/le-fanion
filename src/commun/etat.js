  // =====================================================================
  // État de l'interface
  // =====================================================================
  const BALL = '<span class="ydot" aria-label="coup">●</span>';
  const S = { players: [], confirmDel: null, view: 'home', game: null, unwatch: null, undo: [], courses: [], draft: null, editCourse: null };
  // Responsable : celui qui a créé ou réclamé la partie ; après une passation, le joueur désigné (ownerUid vide)
  const myIdx = g => g.players.findIndex(p => L.norm(p.name) === L.norm(ls.get('pelland.me', '') || ''));
  const isOwner = () => !!S.game && (S.game.ownerUid === Store.uid || (S.game.responsable != null && myIdx(S.game) === S.game.responsable));
  const handoffBtn = (g, owner) => owner && g.status !== 'terminée' ? `<div class="row handoff-row"><span class="note">Responsable : <b>${esc((g.players[g.responsable] || {}).name || '')}</b> ★</span><span class="row" style="gap:8px"><button class="btn ghost small" data-editmoney type="button">Modifier les montants</button><button class="btn ghost small" data-handoff type="button">Changer de responsable</button></span></div>` : '';

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), Math.min(9000, 2200 + msg.length * 45));
  }
  function setHeard(t) { $('#heard').textContent = t; }
  function setReply(t) { if (t) toast(t); }
  function updateMic() { $('#micBtn').classList.toggle('on', Voice.listening && !Voice.wake); }

  function go(view, opts = {}) {
    if (S.unwatch && view !== 'game') { S.unwatch(); S.unwatch = null; S.game = null; }
    if (S.unwatchPres && view !== 'game') { S.unwatchPres(); S.unwatchPres = null; }
    if (S.unwatchComp && view !== 'comp' && view !== 'compEdit') { S.unwatchComp(); S.unwatchComp = null; }
    if (view === 'comps') S.compList = null;
    if (view === 'compte') S.acctGroups = null;
    if (view !== 'compte') S.fromLogin = false;
    if (view === 'players') S.pFocused = false;
    if (view !== 'game' && view !== 'setup' && Voice.wake) Voice.setWake(false);
    S.view = view; Object.assign(S, opts);
    if (view === 'setup' && !S.offres) Store.listOffres().then(l => { S.offres = l; if (S.view === 'setup') render(); });
    if (view === 'quatuors') { Store.listOffres().then(l => { S.offres = l; if (S.view === 'quatuors') render(); }); Store.listQuatuors().then(l => { S.quatuors = l; }); }
    if (view === 'offre') { S.offre = undefined; S.offreSel = null; }
    if (view === 'course' && 'editCourse' in opts) { S.cardImgs = []; S.cardStatus = ''; }
    if (view === 'history' || view === 'live') { S.historyList = null; S.confirmDelGame = null; }
    if (view === 'setup') { setHeard('Touchez le micro et dites les joueurs et leurs index.'); setReply(''); }
    if (view === 'game') { setHeard('Appuyez sur le micro et parlez.'); setReply(''); }
    render(); window.scrollTo(0, 0);
  }

  function render() {
    const v = $('#view');
    $('#back').hidden = S.view === 'home' || S.view === 'login';
    document.body.classList.toggle('tv-mode', S.view === 'compTv');   // écran télé : sans barre ni bouton de Léo
    $('#dbBadge').textContent = !navigator.onLine ? 'Hors ligne' : Store.mode === 'cloud' ? '' : 'Local';
    // Mon compte : l'ancien bouton aux initiales reste caché ; le visage d'Albert (porte.js) le remplace
    const ab = $('#acctBtn'), acctOk = Store.mode === 'cloud' && !!Store.email && !Store.needLogin && S.view !== 'login';
    ab.hidden = true; $('#ideeBtn').hidden = !acctOk;  // Mon compte : par le menu d'Albert (HoldingAI)
    $('#ideeBtn').classList.toggle('compact', S.view !== 'home'); ab.classList.toggle('on', S.view === 'compte');
    if (acctOk) { const nm = (S.players.find(p => p.id === meId()) || {}).name || ls.get('pelland.me', '') || ''; $('#acctIni').textContent = nm.split(/[\s-]+/).filter(Boolean).slice(0, 2).map(x => x[0].toUpperCase()).join('') || '👤'; ab.title = 'Mon compte' + (nm ? ' · ' + nm : ''); }
    $('#dbBadge').classList.toggle('offline', !navigator.onLine);
    const showDock = false; // plus d'interface vocale
    document.body.classList.toggle('view-game', S.view === 'game');
    $('#dock').hidden = !showDock; document.body.classList.toggle('no-dock', !showDock);
    const R = { home: vHome, jeux: vJeux, jeuEdit: vJeuEdit, quatuors: vQuatuors, offre: vOffre, setup: vSetup, game: vGame, join: vJoin, history: vHistory, live: vHistory, courses: vCourses, course: vCourse, clubs: vClubs, players: vPlayers, login: vLogin, compte: vCompte, comps: vComps, compEdit: vCompEdit, comp: vComp, compTv: vCompTv }[S.view];
    v.innerHTML = R();
    bind[S.view] && bind[S.view](v);
    leoApres();
  }

  const APP = MARQUE.nom;
  function curGroup() { return (S.groups || []).find(x => x.id === Store.gid) || { id: Store.gid, name: MARQUE.groupeDefaut }; }
  function groupName() { return curGroup().name; }
  const ownerId = () => curGroup().owner || null;
  // Banques (joueurs, terrains, compétitions) : seul le propriétaire du groupe ajoute ou enlève
  const isProprio = () => !ownerId() || (!!meId() && meId() === ownerId());
  const meId = () => ((S.players || []).find(p => L.norm(p.name) === L.norm(ls.get('pelland.me', '') || '')) || {}).id;
  const isOrganizer = id => !ownerId() || id === ownerId() || (curGroup().organizers || []).includes(id);
  // Qui peut organiser : le propriétaire et les organisateurs qu'il nomme (tout le monde tant qu'il n'y a pas de propriétaire)
  const canOrganize = () => isOrganizer(meId());