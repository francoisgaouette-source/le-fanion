  // ---------- Import de joueurs depuis Excel (ou CSV) : nom + cellulaire ----------
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((ok, ko) => { const sc = document.createElement('script'); sc.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'; sc.onload = () => ok(window.XLSX); sc.onerror = () => ko(new Error('Lecture Excel indisponible (réseau).')); document.head.appendChild(sc); });
  }
  const phoneDigits = v => { let d = String(v == null ? '' : v).replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d; };
  // Lignes du tableau → [{ name, phone }] ; trouve les colonnes par leur titre (Nom, Prénom, Cellulaire…) ou prend les deux premières
  function rowsToPlayers(rows) {
    rows = rows.filter(r => r && r.some(c => String(c ?? '').trim() !== ''));
    if (!rows.length) return [];
    const nrm = x => L.norm(String(x ?? ''));
    let hi = -1, cName = -1, cFirst = -1, cLast = -1, cPhone = -1;
    for (let i = 0; i < Math.min(5, rows.length) && hi < 0; i++) {
      const h = rows[i].map(nrm);
      const ph = h.findIndex(x => /cell|tel|phone|mobile|portable|numero/.test(x));
      const fi = h.findIndex(x => /prenom|first/.test(x));
      const la = h.findIndex((x, j) => j !== fi && /(^| )nom( |$)|famille|last|surname/.test(x));
      const nm = h.findIndex((x, j) => j !== fi && /nom|name|joueur/.test(x));
      if (ph >= 0 || nm >= 0 || fi >= 0) { hi = i; cPhone = ph; cFirst = fi; cLast = fi >= 0 ? la : -1; cName = fi >= 0 ? -1 : nm; }
    }
    const data = hi >= 0 ? rows.slice(hi + 1) : rows;
    if (hi < 0 || (cName < 0 && cFirst < 0)) { // pas de titres : la colonne avec des chiffres = téléphone, l'autre = nom
      const r0 = data[0] || [];
      cPhone = cPhone >= 0 ? cPhone : r0.findIndex(c => phoneDigits(c).length >= 7);
      cName = r0.findIndex((c, j) => j !== cPhone && String(c ?? '').trim() && phoneDigits(c).length < 7);
    }
    return data.map(r => {
      const name = (cFirst >= 0 ? [r[cFirst], cLast >= 0 ? r[cLast] : ''] : [r[cName]]).map(x => String(x ?? '').trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ');
      return { name, phone: cPhone >= 0 ? phoneDigits(r[cPhone]) : '' };
    }).filter(x => x.name);
  }
  async function importPlayersFile(file) {
    let rows;
    try {
      if (/\.csv$/i.test(file.name)) { const t = await file.text(); const sep = (t.split('\n')[0].match(/;/g) || []).length > (t.split('\n')[0].match(/,/g) || []).length ? ';' : ','; rows = t.split(/\r?\n/).map(l => l.split(sep).map(c => c.replace(/^"|"$/g, ''))); }
      else { const X = await loadXLSX(); const wb = X.read(await file.arrayBuffer(), { type: 'array' }); rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }); }
    } catch (e) { return toast('Fichier illisible : ' + e.message); }
    const list = rowsToPlayers(rows);
    if (!list.length) return toast('Aucun nom trouvé dans le fichier.');
    const seen = new Set(S.players.map(p => L.norm(p.name)));
    const items = list.map(x => { const dup = seen.has(L.norm(x.name)); seen.add(L.norm(x.name)); const bad = x.phone && x.phone.length !== 10; return { ...x, dup, bad, on: !dup && !bad }; });
    const draw = sh => {
      const n = items.filter(x => x.on).length, room = roomLeft(), over = n > room;
      sh.innerHTML = `<h3>Importer des joueurs</h3><p class="note">${items.length} ligne${items.length > 1 ? 's' : ''} lue${items.length > 1 ? 's' : ''} dans « ${esc(file.name)} ». Décochez ceux à ne pas ajouter.</p>
        <div class="imp-list">${items.map((x, i) => `<label class="imp-row ${x.dup || x.bad ? 'warnrow' : ''}"><input type="checkbox" data-imp="${i}" ${x.on ? 'checked' : ''} ${x.dup ? 'disabled' : ''}><span><b>${esc(x.name)}</b><small>${x.phone ? esc(fmtPhone(x.phone)) : 'Pas de numéro'}${x.dup ? ' · déjà dans le groupe' : x.bad ? ' · numéro à vérifier' : ''}</small></span></label>`).join('')}</div>
        ${over ? `<div class="warn">Votre forfait ${planOf().name} permet ${planOf().max} joueurs : il reste ${Math.max(0, room)} place${room > 1 ? 's' : ''}. Décochez-en ${n - Math.max(0, room)} ou <button class="linkbtn" data-limit type="button">passez au forfait Groupe</button>.</div>` : ''}
        <p class="note">Les invitations par texto s’envoient ensuite depuis la liste, avec le bouton ☎ de chaque joueur.</p>
        <div class="row"><button class="btn small" id="impGo" type="button" ${n && !over ? '' : 'disabled'}>Importer (${n})</button><button class="btn ghost small" data-close type="button">Annuler</button></div>`;
      sh.querySelectorAll('[data-imp]').forEach(c => c.onchange = () => { items[+c.dataset.imp].on = c.checked; draw(sh); });
      const lm = sh.querySelector('[data-limit]'); if (lm) lm.onclick = () => { closeSheet(); setTimeout(() => limitSheet(n), 50); };
      sh.querySelector('[data-close]').onclick = closeSheet;
      sh.querySelector('#impGo').onclick = async () => {
        const todo = items.filter(x => x.on); let ok = 0, phErr = 0;
        const btn = sh.querySelector('#impGo'); btn.disabled = true;
        for (const x of todo) {
          btn.textContent = `Ajout… ${ok + 1}/${todo.length}`;
          try { const np = await Store.savePlayer(x.name, S.players.length + ok); ok++; if (x.phone && x.phone.length >= 10) { try { await Store.setPhone(np, x.phone); } catch (e) { phErr++; } } } catch (e) { }
        }
        S.players = await Store.listPlayers(); S.bank = await Store.listBank().catch(() => S.bank); closeSheet(); render();
        toast(`${ok} joueur${ok > 1 ? 's' : ''} ajouté${ok > 1 ? 's' : ''}${phErr ? ` · ${phErr} numéro${phErr > 1 ? 's' : ''} à refaire` : ''}.`);
      };
    };
    openSheet('', sh => draw(sh));
  }
  // Peut être retiré en lot : ni le propriétaire, ni soi-même
  // Banque de joueurs hors du groupe : confirmés (compte créé) que l'organisateur peut ajouter au groupe, et en attente de confirmation
  function banqueHtml() {
    if (!canOrganize() || !S.bank) return '';
    const hors = S.bank.filter(p => p.membre === false), conf = hors.filter(hasAccepted), att = hors.filter(p => !hasAccepted(p)), room = roomLeft();
    const ligne = (p, act) => `<div class="item pl-row bank-row"><div><b>${esc(p.name)}</b><span>${hasAccepted(p) ? '<span class="pl-st ok">✓ Confirmé</span>' : '<span class="pl-st wait">En attente de confirmation</span>'}${p.phone ? ' · ☎ ' + esc(fmtPhone(p.phone)) : ''}</span></div><span class="row" style="flex-wrap:nowrap;flex:none">${act}</span></div>`;
    return `<h3 class="acct-h">Banque de joueurs : hors du groupe (${hors.length})</h3>
      <p class="note"><b>Banque : ${S.bank.length} / ${BANQUE_MAX} joueurs.</b> Le groupe compte ${S.players.length} / ${planOf().max} membres. ${room > 0 ? `Ajoutez au groupe les joueurs confirmés (il reste ${room} place${room > 1 ? 's' : ''}).` : 'Le groupe est complet.'}</p>
      ${conf.length ? `<div class="list">${conf.map(p => ligne(p, `<button class="btn small" data-membre="${esc(p.id)}" type="button">Ajouter au groupe</button>${isProprio() && p.id !== ownerId() ? `<button class="btn ghost small" data-bankdel="${esc(p.id)}" type="button" aria-label="Enlever ${esc(p.name)} de la banque">✕</button>` : ''}`)).join('')}</div>` : '<p class="note">Aucun joueur confirmé hors du groupe.</p>'}
      ${att.length ? `<h4 class="bank-h">En attente de confirmation (${att.length})</h4><p class="note">Ils doivent créer leur compte avec le texto d’invitation avant d’entrer dans le groupe.</p>
        <div class="list">${att.map(p => ligne(p, `${p.phone && isProprio() ? `<button class="btn ghost small" data-reinv="${esc(p.id)}" type="button">Texto</button>` : ''}${isProprio() ? `<button class="btn ghost small" data-bankdel="${esc(p.id)}" type="button" aria-label="Enlever ${esc(p.name)} de la banque">✕</button>` : ''}`)).join('')}</div>` : ''}`;
  }
  const canRemove = p => canOrganize() && p.id !== ownerId() && p.id !== meId();
  function vPlayers() {
    const inviter = S.pMode === 'inviter';
    $('#barTitle').textContent = inviter ? 'Inviter des joueurs' : 'Banque de joueurs';
    // Seul le propriétaire du groupe ajoute des joueurs (nom, cellulaire, import Excel, remettre un retiré)
    const proprio = isProprio(), banque = (S.bank || S.players).length;
    return `${inviter ? `<p class="note"><b>Choisissez les membres du groupe parmi les joueurs confirmés de la banque.</b> Un joueur est confirmé quand il a créé son compte avec le texto d’invitation.</p>` + banqueHtml() : ''}${!proprio ? `<p class="note">Seul le propriétaire du groupe${(S.players.find(p => p.id === ownerId()) || {}).name ? ' (' + esc(S.players.find(p => p.id === ownerId()).name) + ')' : ''} peut ajouter des joueurs à la banque.</p>` : `<section class="card"><h2>Ajouter un joueur à la banque</h2>
        ${banque >= BANQUE_MAX ? `<div class="full-box"><b>La banque de joueurs est pleine : ${banque} / ${BANQUE_MAX}.</b><p>Enlevez un joueur de la banque pour en ajouter un autre.</p></div>`
        : `<p class="note">Entrez le nom et le cellulaire : un texto d’invitation est prêt à envoyer. Une fois son compte créé, le joueur est confirmé et peut être ajouté au groupe.</p>        <input id="newPlayer" type="text" placeholder="Prénom et nom" autocapitalize="words">
        <div class="row" style="flex-wrap:nowrap"><input id="newPhone" type="tel" inputmode="tel" placeholder="Cellulaire" style="flex:1;min-width:0"><button class="btn small" id="addPlayer" type="button">Ajouter</button></div>
        <div class="import-row"><label class="btn ghost small" for="xlsFile">Importer un fichier Excel</label><input id="xlsFile" type="file" accept=".xlsx,.xls,.csv,.ods" hidden><span class="note">Deux colonnes : le nom et le cellulaire.</span></div>`}
        </section>`}
      ${canOrganize() && S.notifs ? (() => { const sans = S.players.filter(p => hasAccepted(p) && p.id !== meId() && (S.notifs[p.id] || 'a_activer') !== 'actif'); const bl = sans.filter(p => ['bloque', 'non_supporte'].includes(S.notifs[p.id]));
        return sans.length ? `<div class="warn notif-warn"><b>${sans.length} joueur${sans.length > 1 ? 's ne reçoivent' : ' ne reçoit'} pas les notifications :</b> ${sans.map(p => esc(p.name) + ' (' + NOTIF[S.notifs[p.id] || 'a_activer'][1].replace(/^🔕 /, '').toLowerCase() + ')').join(', ')}.
          ${bl.length ? 'Ils ne verront ni les dates, ni les rappels, ni les parties : parlez-leur, ou retirez-les du groupe.' : 'Rappelez-leur d’ouvrir l’app et d’accepter les notifications.'}</div>` : ''; })() : ''}
      ${(() => { const dups = duplicateMap(S.players); const nd = Object.keys(dups).length; return nd ? `<div class="warn">${nd} joueurs semblent en double. Vérifiez les noms marqués « Doublon ? » et retirez celui de trop.</div>` : ''; })()}
      ${!ownerId() && S.players.length ? `<div class="warn">Le groupe n’a pas encore de propriétaire (la personne qui l’administre et paie l’abonnement). <button class="linkbtn" id="claimOwner" type="button">C’est moi</button></div>` : ''}
      ${S.players.length ? `<div class="row pl-head"><p class="pl-count"><b>${S.players.length}</b> joueur${S.players.length > 1 ? 's' : ''} dans le groupe</p>${canOrganize() ? `<button class="btn ghost small" data-selmode type="button">${S.selMode ? 'Terminer' : 'Sélectionner'}</button>` : ''}</div>` : ''}
      ${S.selMode ? (() => { const sel = S.sel || [], removable = S.players.filter(p => canRemove(p)); return `<div class="sel-bar"><button class="linkbtn" data-selall type="button">${sel.length === removable.length && removable.length ? 'Tout désélectionner' : 'Tout sélectionner'}</button><span class="note">${sel.length} sélectionné${sel.length > 1 ? 's' : ''}</span>${sel.length ? (S.confirmBulk ? `<button class="btn small" data-bulkdel type="button" style="background:var(--red)">Confirmer : retirer ${sel.length}</button><button class="btn ghost small" data-bulkcancel type="button">Annuler</button>` : `<button class="btn small" data-bulkask type="button" style="background:var(--red)">Retirer (${sel.length})</button>`) : ''}</div>`; })() : ''}
      <div class="list">${S.players.length ? (() => { const dups = duplicateMap(S.players); return S.players.map((p, n) => S.selMode ? `<label class="item pl-row sel-row ${dups[p.id] ? 'dup' : ''}">${canRemove(p) ? `<input type="checkbox" data-selp="${esc(p.id)}" ${(S.sel || []).includes(p.id) ? 'checked' : ''}>` : '<span class="sel-lock" title="Ne peut pas être retiré">—</span>'}<b><span class="pl-n">${n + 1}.</span> ${esc(p.name)}${p.id === ownerId() ? ' <span class="owner-tag">Propriétaire</span>' : ''}${p.id === meId() ? ' <span class="note">(vous)</span>' : ''}</b></label>` : `<div class="item pl-row ${dups[p.id] ? 'dup' : ''}"><b><span class="pl-n">${n + 1}.</span> ${canOrganize() || p.id === meId() ? `<button class="name-btn" data-rename="${esc(p.id)}" type="button">${esc(p.name)}</button>` : esc(p.name)}${p.id === ownerId() ? ' <span class="owner-tag">Propriétaire</span>' : !ownerId() ? '' : meId() === ownerId() ? ` <button class="role-chip ${isOrganizer(p.id) ? 'on' : ''}" data-org="${esc(p.id)}" type="button" ${!isOrganizer(p.id) && !hasAccepted(p) ? 'disabled title="Invitation pas encore acceptée"' : ''}>${isOrganizer(p.id) ? 'Organisateur ✓' : '+ Organisateur'}</button>` : isOrganizer(p.id) ? ' <span class="org-tag">Organisateur</span>' : ''}${dups[p.id] ? ` <span class="dup-flag" title="Ressemble à ${esc(dups[p.id].join(', '))}">Doublon ?</span>` : ''}${plStatus(p)}</b>${S.confirmDel === p.id
        ? `<span class="row"><button class="btn small" data-delp="${esc(p.id)}" type="button" style="background:var(--red)">Confirmer</button><button class="btn ghost small" data-canceldel type="button">Annuler</button></span>`
        : `<span class="row" style="flex-wrap:nowrap;flex:none"><button class="btn ghost small" data-phone="${esc(p.id)}" type="button">${p.phone ? '☎ ' + esc(fmtPhone(p.phone)) : p.authEmail ? '☎ ••' + esc(p.phoneHint || '') : '+ Téléphone'}</button>${p.id === ownerId() || !canOrganize() ? '' : `<button class="btn ghost small" data-askdel="${esc(p.id)}" type="button">Retirer</button>`}</span>`}</div>`).join(''); })() : '<p class="note">Aucun joueur pour l\'instant.</p>'}</div>
      ${inviter ? '' : banqueHtml()}
      ${isProprio() && (S.retiredPl || []).length ? `<h3 class="acct-h">Anciens joueurs (${S.retiredPl.length})</h3><p class="note"><b>Banque : ${S.players.length + S.retiredPl.length} / ${BANQUE_MAX} joueurs</b> (groupe et retirés ; au-delà, les plus anciens retirés sont oubliés). Ils ne font plus partie du groupe : plus de notifications ni d’accès. Leur nom et leur cellulaire restent ici pour les remettre en un geste.</p>
        <div class="list">${S.retiredPl.map((x, i) => `<div class="item pl-row retire-row"><div><b>${esc(x.name)}</b><span>${x.phone ? '☎ ' + esc(fmtPhone(x.phone)) + ' · ' : ''}retiré le ${new Date(x.retireLe).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long' })}</span></div>
          <span class="row" style="flex-wrap:nowrap;flex:none"><button class="btn small" data-remettre="${i}" type="button">Remettre</button><button class="btn ghost small" data-oublier="${i}" type="button" aria-label="Enlever ${esc(x.name)} de la banque">✕</button></span></div>`).join('')}</div>` : ''}`;
  }
  // Statut d'invitation d'un joueur : compte créé, invité en attente, ou sans cellulaire
  // Notifications de chaque joueur, pour l'organisateur (lu dans subs du groupe)

  // « 20 » → « 20,00 » ; vide reste vide
  function fmtPhone(d) { d = String(d || '').replace(/\D/g, ''); if (d.length === 11 && d[0] === '1') d = d.slice(1); return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6)}` : d; }
