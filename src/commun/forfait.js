  // ---------------- Propriétaire et forfait du groupe ----------------
  // Forfait gardé dans players/_groupe_<g> : plan = 'groupe' (16 joueurs, payé) et paidUntil (ms). Sans forfait : Gratuit, 4 joueurs.
  function planOf(gr) {
    gr = gr || curGroup();
    // Limite donnée par Fanion (groupe de test, entente spéciale) : l'emporte sur le forfait
    if (Number(gr.maxJoueurs) > 0) { const b = gr.plan === 'groupe' && (!gr.paidUntil || gr.paidUntil > Date.now()); return { name: b ? 'Groupe' : 'Test', max: Number(gr.maxJoueurs), until: b ? gr.paidUntil || null : null, paid: true }; }
    if (gr.plan === 'groupe' && (!gr.paidUntil || gr.paidUntil > Date.now())) return { name: 'Groupe', max: 16, until: gr.paidUntil || null, paid: true };
    return { name: 'Gratuit', max: 4, until: null, paid: false, expired: gr.plan === 'groupe' };
  }
  // « Mon compte » sous le nom de la personne connectée (et, pour le propriétaire, le choix de l'organisateur)
  function acctAct(sameOrg) {
    const acct = '';   // Mon compte : bouton en haut à droite
    const pick = sameOrg !== undefined ? `<button class="linkbtn" data-pickorg type="button">${sameOrg ? 'Nommer un organisateur' : 'Changer l’organisateur'}</button>` : '';
    return acct || pick ? `<div class="who-act">${[acct, pick].filter(Boolean).join('<span aria-hidden="true"> · </span>')}</div>` : '';
  }
  function groupInfo(compact) {
    // Rôle dans le groupe : organisateur ou participant. Le propriétaire (forfait) se gère dans Mon compte.
    const own = (S.players || []).find(p => p.id === ownerId()), pl = planOf(), n = (S.players || []).length, over = n > pl.max;
    const buy = !pl.paid && meId() && meId() === ownerId() ? ` <a class="linkbtn" href="${buyUrl()}" target="_blank" rel="noopener">Passer au forfait Groupe</a>` : '';
    const orgId = (curGroup().organizers || [])[0], org = (S.players || []).find(p => p.id === orgId) || own;
    const me = (S.players || []).find(p => p.id === meId());
    const tagO = '<span class="role-tag org" title="Prépare les parties">Organisateur</span>';
    const moiOrg = me && org && me.id === org.id;
    return `<div class="grp-info${compact ? ' compact' : ''}">
      <div class="grp-info-k">Rôles dans ce groupe</div>
      ${moiOrg ? `<div class="who-line"><b>Vous êtes</b>${tagO}</div>`
        : `<div class="who-line"><b>${org ? esc(org.name) : 'Aucun organisateur'}</b>${org ? tagO : ''}</div>
      ${me ? `<div class="who-line me-line"><b>Vous êtes</b><span class="role-tag part">Participant</span><button class="linkbtn" data-welcome type="button">Ce que je peux faire</button></div>` : ''}`}
      ${over ? `<div class="plan-line"><small class="over">${n} / ${pl.max} joueurs : forfait dépassé</small>${buy}</div>` : ''}
    </div>`;
  }

  // Invitation acceptée = le joueur a créé son compte (cellulaire confirmé + mot de passe)
  const hasAccepted = p => !!(p && (p.acct || p.authEmail));
  function pickOrganizerSheet() {
    const cur = (curGroup().organizers || [])[0] || ownerId();
    openSheet(`<h3>Organisateur du groupe</h3><p class="note">Il prépare les parties : dates offertes, quatuors, nouvelles parties. Le propriétaire garde le forfait.</p>
      <div class="pick-list">${(S.players || []).map(p => { const ok = p.id === ownerId() || hasAccepted(p); return `<button class="btn ${p.id === cur ? '' : 'ghost'} small ${ok ? '' : 'pick-off'}" ${ok ? `data-orgpick="${esc(p.id)}"` : 'disabled'} type="button">${esc(p.name)}${p.id === ownerId() ? ' · propriétaire' : ''}${p.id === cur ? ' ✓' : ''}${ok ? '' : '<small>Invitation pas encore acceptée</small>'}</button>`; }).join('')}</div>
      <p class="note">Seuls les joueurs qui ont accepté leur invitation (compte créé) peuvent être organisateurs.</p>
      <div class="sheet-actions"><button class="btn ghost" data-close type="button">Fermer</button></div>`, sh => {
      sh.querySelector('[data-close]').onclick = closeSheet;
      sh.querySelectorAll('[data-orgpick]').forEach(b => b.onclick = async () => {
        const id = b.dataset.orgpick, gr = { ...curGroup(), organizers: id === ownerId() ? [] : [id] };
        try { await Store.saveGroup(gr); S.groups = await Store.listGroups(); closeSheet(); toast('Organisateur : ' + ((S.players.find(p => p.id === id) || {}).name || '')); render(); } catch (e) { toast('Impossible : ' + e.message); }
      });
    });
  }
  document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-pickorg]'); if (t) { e.preventDefault(); pickOrganizerSheet(); } });

  // Lien d'achat : le site transmet l'identifiant du groupe à Stripe, pour activer le bon groupe
  function buyUrl() { return 'https://fanion.ai/achat.html?groupe=' + encodeURIComponent(Store.gid) + '&nom=' + encodeURIComponent(groupName()); }
  // Places qui restent dans le forfait (Gratuit : 4 joueurs ; Groupe : 16)
  function roomLeft() { return planOf().max - (S.players || []).length; }
  function limitSheet(wanted) {
    const pl = planOf(), own = (S.players || []).find(p => p.id === ownerId()), meOwner = !!meId() && meId() === ownerId();
    const left = Math.max(0, roomLeft());
    openSheet(`<h3>${pl.paid ? 'Le groupe est complet' : 'Passez au forfait Groupe'}</h3>
      <p>${pl.paid ? `Le forfait ${pl.name} permet ${pl.max} joueurs.` : `Le forfait Gratuit permet ${pl.max} joueurs, pour essayer avec un quatuor.`}${wanted ? ` Vous voulez en ajouter ${wanted}, il reste ${left} place${left > 1 ? 's' : ''}.` : ''}</p>
      ${pl.paid ? '<p class="note">Pour une ligue de plus de 16 joueurs, écrivez à bonjour@fanion.ai.</p>'
        : `<ul class="info-list"><li>Jusqu’à 16 joueurs</li><li>Dates offertes, disponibilités et quatuors</li><li>49 $ + taxes pour la saison, au prix fondateur</li></ul>
      ${meOwner ? '' : `<p class="note">Seul le propriétaire du groupe${own ? ', ' + esc(own.name) + ',' : ''} peut changer de forfait.</p>`}`}
      <div class="sheet-actions">${!pl.paid && meOwner ? `<a class="btn" href="${buyUrl()}" target="_blank" rel="noopener">Passer au forfait Groupe</a>` : ''}<button class="btn ghost" data-close type="button">${!pl.paid && meOwner ? 'Plus tard' : 'Compris'}</button></div>`, sh => { sh.querySelector('[data-close]').onclick = closeSheet; });
  }

  // Deuxième groupe avec le forfait Gratuit : même offre que pour un 5e joueur
  function deuxiemeGroupeSheet(g) {
    const url = 'https://fanion.ai/achat.html?groupe=' + encodeURIComponent(g.id) + '&nom=' + encodeURIComponent(g.name || '');
    openSheet(`<h3>Passez au forfait Groupe</h3>
      <p>Le forfait Gratuit permet un groupe de 4 joueurs, pour essayer avec un quatuor. Vous avez déjà « ${esc(g.name)} » : pour créer un deuxième groupe, passez-le au forfait Groupe.</p>
      <ul class="info-list"><li>Jusqu’à 16 joueurs</li><li>Dates offertes, disponibilités et quatuors</li><li>Un autre groupe gratuit possible</li><li>49 $ + taxes pour la saison, au prix fondateur</li></ul>
      <div class="sheet-actions"><a class="btn" href="${url}" target="_blank" rel="noopener">Passer au forfait Groupe</a><button class="btn ghost" data-close type="button">Plus tard</button></div>`, sh => { sh.querySelector('[data-close]').onclick = closeSheet; });
  }
