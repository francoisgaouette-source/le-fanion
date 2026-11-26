  const bind = {
    compte(v) { bindCompte(v); },
    login(v) {
      const done = () => { const q = new URLSearchParams(location.search); q.delete('joueur'); q.delete('ref'); location.href = location.pathname + (q.toString() ? '?' + q : ''); };
      const say = t => { const m = $('#acMsg') || $('#loginMsg'); if (m) m.textContent = t; };
      const go = $('#haiGo'); if (go) go.onclick = async () => { go.disabled = true; say('Connexion…'); try { await HoldingAI.connecter(); } catch (e) { go.disabled = false; say(e.message); } };
      const out = $('#haiOut'); if (out) out.onclick = () => Store.logout();
      const nc = $('#ngCreate'); if (nc) nc.onclick = async () => {
        nc.disabled = true; say('Création…');
        try { await Store.createGroup($('#ngName').value, $('#ngMe').value); done(); } catch (e) { nc.disabled = false; say(e.message); }
      };
    },
    offre(v) {
      commonNav(v);
      v.querySelectorAll('[data-dispo]').forEach(b => b.onclick = () => { const dt = +b.dataset.dispo, a = S.offreSel; const i = a.indexOf(dt); if (i >= 0) a.splice(i, 1); else a.push(dt); render(); });
      const cn = $('#dispoCancel'); if (cn) cn.onclick = () => { history.replaceState(null, '', location.pathname); go('home'); };
      const sv = $('#dispoSave'); if (sv) sv.onclick = async () => {
        const me = ls.get('pelland.me', '') || ''; if (!me) return toast('Connectez-vous d’abord.');
        const rep = { name: me, dates: S.offreSel.slice().sort(), at: Date.now() };
        try { await Store.saveOffre({ id: S.offre.id, ['rep_' + presKey(me)]: rep }, true); S.offre['rep_' + presKey(me)] = rep; render(); }
        catch (e) { toast('Enregistrement impossible : ' + e.message); }
      };
    },
    players(v) {
      if (!S.notifsAt || Date.now() - S.notifsAt > 60e3) { S.notifsAt = Date.now(); chargerNotifs(); }
      if (S.pMode === 'inviter' && !S.pFocused && roomLeft() > 0) { S.pFocused = true; setTimeout(() => { const i = $('#newPlayer'); if (i) i.focus(); }, 80); }
      v.querySelectorAll('[data-org]').forEach(b => b.onclick = async () => {
        // un seul organisateur (en plus du propriétaire) : en nommer un nouveau remplace l'ancien
        const gr = { ...curGroup() }, id = b.dataset.org, cur = (gr.organizers || [])[0];
        if (cur !== id && !hasAccepted(S.players.find(p => p.id === id))) return toast('Ce joueur n’a pas encore accepté son invitation (compte pas créé).');
        gr.organizers = cur === id ? [] : [id];
        try { await Store.saveGroup(gr); S.groups = await Store.listGroups(); render(); } catch (e) { toast('Impossible : ' + e.message); }
      });
      const co = $('#claimOwner'); if (co) co.onclick = async () => {
        const me = S.players.find(p => L.norm(p.name) === L.norm(ls.get('pelland.me', '') || ''));
        if (!me) return toast('Connectez-vous d’abord.');
        const gr = { ...curGroup(), owner: me.id };
        try { await Store.saveGroup(gr); S.groups = await Store.listGroups(); render(); } catch (e) { toast('Impossible : ' + e.message); }
      };
      const add = async () => {
        const n = $('#newPlayer').value.trim(); if (!n) return;
        if (S.players.some(p => L.norm(p.name) === L.norm(n))) return toast(`${n} est déjà dans la liste.`);
        const near = duplicateMap(S.players.concat([{ id: '__new', name: n }]))['__new'];
        if (near && S.confirmAdd !== n) { S.confirmAdd = n; return toast(`Ressemble à ${near.join(', ')}. Touchez Ajouter de nouveau pour confirmer.`); }
        S.confirmAdd = null;
        if (roomLeft() <= 0) return limitSheet();
        if ((S.bank || S.players).length >= BANQUE_MAX) return toast(`La banque de joueurs est pleine (${BANQUE_MAX}).`);
        try { const np = await Store.savePlayer(n, (S.bank || S.players).length); const ph = $('#newPhone').value.trim(); if (ph) await Store.setPhone(np, ph); S.players = await Store.listPlayers(); S.bank = await Store.listBank().catch(() => S.bank); render(); if (ph) inviteText(n, ph, np.id); else setTimeout(() => $('#newPlayer') && $('#newPlayer').focus(), 50); }
        catch (e) { toast('Ajout impossible : ' + e.message); }
      };
      if ($('#addPlayer')) $('#addPlayer').onclick = add;
      const xf = $('#xlsFile'); if (xf) xf.onchange = async () => { const f = xf.files[0]; xf.value = ''; if (f) importPlayersFile(f); };
      if ($('#newPlayer')) $('#newPlayer').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
      v.querySelectorAll('[data-askdel]').forEach(b => b.onclick = () => { S.confirmDel = b.dataset.askdel; render(); });
      if (canOrganize() && !S.bankAt) { S.bankAt = 1; Store.listBank().then(l => { S.bank = l; if (S.view === 'players') render(); }).catch(() => { }); }
      v.querySelectorAll('[data-membre]').forEach(b => b.onclick = async () => {
        if (roomLeft() <= 0) return limitSheet(S.players.length + 1);
        b.disabled = true; const p = (S.bank || []).find(x => x.id === b.dataset.membre);
        try { await Store.setMembre(b.dataset.membre, true); S.players = await Store.listPlayers(); S.bank = await Store.listBank().catch(() => S.bank); toast(`${p ? p.name : 'Le joueur'} est dans le groupe.`); render(); }
        catch (e) { b.disabled = false; toast('Impossible : ' + e.message); }
      });
      v.querySelectorAll('[data-bankdel]').forEach(b => b.onclick = async () => {
        const p = (S.bank || []).find(x => x.id === b.dataset.bankdel); if (!p) return;
        if (S.confirmBankDel !== p.id) { S.confirmBankDel = p.id; b.textContent = 'Enlever ?'; b.classList.add('danger-txt'); return; }
        b.disabled = true;
        try { await Store.deletePlayer(p.id, (S.bank || []).length); S.bank = await Store.listBank(); S.confirmBankDel = null; toast(`${p.name} est enlevé de la banque.`); render(); }
        catch (e) { b.disabled = false; toast('Impossible : ' + e.message); }
      });
      v.querySelectorAll('[data-reinv]').forEach(b => b.onclick = () => { const p = (S.bank || []).find(x => x.id === b.dataset.reinv); if (p) inviteText(p.name, p.phone, p.id); });
      if (canOrganize() && !S.retiredPlAt) { S.retiredPlAt = 1; Store.retiredPlayers().then(l => { S.retiredPl = l; if (l.length && S.view === 'players') render(); }).catch(() => { }); }
      v.querySelectorAll('[data-remettre]').forEach(b => b.onclick = async () => {
        const x = S.retiredPl[+b.dataset.remettre]; if (!x) return;
        if (roomLeft() <= 0) return toast(`Le groupe est complet (${S.players.length} / ${planOf().max}).`);
        b.disabled = true;
        try {
          const np = await Store.savePlayer(x.name, S.players.length);
          if (x.phone && x.phone.length >= 10) { try { await Store.setPhone(np, x.phone); } catch (e) { } }
          S.retiredPl = S.retiredPl.filter(y => y !== x); await Store.setRetiredPlayers(S.retiredPl);
          S.players = await Store.listPlayers(); S.bank = await Store.listBank().catch(() => S.bank); toast(`${x.name} est de retour dans le groupe.`); render();
          if (x.phone) inviteText(x.name, x.phone, np && np.id);
        } catch (e) { b.disabled = false; toast('Impossible : ' + e.message); }
      });
      v.querySelectorAll('[data-oublier]').forEach(b => b.onclick = async () => {
        const x = S.retiredPl[+b.dataset.oublier]; if (!x) return;
        S.retiredPl = S.retiredPl.filter(y => y !== x); try { await Store.setRetiredPlayers(S.retiredPl); } catch (e) { } toast(`${x.name} est enlevé de la banque.`); render();
      });
      v.querySelectorAll('[data-phone]').forEach(b => b.onclick = () => {
        const pl = S.players.find(x => x.id === b.dataset.phone);
        openSheet(`<h3>Téléphone de ${esc(pl.name)}</h3>
          <p class="note">${pl.phone ? `Numéro actuel : <b style="font-size:20px">${esc(fmtPhone(pl.phone))}</b>` : pl.authEmail ? `Numéro actuel : se termine par <b>${esc(pl.phoneHint || '')}</b>. Entrez le numéro complet une fois ci-dessous et touchez Enregistrer : il s’affichera ensuite.` : 'Aucun numéro pour l’instant.'}</p>
          <label>${pl.authEmail ? 'Nouveau numéro' : 'Numéro'}<input id="phIn" type="tel" inputmode="tel" placeholder="450 555-1234" value="${esc(pl.phone ? fmtPhone(pl.phone) : '')}"></label>
          <p class="note">Ce numéro sert à se connecter. Il est visible seulement par les joueurs du groupe.</p>
          ${Store.phonesBlocked ? '<div class="warn">La base a refusé d’enregistrer ce numéro. Réessayez, ou écrivez à ' + MARQUE.courriel + '.</div>' : ''}
          <div class="row"><button class="btn small" id="phSave" type="button">Enregistrer</button><button class="btn ghost small" data-close type="button">Annuler</button></div>`, sh => {
          sh.querySelector('[data-close]').onclick = closeSheet;
          sh.querySelector('#phSave').onclick = async () => {
            try { const first = !pl.authEmail, ph = sh.querySelector('#phIn').value; await Store.setPhone(pl, ph); closeSheet(); S.players = await Store.listPlayers(); S.bank = await Store.listBank().catch(() => S.bank); toast('Téléphone enregistré.'); render(); if (first) inviteText(pl.name, ph, pl.id); }
            catch (e) { toast(e.message); }
          };
          setTimeout(() => { const i = sh.querySelector('#phIn'); if (i) { i.focus(); i.select(); } }, 50);
        });
      });
      v.querySelectorAll('[data-rename]').forEach(b => b.onclick = () => {
        const pl = S.players.find(x => x.id === b.dataset.rename);
        openSheet(`<h3>Modifier le nom</h3>
          <label>Prénom et nom<input id="rnIn" type="text" autocapitalize="words" value="${esc(pl.name)}"></label>
          <p class="note">Les parties déjà jouées gardent l’ancien nom.</p>
          <div class="row"><button class="btn small" id="rnSave" type="button">Enregistrer</button><button class="btn ghost small" data-close type="button">Annuler</button></div>`, sh => {
          sh.querySelector('[data-close]').onclick = closeSheet;
          sh.querySelector('#rnSave').onclick = async () => {
            const nm = sh.querySelector('#rnIn').value.trim().replace(/\s+/g, ' ');
            if (!nm) return toast('Entrez un nom.');
            if (S.players.some(x => x.id !== pl.id && L.norm(x.name) === L.norm(nm))) return toast('Ce nom est déjà dans le groupe.');
            try { const self = pl.id === meId(); await Store.renamePlayer(pl.id, nm); if (self) ls.set('pelland.me', nm); closeSheet(); S.players = await Store.listPlayers(); S.bank = await Store.listBank().catch(() => S.bank); toast('Nom modifié.'); render(); }
            catch (e) { toast('Impossible : ' + e.message); }
          };
          setTimeout(() => { const i = sh.querySelector('#rnIn'); if (i) { i.focus(); i.select(); } }, 50);
        });
      });
      const sm = v.querySelector('[data-selmode]'); if (sm) sm.onclick = () => { S.selMode = !S.selMode; S.sel = []; S.confirmBulk = false; render(); };
      v.querySelectorAll('[data-selp]').forEach(c => c.onchange = () => { const id = c.dataset.selp; S.sel = (S.sel || []).filter(x => x !== id); if (c.checked) S.sel.push(id); S.confirmBulk = false; render(); });
      const sa = v.querySelector('[data-selall]'); if (sa) sa.onclick = () => { const all = S.players.filter(canRemove).map(p => p.id); S.sel = (S.sel || []).length === all.length ? [] : all; S.confirmBulk = false; render(); };
      const ba = v.querySelector('[data-bulkask]'); if (ba) ba.onclick = () => { S.confirmBulk = true; render(); };
      const bc = v.querySelector('[data-bulkcancel]'); if (bc) bc.onclick = () => { S.confirmBulk = false; render(); };
      const bd = v.querySelector('[data-bulkdel]'); if (bd) bd.onclick = async () => {
        const ids = (S.sel || []).slice(); let ok = 0;
        for (const id of ids) { try { await Store.setMembre(id, false); ok++; } catch (e) { } }
        S.players = await Store.listPlayers(); S.bank = await Store.listBank().catch(() => S.bank); S.sel = []; S.confirmBulk = false; S.selMode = false;
        toast(ok === ids.length ? `${ok} joueur${ok > 1 ? 's' : ''} retiré${ok > 1 ? 's' : ''}.` : `${ok} sur ${ids.length} retirés : réessayez pour les autres.`); render();
      };
      v.querySelectorAll('[data-canceldel]').forEach(b => b.onclick = () => { S.confirmDel = null; render(); });
      v.querySelectorAll('[data-delp]').forEach(b => b.onclick = async () => {
        const p = S.players.find(x => x.id === b.dataset.delp);
        try { await Store.setMembre(b.dataset.delp, false); S.players = await Store.listPlayers(); S.bank = await Store.listBank().catch(() => S.bank); S.confirmDel = null; toast(`${p ? p.name : 'Le joueur'} est retiré du groupe ; il reste dans la banque.`); render(); } catch (e) { toast('Retrait impossible : ' + e.message); }
      });
    },
  };

  function commonNav(v) {
    v.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go, b.dataset.go === 'setup' ? { draft: null } : b.dataset.go === 'players' ? { pMode: b.dataset.pmode || 'banque' } : b.dataset.go === 'comps' ? { compLive: !!b.dataset.clive } : b.dataset.new ? { editCourse: null } : {}));
    v.querySelectorAll('[data-open]').forEach(b => b.onclick = () => MODULE.ouvrir(b.dataset.open));
  }
