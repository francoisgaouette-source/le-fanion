  // Base de données : ce qui est propre au golf (terrains, parties, quatuors, jeux, compétitions)
  Object.assign(Store, {
    async ensureSeed() { return this.listCourses(); },
    async listCourses() {
      let list;
      if (this.mode === 'cloud') list = (ok(await this.sb.from('terrains').select('id, data')) || []).map(r => ({ ...(r.data || {}), id: r.id }));
      else list = ls.get('pelland.courses', []);
      // Terrains retirés de la banque de ce groupe (les autres groupes les gardent)
      const out = await this.retiredCourses();
      this.retired = list.filter(c => out.includes(c.id)).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
      return list.filter(c => !out.includes(c.id)).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    },
    async retiredCourses() {
      if (this.mode === 'cloud') { const g = await this.gdata(); return (g && g.terrainsRetires) || []; }
      return ls.get('pelland.terrainsRetires.' + this.gid, []);
    },
    async setCourseRetired(id, out) {
      const cur = await this.retiredCourses(), next = out ? [...new Set([...cur, id])] : cur.filter(x => x !== id);
      if (this.mode === 'cloud') await this.setGdata('terrainsRetires', next); else ls.set('pelland.terrainsRetires.' + this.gid, next);
    },
    async proposeCourse(course, meta) {
      const p = { course: JSON.parse(JSON.stringify(course)), statut: 'propose', groupe: this.gid, cree: Date.now(), ...meta, proposeUid: this.uid || '' };
      if (this.mode === 'cloud') { const r = ok(await this.sb.from('terrains_proposes').insert({ groupe: this.gid, propose_uid: this.uid, statut: 'propose', data: p }).select('id').single()); return { ...p, id: r.id }; }
      const l = ls.get('pelland.terrainsProposes', []); p.id = 'p' + Date.now(); l.push(p); ls.set('pelland.terrainsProposes', l); return p;
    },
    async listProposals(admin) {
      if (this.mode !== 'cloud') { const l = ls.get('pelland.terrainsProposes', []); return { mine: l.filter(p => p.groupe === this.gid), todo: admin ? l.filter(p => p.statut === 'propose') : [] }; }
      const map = q => q.then(r => (ok(r) || []).map(x => ({ ...(x.data || {}), id: x.id, statut: x.statut, groupe: x.groupe }))).catch(() => []);
      const cols = 'id, groupe, statut, data';
      const [mine, todo] = await Promise.all([map(this.sb.from('terrains_proposes').select(cols).eq('groupe', this.gid)), admin ? map(this.sb.from('terrains_proposes').select(cols).eq('statut', 'propose')) : []]);
      return { mine, todo };
    },
    async withdrawProposal(id) {
      if (this.mode === 'cloud') { ok(await this.sb.from('terrains_proposes').delete().eq('id', id)); return; }
      ls.set('pelland.terrainsProposes', ls.get('pelland.terrainsProposes', []).filter(p => p.id !== id));
    },
    async decideProposal(id, yes, course, photos) {
      const ch = { statut: yes ? 'approuve' : 'refuse', decideLe: Date.now(), decideUid: this.uid || '' };
      if (yes) {
        const c = await this.saveCourse({ ...course, verifieLe: Date.now(), ...(photos && photos.length ? { photosCarte: photos.length } : {}) }); ch.courseId = c.id;
        // Photos de la carte gardées à part (lues seulement quand on ouvre le terrain)
        if (photos && photos.length) { if (this.mode === 'cloud') ok(await this.sb.from('cartes_terrains').upsert({ course_id: c.id, photos, cree: Date.now() })); else ls.set('pelland.carte.' + c.id, photos); }
      }
      if (this.mode === 'cloud') {
        const cur = ok(await this.sb.from('terrains_proposes').select('data').eq('id', id).maybeSingle());
        ok(await this.sb.from('terrains_proposes').update({ statut: ch.statut, data: { ...((cur && cur.data) || {}), ...ch } }).eq('id', id)); return;
      }
      ls.set('pelland.terrainsProposes', ls.get('pelland.terrainsProposes', []).map(p => p.id === id ? { ...p, ...ch } : p));
    },
    async cartePhotos(courseId) {
      if (this.mode !== 'cloud') return ls.get('pelland.carte.' + courseId, []);
      try { const r = ok(await this.sb.from('cartes_terrains').select('photos').eq('course_id', courseId).maybeSingle()); return (r && r.photos) || []; } catch (e) { return []; }
    },
    async saveCourse(c) {
      c = JSON.parse(JSON.stringify(c));
      if (!c.id) c.id = slug(c.name) + '-' + Math.random().toString(36).slice(2, 6);
      c.updatedAt = Date.now();
      if (this.mode === 'cloud') {
        const u = ok(await this.sb.from('terrains').update({ data: c }).eq('id', c.id).select('id'));
        if (!u || !u.length) ok(await this.sb.from('terrains').insert({ id: c.id, data: c }));
        return c;
      }
      const list = ls.get('pelland.courses', []).filter(x => x.id !== c.id); list.push(c); ls.set('pelland.courses', list); return c;
    },
    async newCode() {
      const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
      for (let n = 0; n < 20; n++) {
        const code = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join('');
        let used = null; try { used = await this.getGame(code); } catch (e) { return code; }
        if (!used) return code;
      }
      return 'P' + Date.now().toString(36).toUpperCase().slice(-5);
    },
    cacheGame(g) { const all = ls.get('fanion.parties', {}); all[g.id] = g; const ids = Object.keys(all); if (ids.length > 40) ids.sort((a, b) => (all[a].updatedAt || 0) - (all[b].updatedAt || 0)).slice(0, ids.length - 40).forEach(k => delete all[k]); ls.set('fanion.parties', all); },
    cachedGame(id) { return ls.get('fanion.parties', {})[id] || null; },
    async getGame(id) {
      if (this.mode === 'cloud') {
        try { const r = ok(await this.sb.from('parties').select('data').eq('id', id).maybeSingle()); if (r) { const g = fromDb(r.data); return this.pending(id) || g; } return this.pending(id) || null; }
        catch (e) { const c = this.cachedGame(id); if (c) return c; throw e; }
      }
      return ls.get('pelland.games', {})[id] || null;
    },
    pending(id) { const q = ls.get('fanion.file', {}); return q[id] ? q[id] : null; },
    async saveGame(g) {
      g.updatedAt = Date.now(); if (!g.groupId) g.groupId = this.gid;
      if (this.mode === 'cloud') {
        if (!g.ownerUid) g.ownerUid = this.uid;
        this.cacheGame(g);
        const q = ls.get('fanion.file', {}); q[g.id] = g; ls.set('fanion.file', q);
        this._emit(g);
        // hors ligne : la partie reste dans la file et part au retour du réseau ; on n'attend pas plus de 5 s
        const p = this.flush(); await Promise.race([p, new Promise(r => setTimeout(r, navigator.onLine ? 5000 : 0))]); return;
      }
      const all = ls.get('pelland.games', {}); all[g.id] = g; ls.set('pelland.games', all);
      this._emit(g);
    },
    async flush() {
      if (this.mode !== 'cloud' || this._flushing || navigator.onLine === false) return;
      this._flushing = true;
      try {
        const q = ls.get('fanion.file', {});
        for (const id of Object.keys(q)) {
          const g = q[id];
          const r = await this.sb.rpc('partie_enregistrer', { p_id: g.id, p_group: g.groupId, p_owner: g.ownerUid || '', p_data: toDb(g) });
          const now = ls.get('fanion.file', {});
          if (!r.error || /appartient|row-level|violates/i.test(r.error.message || '')) {
            if (now[id] && now[id].updatedAt === g.updatedAt) { delete now[id]; ls.set('fanion.file', now); }
            if (r.error) toast('Non enregistré : ' + r.error.message);
          } else if (!/fetch|network|Failed/i.test(r.error.message || '')) { toast('Non enregistré : ' + r.error.message); delete now[id]; ls.set('fanion.file', now); }
          else break;
        }
      } catch (e) { /* réseau : on réessaiera */ } finally { this._flushing = false; }
    },
    watchGame(id, cb) {
      (this._subs[id] = this._subs[id] || []).push(cb);
      if (this.mode === 'cloud') {
        const c = this.cachedGame(id); if (c) cb(c);
        this.getGame(id).then(g => g && cb(g)).catch(e => toast('Lecture impossible : ' + e.message));
        const off = this.watch('parties', 'id', id, r => { if (!this.pending(id)) { const g = fromDb(r.data); this.cacheGame(g); cb(g); } });
        return () => { off(); this._subs[id] = (this._subs[id] || []).filter(x => x !== cb); };
      }
      this.getGame(id).then(g => g && cb(g));
      const onStorage = e => { if (e.key === 'pelland.games') this.getGame(id).then(g => g && cb(g)); };
      window.addEventListener('storage', onStorage);
      return () => { this._subs[id] = (this._subs[id] || []).filter(x => x !== cb); window.removeEventListener('storage', onStorage); };
    },
    async listQuatuors() {
      if (this.mode === 'cloud') { const g = await this.gdata(); return (g && g.quatuors) || []; }
      return ls.get('pelland.quatuors.' + this.gid, this.gid === 'pelland' ? ls.get('pelland.quatuors', []) : []);
    },
    async saveQuatuors(list) {
      if (this.mode === 'cloud') { await this.setGdata('quatuors', list); return; }
      ls.set('pelland.quatuors.' + this.gid, list);
    },
    async saveGameRequest(req) {
      if (this.mode === 'cloud') { ok(await this.sb.from('demandes').insert({ data: req })); return; }
      ls.set('pelland.demandesJeux', ls.get('pelland.demandesJeux', []).concat([req]));
    },
    async listJeux() {
      if (this.mode === 'cloud') { const g = await this.gdata(); return (g && g.jeux) || []; }
      return ls.get('pelland.jeux.' + this.gid, []);
    },
    async saveJeux(list) {
      if (this.mode === 'cloud') { await this.setGdata('jeux', list); return; }
      ls.set('pelland.jeux.' + this.gid, list);
    },
    async deleteGame(id) {
      if (this.mode === 'cloud') { const q = ls.get('fanion.file', {}); delete q[id]; ls.set('fanion.file', q); ok(await this.sb.from('parties').delete().eq('id', id)); return; }
      const all = ls.get('pelland.games', {}); delete all[id]; ls.set('pelland.games', all);
    },
    async listComps() {
      if (this.mode === 'cloud') { try { return (ok(await this.sb.from('competitions').select('id, data, scores').eq('group_id', this.gid)) || []).map(r => ({ ...(r.data || {}), id: r.id, scores: r.scores || {} })).sort((a, b) => (b.date || '').localeCompare(a.date || '')); } catch (e) { return []; } }
      return Object.values(ls.get('pelland.comps', {})).filter(c => c.groupId === this.gid).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    },
    async saveComp(c) {
      if (this.mode === 'cloud') { const { scores, ...rest } = c; ok(await this.sb.rpc('comp_fusion', { p_id: c.id, p_group: c.groupId || this.gid, p_patch: JSON.parse(JSON.stringify(rest)) })); return; }
      const all = ls.get('pelland.comps', {}); all[c.id] = { ...(all[c.id] || {}), ...c }; ls.set('pelland.comps', all);
    },
    async setCompScore(id, tid, h, arr) {
      if (this.mode === 'cloud') { ok(await this.sb.rpc('comp_score', { p_comp: id, p_equipe: String(tid), p_trou: String(h), p_valeur: arr })); return; }
      const all = ls.get('pelland.comps', {}); const c = all[id]; if (!c) return; c.scores = c.scores || {}; c.scores[tid] = c.scores[tid] || {}; c.scores[tid][h] = arr; ls.set('pelland.comps', all);
    },
    async setCompField(id, path, value) {
      if (this.mode === 'cloud') { ok(await this.sb.rpc('comp_maj', { p_comp: id, p_chemin: path.split('.'), p_valeur: value === undefined ? null : value })); return; }
      const all = ls.get('pelland.comps', {}); const c = all[id]; if (!c) return; const ks = path.split('.'); let o = c; ks.slice(0, -1).forEach(k => { o[k] = o[k] || {}; o = o[k]; }); o[ks[ks.length - 1]] = value; ls.set('pelland.comps', all);
    },
    async deleteComp(id) {
      if (this.mode === 'cloud') { ok(await this.sb.from('competitions').delete().eq('id', id)); return; }
      const all = ls.get('pelland.comps', {}); delete all[id]; ls.set('pelland.comps', all);
    },
    watchComp(id, cb) {
      if (this.mode === 'cloud') {
        const get = () => this.sb.from('competitions').select('id, data, scores').eq('id', id).maybeSingle().then(r => { if (r.data) cb({ ...(r.data.data || {}), id: r.data.id, scores: r.data.scores || {} }); });
        get();
        return this.watch('competitions', 'id', id, r => cb({ ...(r.data || {}), id: r.id, scores: r.scores || {} }));
      }
      const get = () => { const c = ls.get('pelland.comps', {})[id]; if (c) cb(c); };
      get(); const on = e => { if (e.key === 'pelland.comps') get(); }; window.addEventListener('storage', on);
      return () => window.removeEventListener('storage', on);
    },
    async listGames() {
      if (this.mode === 'cloud') {
        let list = [];
        try { list = (ok(await this.sb.from('parties').select('data').eq('group_id', this.gid).order('updated_at', { ascending: false }).limit(200)) || []).map(r => fromDb(r.data)); }
        catch (e) { list = Object.values(ls.get('fanion.parties', {})).filter(g => g.groupId === this.gid); }
        const q = ls.get('fanion.file', {}); Object.values(q).filter(g => g.groupId === this.gid).forEach(g => { list = list.filter(x => x.id !== g.id).concat([g]); });
        return list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 200);
      }
      return Object.values(ls.get('pelland.games', {})).filter(g => (g.groupId || 'pelland') === this.gid).sort((a, b) => b.createdAt - a.createdAt);
    },
  });
  // Les parties gardent les équipes sous la forme { e1: [...], e2: [...] } (comme avant).
  function toDb(g) {
    const o = JSON.parse(JSON.stringify(g));
    if (Array.isArray(o.teams)) o.teams = { e1: o.teams[0], e2: o.teams[1] };
    return o;
  }
  function fromDb(o) {
    if (o && o.teams && !Array.isArray(o.teams)) o.teams = [o.teams.e1, o.teams.e2];
    return o;
  }
