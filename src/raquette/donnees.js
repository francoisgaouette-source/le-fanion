  // =====================================================================
  // Base de données du module raquette
  //  - lieux du groupe (nom, adresse, terrains) : données privées du groupe (donnees_groupe.lieux)
  //  - soirées : une ligne de la table parties par soirée (data.type = 'soiree'), suivie en direct
  //  - réponses (« je viens ») et pointages : la table presences de la soirée, une clé par joueur ou par match,
  //    écrite par chacun sans écraser les autres (presence_maj)
  // =====================================================================
  Object.assign(Store, {
    async listLieux() {
      if (this.mode === 'cloud') { const g = await this.gdata(); return (g && g.lieux) || []; }
      return ls.get('raquette.lieux.' + this.gid, []);
    },
    async saveLieux(list) {
      if (this.mode === 'cloud') { await this.setGdata('lieux', list); return; }
      ls.set('raquette.lieux.' + this.gid, list);
    },
    async listSoirees() {
      let list;
      if (this.mode === 'cloud') list = (ok(await this.sb.from('parties').select('data').eq('group_id', this.gid).order('updated_at', { ascending: false }).limit(100)) || []).map(r => r.data);
      else list = Object.values(ls.get('raquette.soirees', {})).filter(s => s.groupId === this.gid);
      return list.filter(s => s && s.type === 'soiree').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
    async saveSoiree(s) {
      s = JSON.parse(JSON.stringify(s)); s.type = 'soiree'; s.updatedAt = Date.now(); if (!s.groupId) s.groupId = this.gid;
      if (this.mode === 'cloud') {
        if (!s.ownerUid) s.ownerUid = this.uid || '';
        ok(await this.sb.from('parties').upsert({ id: s.id, group_id: s.groupId, owner_uid: s.ownerUid, data: s, updated_at: new Date().toISOString() }));
      } else { const all = ls.get('raquette.soirees', {}); all[s.id] = s; ls.set('raquette.soirees', all); }
      (this._soireeSubs || []).forEach(([id, f]) => { if (id === s.id) f(s); });
      return s;
    },
    async deleteSoiree(id) {
      if (this.mode === 'cloud') { ok(await this.sb.from('parties').delete().eq('id', id)); return; }
      const all = ls.get('raquette.soirees', {}); delete all[id]; ls.set('raquette.soirees', all);
    },
    watchSoiree(id, cb) {
      const sub = [id, cb]; this._soireeSubs = (this._soireeSubs || []).concat([sub]);
      const fin = () => { this._soireeSubs = (this._soireeSubs || []).filter(x => x !== sub); };
      if (this.mode === 'cloud') {
        this.sb.from('parties').select('data').eq('id', id).maybeSingle().then(r => { if (!r.error && r.data) cb(r.data.data); });
        const off = this.watch('parties', 'id', id, r => cb(r.data));
        return () => { off(); fin(); };
      }
      cb((ls.get('raquette.soirees', {}))[id] || null);
      const on = e => { if (e.key === 'raquette.soirees') cb((ls.get('raquette.soirees', {}))[id] || null); };
      window.addEventListener('storage', on);
      return () => { window.removeEventListener('storage', on); fin(); };
    },
    // Une valeur de la soirée (réponse d'un joueur, pointage d'un match) : lue avec watchPresence
    async setValeur(id, key, v) {
      if (this.mode === 'cloud') { ok(await this.sb.rpc('presence_maj', { p_partie: id, p_cle: key, p_valeur: v })); return; }
      const all = ls.get('pelland.presence', {}); all[id] = { ...(all[id] || {}), [key]: v }; ls.set('pelland.presence', all);
      (this._presSubs || []).forEach(([gid, f]) => { if (gid === id) f(); });
    },
  });
