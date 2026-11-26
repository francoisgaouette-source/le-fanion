
  // =====================================================================
  // Base de données : Supabase (projet « Le Fanion ») avec le compte HoldingAI ; sinon stockage local
  // Connexion : « Continuer avec HoldingAI » (holdingai.js). La base reçoit le jeton HoldingAI ; ses règles lisent
  // auth.jwt()->>'sub' (le compte) et son cellulaire confirmé. Voir supabase/LISEZMOI.md.
  // Hors ligne : les parties sont gardées sur le téléphone et envoyées au retour du réseau (file d'attente).
  // =====================================================================
  const CFG = window.FANION_CONFIG || window.APP_CONFIG || {};
  // Lignes de la base → objets de l'app (mêmes champs qu'avant)
  const rowGroupe = r => ({ ...(r.data || {}), id: r.id, owner: r.owner || '', organizers: r.organizers || [], ...(r.plan ? { plan: r.plan } : {}),
    ...(r.paid_until ? { paidUntil: Number(r.paid_until) } : {}), ...(r.max_joueurs ? { maxJoueurs: r.max_joueurs } : {}),
    nPlayers: r.n_players, archived: !!r.archived, deleted: !!r.deleted });
  const rowJoueur = r => ({ ...(r.data || {}), id: r.id, groupId: r.group_id, ...(r.acct ? { acct: r.acct } : {}), ...(r.auth_email ? { authEmail: r.auth_email } : {}) });
  const ok = ({ data, error }) => { if (error) throw Object.assign(new Error(error.message || 'Erreur de la base'), { code: error.code }); return data; };
  const Store = {
    mode: 'local', uid: null, sb: null, error: '',
    async init() {
      if (!CFG.supabaseUrl || !window.supabase || !window.HoldingAI) {
        this.error = !window.supabase ? 'Les outils de la base n’ont pas pu se charger (réseau ou bloqueur de contenu).' : 'Configuration manquante (config.js).';
      } else {
        try {
          this.sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { accessToken: async () => (await HoldingAI.jeton()) || null });
          this.mode = 'cloud';
          // Le compte suit : sans session, on passe chez Albert (compte.holdingai.app), qui ramène la personne connectée
          // Installation obligatoire sur téléphone : on ne passe chez Albert qu'une fois l'app installée (iPhone : l'app installée ne garde pas la connexion faite dans Safari)
          const dep = await HoldingAI.demarrer({ obligatoire: !window.FANION_INSTALL_REQUISE });
          if (dep.redirection) { this.redirecting = true; return; }
          if (dep.erreur) toast(dep.erreur.message);
          // Hors ligne sur le terrain avec un jeton expiré : on garde le compte connu (le jeton sera renouvelé au retour du réseau)
          if (!dep.session && navigator.onLine === false) { try { const j = JSON.parse(localStorage.getItem('hai.jetons') || 'null'), c = j && j.access && JSON.parse(decodeURIComponent(escape(atob(j.access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))))); if (c && c.sub) dep.session = { uid: c.sub, phone: c.phone || '', email: c.email || '', nom: (c.user_metadata || {}).nom || '' }; } catch (e) { } }
          if (dep.session) this.setUser(dep.session); else this.needLogin = true;
        } catch (e) { console.error(e); this.mode = 'local'; this.error = 'Base injoignable : ' + (e.message || e); toast('Base partagée injoignable : mode local.'); }
      }
      if (this.mode === 'local') {
        this.uid = ls.get('pelland.uid', null) || ('local-' + Math.random().toString(36).slice(2, 10));
        ls.set('pelland.uid', this.uid);
      }
      if (this.mode === 'cloud' && !this.needLogin) {
        // Compte relié à aucun joueur : on reste connecté, mais il faut un groupe (invitation ou nouveau groupe)
        const m = await this.ensureMember();
        if (m === false) { this.noGroup = true; this.needLogin = true; }
        if (this.flush) { this.flush(); window.addEventListener('online', () => this.flush()); }
      }
    },
    // ---------- Compte (HoldingAI) ----------
    phoneE164(phone) { let d = String(phone || '').replace(/\D/g, ''); if (d.length === 10) d = '1' + d; return d.length === 11 ? '+' + d : ''; },
    setUser(s) { this.uid = s ? s.uid : null; this.e164 = s ? this.phoneE164(s.phone) || null : null; this.email = s ? (s.email || this.e164 || s.uid) : null; this.nom = s ? s.nom || '' : ''; },
    async token() { return window.HoldingAI ? await HoldingAI.jeton() : null; },
    async ensureMember(player) {
      if (this.mode !== 'cloud' || !this.uid) return;
      try {
        if (player) { await this.linkTo(player); return true; }
        const inv = new URLSearchParams(location.search).get('joueur');
        const l = ok(await this.sb.from('liens').select('player_id, group_id').eq('uid', this.uid).maybeSingle());
        const mine = (!l || inv) ? await this.myPlayers() : [];
        // Invitation reçue (?joueur=…) : on se relie à ce joueur-là si c'est bien notre cellulaire
        const cible = inv && mine.find(p => p.id === inv);
        if (cible) { await this.linkTo(cible); return true; }
        if (l) {
          if (this.gid !== l.group_id) this.setGroup(l.group_id);
          // Nouvel appareil : on retrouve le nom de « mon » joueur (sert à savoir qui je suis dans le groupe)
          try { const j = ok(await this.sb.from('joueurs').select('data').eq('id', l.player_id).maybeSingle()); if (j && j.data && j.data.name) ls.set('pelland.me', j.data.name); } catch (e) { }
          return true;
        }
        if (mine.length) { await this.linkTo(mine[0]); return true; }
        return false;
      } catch (e) { console.warn('membre', e.message); return null; }
    },
    // Tous les joueurs (un par groupe) inscrits avec le cellulaire de ce compte
    async myPlayers() {
      if (this.mode !== 'cloud' || !this.e164) return [];
      const rows = ok(await this.sb.rpc('mes_groupes')) || [];
      this._mesGroupes = rows;
      return rows.map(r => ({ ...(r.joueur || {}), id: r.player_id, groupId: r.group_id, ...(r.acct ? { acct: r.acct } : {}) }));
    },
    async myGroupList() {
      if (this.mode !== 'cloud') { const gs = await this.listGroups(); return this.myGroups().map(x => ({ ...x, name: (gs.find(g => g.id === x.gid) || {}).name || x.name })); }
      const pl = await this.myPlayers(), rows = this._mesGroupes || [];
      return pl.map(p => { const r = rows.find(x => x.player_id === p.id) || {}, g = r.groupe || {};
        const orgs = r.organizers || [];
        return { gid: p.groupId, name: g.name || p.groupId, playerId: p.id, playerName: p.name, owner: r.owner === p.id, organizer: orgs.includes(p.id) || (r.owner === p.id && !orgs.length), archived: !!r.archived, deleted: !!r.deleted }; })
        .filter(x => !x.deleted).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    },
    // Archiver, rétablir ou supprimer le groupe actif (propriétaire seulement ; vérifié par la base)
    async setGroupState(flags) {
      if (this.mode === 'cloud') { ok(await this.sb.rpc('groupe_etat', { p_id: this.gid, p_archived: flags.archived == null ? null : !!flags.archived, p_deleted: flags.deleted == null ? null : !!flags.deleted })); return; }
      const all = ls.get('pelland.groups', {}); all[this.gid] = { ...(all[this.gid] || { id: this.gid }), ...flags }; ls.set('pelland.groups', all);
    },
    // Rend ce joueur (et son groupe) actif pour ce compte
    async linkTo(player) {
      let g = player.groupId || 'pelland';
      if (this.mode === 'cloud') {
        try { g = ok(await this.sb.rpc('relier_joueur', { p_joueur: player.id })) || g; }
        catch (e) { throw Object.assign(new Error('Votre cellulaire n’est pas celui inscrit pour ' + player.name + '. Demandez à l’organisateur de le vérifier dans Joueurs.'), { code: 'local/nolink' }); }
      }
      this.setGroup(g); if (player.name) ls.set('pelland.me', player.name);
    },
    async logout() { if (window.HoldingAI) HoldingAI.deconnexion(); ls.set('pelland.me', null); location.href = location.pathname; },
    // Ajoute ou change le cellulaire d'un joueur. Le joueur se connecte ensuite avec son compte HoldingAI (même cellulaire).
    async setPhone(player, phone) {
      const digits = String(phone || '').replace(/\D/g, '').replace(/^1(\d{10})$/, '$1');
      if (digits.length !== 10) throw new Error('Numéro de cellulaire invalide (10 chiffres).');
      if (this.mode !== 'cloud') { const list = ls.get('pelland.players', []); const x = list.find(q => q.id === player.id); if (x) { x.phoneHint = digits.slice(-2); x.phone = digits; } ls.set('pelland.players', list); return; }
      await this.savePhone(player.id, digits, true, player.groupId || this.gid);
      ok(await this.sb.rpc('joueur_maj', { p_id: player.id, p_patch: { phoneHint: digits.slice(-2) } }));
    },
    async savePhone(id, digits, strict, groupId) {
      const r = await this.sb.from('telephones').upsert({ player_id: id, group_id: groupId || this.gid, phone: digits, e164: this.phoneE164(digits) });
      if (r.error) { console.warn('telephones', r.error.message); this.phonesBlocked = true; if (strict) throw new Error(/duplicate|unique/i.test(r.error.message) ? 'Ce cellulaire est déjà inscrit.' : 'Numéro non conservé : ' + r.error.message); }
      else this.phonesBlocked = false;
    },
    // ---- Nouveaux terrains : proposés par les joueurs, approuvés par l'équipe Fanion (table admins) avant d'entrer dans la banque commune
    async isAdmin() {
      if (this.mode !== 'cloud') return !!ls.get('pelland.admin', false);
      try { return !!ok(await this.sb.from('admins').select('uid').eq('uid', this.uid).maybeSingle()); } catch (e) { return false; }
    },
    // ---- Parties : copie sur le téléphone + file d'attente (hors ligne sur le terrain), envoyées dès que possible
    // Temps réel : changements de la base (autres joueurs) + nos propres enregistrements (immédiats, même hors ligne)
    // Groupes : chaque groupe a ses joueurs, parties, dates et quatuors (les terrains sont communs). Pelland = premier groupe.
    get gid() { return ls.get('pelland.group', 'pelland') || 'pelland'; },
    setGroup(id) { ls.set('pelland.group', id || 'pelland'); },
    async listGroups() {
      let list = [];
      if (this.mode === 'cloud') { try { list = (ok(await this.sb.from('groupes').select('*')) || []).map(rowGroupe); } catch (e) { } }
      else list = Object.values(ls.get('pelland.groups', {}));
      if (!list.find(g => g.id === 'pelland') && this.mode !== 'cloud') list.push({ id: 'pelland', name: MARQUE.groupeDefaut });
      return list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'fr'));
    },
    async saveGroup(gr) {
      if (this.mode === 'cloud') {
        // forfait, compteur et état : gérés par la base (et par Fanion pour le forfait)
        const { id, owner, organizers, plan, paidUntil, maxJoueurs, nPlayers, lastAdd, lastDel, archived, deleted, ...rest } = gr;
        ok(await this.sb.rpc('groupe_maj', { p_id: id, p_patch: rest, p_owner: owner == null ? null : owner, p_organizers: organizers == null ? null : organizers }));
        return;
      }
      const all = ls.get('pelland.groups', {}); all[gr.id] = gr; ls.set('pelland.groups', all);
    },
    // Mes groupes (sur ce téléphone) : un joueur peut faire partie de plusieurs groupes
    myGroups() { return ls.get('pelland.mygroups', []); },
    rememberGroup(gid, name, playerId, playerName, owner) {
      if (!gid || !playerId) return;
      const all = this.myGroups(), old = all.find(x => x.gid === gid) || {}, l = all.filter(x => x.gid !== gid);
      l.unshift({ gid, name: name || old.name || gid, playerId, playerName: playerName || '', owner: !!(owner || old.owner) });
      ls.set('pelland.mygroups', l.slice(0, 12));
    },
    async switchGroup(entry) {
      if (this.mode !== 'cloud') { ls.set('pelland.me', entry.playerName || ls.get('pelland.me', '')); this.setGroup(entry.gid); return; }
      await this.linkTo({ id: entry.playerId, name: entry.playerName, groupId: entry.gid });
    },
    // Parrainage : ?ref=<code> (un groupe ou un centre) est gardé 90 jours sur ce téléphone, puis noté sur le groupe créé
    refCode() { const r = ls.get('pelland.ref', null); return r && r.until > Date.now() ? r.code : ''; },
    // Le groupe gratuit que ce compte possède déjà (non supprimé, sans forfait Groupe en cours), ou null
    async groupeGratuit() {
      if (this.mode !== 'cloud') return null;
      try {
        await this.myPlayers();
        const r = (this._mesGroupes || []).find(x => x.owner === x.player_id && !x.deleted && !planOf({ plan: x.plan, paidUntil: x.paid_until, maxJoueurs: x.max_joueurs }).paid);
        return r ? { id: r.group_id, name: (r.groupe || {}).name || r.group_id } : null;
      } catch (e) { return null; }
    },
    // Nouveau groupe, créé par la personne connectée (son compte HoldingAI a son cellulaire confirmé)
    async createGroup(groupName, name, ref) {
      if (!String(groupName || '').trim()) throw new Error('Donnez un nom au groupe.');
      if (!String(name || '').trim()) throw new Error('Entrez votre prénom et nom.');
      const pid = slug(name) + '-' + Math.random().toString(36).slice(2, 6);
      const gr = { id: slug(groupName) + '-' + Math.random().toString(36).slice(2, 6), name: groupName.trim(), owner: pid, createdAt: Date.now(), nPlayers: 1 };
      const rc = String(ref || this.refCode() || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 60); if (rc) gr.ref = rc;
      if (this.mode === 'cloud') {
        if (!this.uid || !this.e164) throw new Error('Votre compte L’Établi doit avoir un cellulaire confirmé. Ouvrez « Mon compte » chez Albert.');
        // Forfait Gratuit : un seul groupe gratuit par compte (vérifié par la base)
        const gratuit = await this.groupeGratuit();
        if (gratuit) throw Object.assign(new Error(`Avec le forfait Gratuit, vous avez droit à un groupe de 4 joueurs : vous avez déjà « ${gratuit.name} ». Passez ce groupe au forfait Groupe pour en créer un autre.`), { code: 'local/gratuit' });
        try { await this.sb.from('gratuits').delete().eq('uid', this.uid); } catch (e) { }
        const { id, owner, nPlayers, ...gdata } = gr;
        ok(await this.sb.rpc('creer_groupe', { p_groupe: gr.id, p_joueur: pid, p_donnees_groupe: gdata,
          p_donnees_joueur: { id: pid, name: name.trim(), phoneHint: this.e164.slice(-2), updatedAt: Date.now() } }));
      } else { await this.saveGroup(gr); const list = ls.get('pelland.players', []); list.push({ id: pid, name: name.trim(), groupId: gr.id, authEmail: 'local', acct: 'local' }); ls.set('pelland.players', list); }
      this.setGroup(gr.id); this.needLogin = false; this.noGroup = false; ls.set('pelland.me', name.trim());
      if (this.ensureSeed) await this.ensureSeed();
      return gr;
    },
    // Membres du groupe (par défaut) ; avec bank = true, toute la banque de joueurs du groupe (membres et non-membres)
    async listPlayers(all, bank) {
      const mine = p => (all || (p.groupId || 'pelland') === this.gid) && (bank || all || p.membre !== false);
      if (this.mode === 'cloud') {
        let q = this.sb.from('joueurs').select('id, group_id, acct, auth_email, data'); if (!all) q = q.eq('group_id', this.gid);
        const list = (ok(await q) || []).map(rowJoueur).filter(mine);
        try { const ph = ok(await this.sb.from('telephones').select('player_id, phone').eq('group_id', this.gid)) || []; const m = {}; ph.forEach(x => { m[x.player_id] = x.phone; }); list.forEach(p => { if (m[p.id]) p.phone = m[p.id]; }); this.phonesBlocked = false; } catch (e) { this.phonesBlocked = true; }
        return list.sort(byName);
      }
      return ls.get('pelland.players', []).filter(mine).sort(byName);
    },
    // Données privées du groupe (quatuors, jeux maison, terrains et joueurs retirés) : table donnees_groupe
    async gdata() {
      try { const r = ok(await this.sb.from('donnees_groupe').select('data').eq('group_id', this.gid).maybeSingle()); return r ? r.data : null; } catch (e) { return null; }
    },
    async setGdata(field, list) { ok(await this.sb.rpc('donnees_maj', { p_group: this.gid, p_patch: { groupId: this.gid, [field]: list, updatedAt: Date.now() } })); },
    // Demandes d'ajout de jeux : table demandes (envoi seulement ; lues par l'équipe Fanion)
    // Jeux maison du groupe
    // Offres de parties : { id, groupId, course, dates:[ms], deadline:ms, by, createdAt, rep_<joueur>: { name, dates:[ms], at } }
    async listOffres() {
      if (this.mode === 'cloud') {
        try { return (ok(await this.sb.from('offres').select('id, data').eq('group_id', this.gid)) || []).map(r => ({ ...(r.data || {}), id: r.id })).sort((a, b) => b.createdAt - a.createdAt); } catch (e) { return []; }
      }
      return Object.values(ls.get('pelland.offres', {})).filter(o => (o.groupId || 'pelland') === this.gid).sort((a, b) => b.createdAt - a.createdAt);
    },
    async getOffre(id) {
      if (this.mode === 'cloud') { try { const r = ok(await this.sb.from('offres').select('id, group_id, data').eq('id', id).maybeSingle()); return r ? { ...(r.data || {}), id: r.id, groupId: r.group_id } : null; } catch (e) { return null; } }
      return ls.get('pelland.offres', {})[id] || null;
    },
    async saveOffre(o, merge) {
      if (this.mode === 'cloud') { const g = o.groupId || this.gid; ok(await this.sb.rpc('offre_maj', { p_id: o.id, p_group: g, p_patch: { ...o, groupId: g } })); return; }
      const all = ls.get('pelland.offres', {}); all[o.id] = merge ? { ...(all[o.id] || {}), ...o } : o; ls.set('pelland.offres', all);
    },
    async deleteOffre(id) {
      if (this.mode === 'cloud') { ok(await this.sb.from('offres').delete().eq('id', id)); return; }
      const all = ls.get('pelland.offres', {}); delete all[id]; ls.set('pelland.offres', all);
    },
    async listBank() { return this.listPlayers(false, true); },
    // Membre du groupe ou seulement dans la banque (choisi par l'organisateur parmi les joueurs confirmés)
    async setMembre(id, on) {
      if (this.mode === 'cloud') { ok(await this.sb.rpc('joueur_maj', { p_id: id, p_patch: { membre: !!on, updatedAt: Date.now() } })); return; }
      ls.set('pelland.players', ls.get('pelland.players', []).map(x => x.id === id ? { ...x, membre: !!on } : x));
    },
    // Ajout à la banque de joueurs (le compteur du groupe est tenu par la base : 64 au plus)
    async savePlayer(name, count, membre = false) {
      const p = { id: slug(name) + '-' + Math.random().toString(36).slice(2, 6), name: name.trim(), groupId: this.gid, membre: !!membre, updatedAt: Date.now() };
      if (this.mode === 'cloud') {
        const r = await this.sb.from('joueurs').insert({ id: p.id, group_id: this.gid, data: p });
        if (r.error) throw /64|maximum/i.test(r.error.message) ? new Error('La banque du groupe est pleine (64 joueurs).') : /row-level|violates/i.test(r.error.message) ? new Error('Seul le propriétaire du groupe ajoute des joueurs.') : new Error(r.error.message);
        return p;
      }
      const list = ls.get('pelland.players', []); list.push(p); ls.set('pelland.players', list); return p;
    },
    async renamePlayer(id, name) {
      if (this.mode === 'cloud') { ok(await this.sb.rpc('joueur_maj', { p_id: id, p_patch: { name: name.trim(), updatedAt: Date.now() } })); return; }
      ls.set('pelland.players', ls.get('pelland.players', []).map(x => x.id === id ? { ...x, name: name.trim() } : x));
    },
    // Joueurs retirés du groupe : gardés dans la banque (nom, cellulaire) pour les remettre en un geste
    async retiredPlayers() {
      if (this.mode === 'cloud') { const g = await this.gdata(); return (g && g.joueursRetires) || []; }
      return ls.get('pelland.joueursRetires', []);
    },
    async setRetiredPlayers(list) {
      if (this.mode === 'cloud') return this.setGdata('joueursRetires', list);
      ls.set('pelland.joueursRetires', list);
    },
    async keepInBank(p) {
      if (!p) return;
      let phone = p.phone || '';
      if (!phone && this.mode === 'cloud') { try { const r = ok(await this.sb.from('telephones').select('phone').eq('player_id', p.id).maybeSingle()); if (r) phone = r.phone || ''; } catch (e) { } }
      const l = (await this.retiredPlayers()).filter(x => x.name.toLowerCase() !== p.name.toLowerCase());
      l.unshift({ name: p.name, phone, retireLe: Date.now() });
      // Banque de joueurs : 64 au plus (joueurs du groupe + retirés) ; au-delà, les plus anciens retirés sont oubliés
      await this.setRetiredPlayers(l.slice(0, Math.max(0, BANQUE_MAX - (S.players || []).length + 1)));
    },
    async deletePlayer(id) {
      if (this.mode === 'cloud') {
        const r = ok(await this.sb.from('joueurs').delete().eq('id', id).select('id'));
        if (!r || !r.length) throw new Error('Seul le propriétaire du groupe retire des joueurs.');
        return;
      }
      ls.set('pelland.players', ls.get('pelland.players', []).filter(x => x.id !== id));
    },
    _subs: {},
    _emit(g) { (this._subs[g.id] || []).forEach(cb => cb(g)); },
    watch(table, col, id, cb) {
      const ch = this.sb.channel(table + ':' + id + ':' + Math.random().toString(36).slice(2, 7))
        .on('postgres_changes', { event: '*', schema: 'public', table, filter: col + '=eq.' + id }, p => { if (p.new && Object.keys(p.new).length) cb(p.new); })
        .subscribe();
      return () => { try { this.sb.removeChannel(ch); } catch (e) { } };
    },
    // Présences : { cléJoueur: { ok: true|false, at } } par partie ; chaque membre écrit sa propre réponse
    watchPresence(id, cb) {
      if (this.mode === 'cloud') {
        this.sb.from('presences').select('data').eq('game_id', id).maybeSingle().then(r => cb(r.error ? null : (r.data ? r.data.data : {})));
        return this.watch('presences', 'game_id', id, r => cb(r.data || {}));
      }
      const read = () => cb(ls.get('pelland.presence', {})[id] || {}); read();
      const on = e => { if (e.key === 'pelland.presence') read(); }; window.addEventListener('storage', on);
      this._presSubs = (this._presSubs || []).concat([[id, read]]);
      return () => { window.removeEventListener('storage', on); this._presSubs = (this._presSubs || []).filter(x => x[1] !== read); };
    },
    async setPresence(id, key, yes) {
      const v = { ok: yes, at: Date.now() };
      if (this.mode === 'cloud') { ok(await this.sb.rpc('presence_maj', { p_partie: id, p_cle: key, p_valeur: v })); return; }
      const all = ls.get('pelland.presence', {}); all[id] = { ...(all[id] || {}), [key]: v }; ls.set('pelland.presence', all);
      (this._presSubs || []).forEach(([gid, f]) => { if (gid === id) f(); });
    },
    async listPresence(ids) {
      if (this.mode === 'cloud') { const m = {}; if (!(ids || []).length) return m; try { (ok(await this.sb.from('presences').select('game_id, data').in('game_id', ids)) || []).forEach(r => { m[r.game_id] = r.data; }); } catch (e) { } return m; }
      return ls.get('pelland.presence', {});
    },
    // Avis des joueurs : un par compte ; publié seulement si approuvé par l'équipe Fanion
    async getAvis() {
      if (this.mode !== 'cloud' || !this.uid) return ls.get('fanion.avis', null);
      try { const r = ok(await this.sb.from('avis').select('*').eq('uid', this.uid).maybeSingle()); return r ? { stars: r.stars, text: r.text, name: r.name, groupName: r.group_name, ok: r.ok, at: Number(r.at) } : null; } catch (e) { return null; }
    },
    async saveAvis(a) {
      if (this.mode !== 'cloud' || !this.uid) { ls.set('fanion.avis', a); return; }
      ok(await this.sb.from('avis').upsert({ uid: this.uid, stars: a.stars, text: String(a.text || '').slice(0, 280), name: String(a.name || '').slice(0, 40), group_name: String(a.groupName || '').slice(0, 60), ok: !!a.ok, at: a.at || Date.now() }));
    },
    // Compétitions : { groupId, format, name, date, course, tee, allowance, flights, teams:[…], scores:{ <équipe>: { <trou>: [s1, s2] } } }
    // Un score à la fois, fusionné, pour que deux équipes puissent entrer leurs scores en même temps
    // Remplace un champ entier (ex. tableau.manual)
    // Notifications : un abonnement par compte et par groupe (abonnements_push)
    async savePushSub(g, playerId, js, etat) {
      ok(await this.sb.from('abonnements_push').upsert({ id: this.uid + '_' + g, uid: this.uid, group_id: g, player_id: playerId, sub: js ? JSON.parse(js) : null, etat, at: Date.now() }));
    },
    async deletePushSub(g) { await this.sb.from('abonnements_push').delete().eq('id', this.uid + '_' + g); },
    async listPushSubs() { return (ok(await this.sb.from('abonnements_push').select('player_id, sub, etat, at').eq('group_id', this.gid)) || []).map(r => ({ playerId: r.player_id, sub: r.sub, etat: r.etat, at: Number(r.at || 0) })); }
  };
  // Approbateur des terrains (compte) et taille maximale de la banque de joueurs
  const P = { admin: false, mine: [], todo: [], charge: false };
  const BANQUE_MAX = 64;
  const presKey = name => L.norm(name).replace(/[^a-z0-9]+/g, '-');
  function slug(s) { return L.norm(s).replace(/\s+/g, '-').slice(0, 30) || 'terrain'; }
  const byName = (a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
  // Doublons possibles : même nom à une lettre ou deux près (accents, fautes), ou même nom de famille et même initiale.
  function duplicateMap(list) {
    const L2 = window.PellandLogic, n = list.map(p => L2.norm(p.name)), out = {};
    const lev = (a, b) => { const m = a.length, k = b.length; let pr = Array.from({ length: k + 1 }, (_, j) => j); for (let i = 1; i <= m; i++) { const c = [i]; for (let j = 1; j <= k; j++) c[j] = Math.min(pr[j] + 1, c[j - 1] + 1, pr[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); pr = c; } return pr[k]; };
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = n[i], b = n[j], wa = a.split(' '), wb = b.split(' ');
      const similar = lev(a, b) <= 2 || (wa.length > 1 && wb.length > 1 && wa[wa.length - 1] === wb[wb.length - 1] && wa[0][0] === wb[0][0]) || (wa.length === 1 || wb.length === 1) && (wa[0] === wb[0]);
      if (similar) { (out[list[i].id] = out[list[i].id] || []).push(list[j].name); (out[list[j].id] = out[list[j].id] || []).push(list[i].name); }
    }
    return out;
  }

  // =====================================================================
  // Voix : reconnaissance (Safari iOS) et synthèse