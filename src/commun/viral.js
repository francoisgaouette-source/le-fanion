  // ---------------- Effet viral : chaque joueur invité peut lancer son propre groupe, gratuit ----------------
  // Montré aux membres qui ne sont pas propriétaires d'un groupe (à l'accueil, et à la fin d'une partie).
  function ownsAGroup() { const me = meId(); return (!!me && me === ownerId()) || Store.myGroups().some(x => x.owner); }
  function viralCard(where) {
    if (ownsAGroup() || Store.needLogin) return '';
    if (where === 'home' && (ls.get('pelland.viral.hide', 0) || 0) > Date.now()) return '';
    return `<section class="card viral"><div class="viral-flag" aria-hidden="true"><svg width="22" height="26" viewBox="0 0 26 30"><path d="M5 2v26" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M6 3l15 5.5L6 14z" fill="#e3a90b"/></svg></div>
      <div><h3>Vous aussi, organisez votre gang</h3>
      <p>Créez votre propre groupe en une minute : invitations par texto, quatuors, pointage et argent calculés. <b>Gratuit pour 4 joueurs.</b></p>
      <div class="row"><button class="btn small" data-viral type="button">Créer mon groupe</button>${where === 'home' ? '<button class="btn ghost small" data-viralhide type="button">Plus tard</button>' : ''}</div>
      <p class="note">Vous restez dans « ${esc(groupName())} » : passez d’un groupe à l’autre à l’accueil.</p></div></section>`;
  }
  function myPhone() { const me = (S.players || []).find(p => p.id === meId()); return (me && me.phone) || ''; }
  function newGroupSheet() {
    openSheet(`<h3>Créer mon groupe</h3>
      <label>Nom du groupe<input id="vgName" type="text" autocapitalize="sentences" placeholder="ex. Les lève-tôt du samedi"></label>
      <label>Votre prénom et nom<input id="vgMe" type="text" autocapitalize="words" value="${esc(ls.get('pelland.me', '') || '')}"></label>
      <p class="note" id="vgMsg">Même compte et même mot de passe : vous passerez d’un groupe à l’autre à l’accueil. Ajoutez ensuite vos joueurs dans Joueurs ; ils reçoivent l’invitation par texto. Gratuit jusqu’à 4 joueurs.</p>
      <div class="row"><button class="btn small" id="vgGo" type="button">Créer le groupe</button><button class="btn ghost small" data-close type="button">Annuler</button></div>`, sh => {
      sh.querySelector('[data-close]').onclick = closeSheet;
      const b = sh.querySelector('#vgGo');
      // Déjà un groupe gratuit : on le dit tout de suite, avec le passage au forfait Groupe
      Store.groupeGratuit().then(g => { if (!g || !sh.isConnected) return; b.disabled = true;
        sh.querySelector('#vgMsg').innerHTML = `<b>Avec le forfait Gratuit, vous avez droit à un groupe de 4 joueurs.</b> Vous avez déjà « ${esc(g.name)} ». Passez-le au forfait Groupe (jusqu’à 16 joueurs) pour créer un autre groupe, ou supprimez-le dans Mon compte. <a class="linkbtn" href="${buyUrl()}" target="_blank" rel="noopener">Passer au forfait Groupe</a>`; }).catch(() => { });
      b.onclick = async () => {
        const msg = sh.querySelector('#vgMsg'); b.disabled = true; msg.textContent = 'Création…';
        try { await Store.createGroup(sh.querySelector('#vgName').value, sh.querySelector('#vgMe').value, Store.gid); ls.set('pelland.lastGame', null); location.href = location.pathname; }
        catch (e) { msg.textContent = e.message; b.disabled = false; }
      };
      setTimeout(() => { const i = sh.querySelector('#vgName'); if (i) i.focus(); }, 50);
    });
  }
  function rememberCurrent() { if (!Store.needLogin && meId()) Store.rememberGroup(Store.gid, groupName(), meId(), ls.get('pelland.me', ''), meId() === ownerId()); }
  async function switchGroupSheet() {
    let l = [];
    try { l = (await Store.myPlayers()).map(p => ({ gid: p.groupId || 'pelland', playerId: p.id, playerName: p.name, name: ((S.groups || []).find(g => g.id === (p.groupId || 'pelland')) || {}).name || p.groupId })); } catch (e) { }
    if (!l.length) l = Store.myGroups();
    openSheet(`<h3>Mes groupes</h3>
      <div class="pick-list">${l.map((x, i) => `<button class="btn ${x.gid === Store.gid ? '' : 'ghost'} small" data-gsw="${i}" type="button" ${x.gid === Store.gid ? 'disabled' : ''}>${esc(x.name)}${x.gid === Store.gid ? ' · actuel' : ''}</button>`).join('')}</div>
      <p class="note" id="gswMsg">Les groupes où votre cellulaire est inscrit. Touchez-en un pour y passer.</p>
      <div class="row"><button class="btn ghost small" data-viral type="button">Créer un autre groupe</button><button class="btn ghost small" data-close type="button">Fermer</button></div>`, sh => {
      sh.querySelector('[data-close]').onclick = closeSheet;
      sh.querySelectorAll('[data-gsw]').forEach(b => b.onclick = async () => {
        const msg = sh.querySelector('#gswMsg'); msg.textContent = 'Changement…';
        try { await Store.switchGroup(l[+b.dataset.gsw]); ls.set('pelland.lastGame', null); location.href = location.pathname; }
        catch (e) { msg.textContent = e.message; }
      });
    });
  }
  document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-typepartie]'); if (!t) return; e.preventDefault(); typePartieSheet(); });
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-viral],[data-viralhide],#switchGroup'); if (!t) return;
    e.preventDefault();
    if (t.id === 'switchGroup') return go('compte');
    if (t.hasAttribute('data-viralhide')) { ls.set('pelland.viral.hide', Date.now() + 30 * 864e5); return render(); }
    closeSheet();
    // Forfait Gratuit = un seul groupe : un deuxième groupe demande le forfait Groupe, comme un 5e joueur
    Store.groupeGratuit().then(g => g ? deuxiemeGroupeSheet(g) : newGroupSheet()).catch(() => newGroupSheet());
  });
