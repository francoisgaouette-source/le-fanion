  // ---------------- Mon compte : le compte de la personne et tous les groupes dont elle fait partie ----------------
  function groupRows(l, cur, base) {
    return `<div class="acct-groups">${l.map((x, k) => [x, base ? base.indexOf(x) : k]).map(([x, i]) => `<div class="acct-g ${x.gid === cur ? 'cur' : ''}"><div><b><span class="g-k">Groupe :</span> ${esc(x.name)}</b><small>${esc(x.playerName)} · ${x.organizer ? 'organisateur' : 'participant'}</small></div>${x.gid === cur ? '<span class="acct-cur">Groupe actuel</span>' : `<button class="btn small" data-gopen="${i}" type="button">Ouvrir</button>`}${x.gid === cur && x.owner && !S.fromLogin ? `<div class="g-manage"><button class="btn ghost small" data-pickorg type="button">${(curGroup().organizers || []).length ? 'Changer l’organisateur' : 'Nommer un organisateur'}</button>${x.archived
        ? '<button class="btn ghost small" data-grpstate="unarchive" type="button">Rétablir le groupe</button>'
        : '<button class="btn ghost small" data-grpstate="archive" type="button">Archiver le groupe</button>'}<button class="btn ghost small danger-txt" data-grpstate="delete" type="button">Supprimer le groupe</button>
        <small>Archiver : le groupe est mis de côté pour tous, rien n’est perdu et vous pouvez le rétablir. Supprimer : il disparaît pour tous avec ses parties, ses dates et ses compétitions, sans retour possible.</small></div>` : ''}</div>`).join('') || '<p class="note">Aucun groupe pour l’instant.</p>'}</div>`;
  }
  function vCompte() {
    $('#barTitle').textContent = 'Mon compte';
    if (S.acctGroups == null) { Store.myGroupList().then(l => { S.acctGroups = l; S.myPlayers = l; if (S.view === 'compte') render(); }).catch(() => { S.acctGroups = []; render(); }); return '<p class="note">Chargement…</p>'; }
    const u = { uid: Store.uid }, cell = (Store.e164 || '').replace(/^\+1/, '');
    const mine = S.acctGroups.find(g => g.gid === Store.gid) || S.acctGroups[0];
    if (mine && !S.fromLogin) ls.set('pelland.me', mine.playerName);
    return `<section class="card"><h2>${esc(mine ? mine.playerName : ls.get('pelland.me', '') || '')}</h2>
        ${S.fromLogin ? '<p class="note"><b>Bienvenue !</b> Choisissez votre groupe.</p>' : ''}
        <p class="note">${cell ? 'Cellulaire confirmé : ' + esc(fmtPhone(cell)) : 'Votre compte L’Établi n’a pas de cellulaire confirmé : ajoutez-le dans « Mon compte L’Établi ».'}</p>
        ${u.uid ? `<p class="note uid-ligne">Identifiant du compte : <code>${esc(u.uid)}</code> <button class="linkbtn" data-copyuid="${esc(u.uid)}" type="button">Copier</button>${P.admin ? ' · <b>approbateur des terrains ✓</b>' : ''}</p>` : ''}</section>
      ${S.fromLogin ? '' : forfaitHtml()}
      <h3 class="acct-h">Compte L’Établi</h3>
      <div class="acct-box acct-g"><div><b>Cellulaire et mot de passe</b><small>Votre compte L’Établi sert dans toutes les apps de L’Établi. Albert s’en occupe.</small></div><a class="btn ghost small" href="${esc(HoldingAI.compteUrl)}">Gérer</a></div>
      <h3 class="acct-h acct-h-act"><span>Mes groupes (${S.acctGroups.filter(x => !x.archived).length})</span><button class="btn ghost small" data-viral type="button">+ Ajouter un groupe</button></h3>
      ${groupRows(S.acctGroups.filter(x => !x.archived), S.fromLogin ? null : Store.gid, S.acctGroups).replace(S.fromLogin ? /Ouvrir/g : /^$/, 'Entrer')}
      ${S.acctGroups.some(x => x.archived) ? `<h3 class="acct-h">Groupes archivés (${S.acctGroups.filter(x => x.archived).length})</h3>
        ${groupRows(S.acctGroups.filter(x => x.archived), S.fromLogin ? null : Store.gid, S.acctGroups)}<p class="note">Un groupe archivé garde ses joueurs, ses parties et ses résultats. Son propriétaire peut le rétablir.</p>` : ''}
      <p class="note">Ce sont les groupes où votre cellulaire est inscrit. Pour en rejoindre un autre, demandez à son organisateur de vous ajouter dans Joueurs.</p>
      <div class="row acct-actions"><button class="btn ghost small" type="button" data-hai-inviter>💌 Inviter quelqu’un</button><button class="btn ghost small" data-avis type="button">Donner mon avis</button><button class="btn ghost small" data-idee type="button">💡 Une idée ?</button></div>
      <button class="btn ghost danger-txt acct-logout" id="logout2" type="button">Se déconnecter</button>`;
  }
  // Forfait du groupe actif (le propriétaire peut passer au forfait Groupe ou le renouveler)
  function forfaitHtml() {
    const pl = planOf(), n = (S.players || []).length, meOwner = !!meId() && meId() === ownerId();
    const own = (S.players || []).find(p => p.id === ownerId());
    const until = pl.until ? 'jusqu’au ' + new Date(pl.until).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' }) : pl.expired ? 'saison terminée' : 'sans limite de temps';
    return `<h3 class="acct-h">Forfait · ${esc(groupName())}</h3>
      <div class="acct-box">
        <div class="forfait-l"><b>${pl.name}</b><span class="${n > pl.max ? 'over' : ''}">${n} / ${pl.max} joueurs</span><span>${until}</span></div>
        <p class="note">${pl.paid ? 'Le forfait Groupe permet jusqu’à 16 joueurs.' : 'Le forfait Gratuit permet 4 joueurs. Le forfait Groupe va jusqu’à 16.'} ${meOwner ? 'Vous êtes le propriétaire : c’est vous qui gérez le forfait.' : 'Le forfait est géré par le propriétaire du groupe' + (own ? ' (' + esc(own.name) + ')' : '') + '.'}</p>
        ${meOwner ? `<a class="btn small" href="${buyUrl()}" target="_blank" rel="noopener">${pl.paid ? 'Renouveler ou gérer' : 'Passer au forfait Groupe'}</a>` : ''}
      </div>`;
  }
  // Gérer le groupe actif : archiver / rétablir / supprimer (propriétaire seulement)
  function manageGroupHtml() {
    if (S.fromLogin) return '';
    const me = (S.acctGroups || []).find(x => x.gid === Store.gid);
    if (!me || !me.owner) return '';
    return `<h3 class="acct-h">Gérer « ${esc(me.name)} »</h3>
      <section class="card manage-g">
        ${me.archived
          ? `<p class="note">Ce groupe est archivé. Rétablissez-le pour recommencer à organiser des parties.</p><button class="btn small" data-grpstate="unarchive" type="button">Rétablir le groupe</button>`
          : `<p class="note"><b>Archiver :</b> le groupe passe dans « Groupes archivés », pour vous et pour tous les joueurs. Rien n’est perdu ; vous pouvez le rétablir.</p><button class="btn ghost small" data-grpstate="archive" type="button">Archiver le groupe</button>`}
        <p class="note" style="margin-top:14px"><b>Supprimer :</b> le groupe disparaît pour vous et pour tous les joueurs, avec ses parties, ses dates et ses compétitions. Impossible de revenir en arrière.</p>
        <button class="btn ghost small danger-txt" data-grpstate="delete" type="button">Supprimer le groupe</button>
      </section>`;
  }
  async function setGroupState(kind) {
    const me = (S.acctGroups || []).find(x => x.gid === Store.gid); if (!me) return;
    const done = async (flags, msg) => {
      try { await Store.setGroupState(flags); } catch (e) { toast('Impossible : ' + (/permission/i.test(e.message) ? 'seul le propriétaire peut le faire.' : e.message)); return false; }
      S.groups = await Store.listGroups().catch(() => S.groups); S.acctGroups = null; toast(msg); return true;
    };
    if (kind === 'archive') { if (await done({ archived: Date.now() }, `« ${me.name} » est archivé.`)) render(); return; }
    if (kind === 'unarchive') { if (await done({ archived: 0 }, `« ${me.name} » est rétabli.`)) render(); return; }
    openSheet(`<h3>Supprimer « ${esc(me.name)} » ?</h3>
      <p>Le groupe disparaîtra pour vous et pour ses ${(S.players || []).length} joueurs, avec ses parties, ses dates offertes et ses compétitions.</p>
      <p class="warn">C’est définitif. Pour seulement le mettre de côté, choisissez plutôt « Archiver ».</p>
      <label>Pour confirmer, écrivez le nom du groupe<input id="delName" type="text" autocomplete="off" placeholder="${esc(me.name)}"></label>
      <div class="sheet-actions"><button class="btn" id="delGo" type="button" style="background:var(--red)" disabled>Supprimer définitivement</button><button class="btn ghost" data-close type="button">Annuler</button></div>`, sh => {
      const inp = sh.querySelector('#delName'), go2 = sh.querySelector('#delGo');
      inp.oninput = () => { go2.disabled = L.norm(inp.value) !== L.norm(me.name); };
      sh.querySelector('[data-close]').onclick = closeSheet;
      go2.onclick = async () => {
        go2.disabled = true;
        if (!(await done({ deleted: Date.now() }, `« ${me.name} » est supprimé.`))) { go2.disabled = false; return; }
        closeSheet();
        const rest = (await Store.myGroupList().catch(() => [])).filter(x => x.gid !== me.gid);
        if (rest.length) openGroup(rest.find(x => !x.archived) || rest[0]);
        else { S.acctGroups = []; go('compte'); setTimeout(newGroupSheet, 400); }
      };
    });
  }
  async function openGroup(x) {
    try { await Store.switchGroup(x); ls.set('pelland.lastGame', null); location.href = location.pathname; } catch (e) { toast(e.message); }
  }
  function bindCompte(v) {
      commonNav(v);
      v.querySelectorAll('[data-gopen]').forEach(b => b.onclick = () => { b.disabled = true; b.textContent = '…'; openGroup(S.acctGroups[+b.dataset.gopen]); });
      v.querySelectorAll('[data-grpstate]').forEach(b => b.onclick = () => setGroupState(b.dataset.grpstate));
      const lo = v.querySelector('#logout2'); if (lo) lo.onclick = () => Store.logout();
      const cp = v.querySelector('#chgPw'); if (cp) cp.onclick = () => openSheet(`<h3>Changer mon mot de passe</h3>
          <label>Nouveau mot de passe<input id="np1" type="password" autocomplete="new-password" placeholder="6 caractères ou plus"></label>
          <label>Confirmez<input id="np2" type="password" autocomplete="new-password"></label>
          <p class="note" id="npMsg"></p>
          <div class="row"><button class="btn small" id="npGo" type="button">Enregistrer</button><button class="btn ghost small" data-close type="button">Annuler</button></div>`, sh => {
        sh.querySelector('[data-close]').onclick = closeSheet;
        sh.querySelector('#npGo').onclick = async () => {
          const a = sh.querySelector('#np1').value, b = sh.querySelector('#np2').value, m = sh.querySelector('#npMsg');
          if (a.length < 6) return m.textContent = 'Au moins 6 caractères.'; if (a !== b) return m.textContent = 'Les deux mots de passe ne sont pas pareils.';
          try { closeSheet(); location.href = HoldingAI.compteUrl; }
          catch (e) { m.textContent = /recent/.test(e.code || '') ? 'Pour votre sécurité : déconnectez-vous, puis « Mot de passe oublié ? » sur l’écran de connexion.' : 'Impossible : ' + (e.code || e.message); }
        };
      });
    }
