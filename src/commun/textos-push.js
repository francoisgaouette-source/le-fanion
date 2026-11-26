  const SMS_API = 'https://fanion.ai/api/sms';
  // =====================================================================
  // Notifications de l'app (Web Push) : gratuites, envoyées par le serveur Fanion aux membres abonnés du groupe
  // =====================================================================
  const PUSH_API = 'https://fanion.ai/api/push', PUSH_KEY = 'BOTntJP973w0RiGfVtYr4Lh2Edy0_GwQeqtkp4tLXHez-BEiVKdv0DiBHlKY-0WgPi6zOGeKhdbbBmrH6s_JXzU';
  const Push = {
    supported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; },
    // iPhone : les notifications n'existent que pour l'app ajoutée à l'écran d'accueil
    needsInstall() { return /iPhone|iPad|iPod/.test(navigator.userAgent) && !(navigator.standalone || (matchMedia && matchMedia('(display-mode: standalone)').matches)); },
    perm() { return 'Notification' in window ? Notification.permission : 'unsupported'; },
    async sub() { try { const r = await navigator.serviceWorker.ready; return await r.pushManager.getSubscription(); } catch (e) { return null; } },
    key() { const s = PUSH_KEY.replace(/-/g, '+').replace(/_/g, '/'); const b = atob(s + '==='.slice((s.length + 3) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); },
    // Abonnement du téléphone avec la clé actuelle (un ancien abonnement fait avec une autre clé est refait)
    async abonner(reg) {
      let sub = await reg.pushManager.getSubscription();
      if (sub) {
        try { const k = sub.options && sub.options.applicationServerKey; const a = k ? new Uint8Array(k) : null, b = this.key(); if (!a || a.length !== b.length || a.some((x, i) => x !== b[i])) { await sub.unsubscribe(); sub = null; } } catch (e) { }
      }
      return sub || reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.key() });
    },
    // Abonne ce téléphone ; un document par groupe du compte (subs/<uid>_<groupe>)
    async enable() {
      if (!this.supported()) throw new Error(this.needsInstall() ? 'Ajoutez d’abord l’app à votre écran d’accueil.' : 'Ce navigateur ne reçoit pas les notifications.');
      const p = await Notification.requestPermission();
      if (p !== 'granted') throw new Error('Notifications refusées. Vous pouvez les permettre dans les réglages du téléphone.');
      const reg = await navigator.serviceWorker.ready;
      const sub = await this.abonner(reg);
      await this.save(sub);
      ls.set('pelland.push', 1);
    },
    async save(sub) {
      if (Store.mode !== 'cloud' || !Store.uid) return;
      let mine = []; try { mine = await Store.myPlayers(); } catch (e) { }
      if (!mine.length && meId()) mine = [{ id: meId(), groupId: Store.gid }];
      const js = sub ? JSON.stringify(sub) : '';
      // Groupes quittés : leur abonnement est retiré (on ne reçoit plus rien d'un groupe dont on n'est plus membre)
      const avant = ls.get('pelland.push.groupes', []), maintenant = mine.map(p => p.groupId || 'pelland');
      for (const g of avant.filter(g => !maintenant.includes(g))) { try { await Store.deletePushSub(g); } catch (e) { } }
      ls.set('pelland.push.groupes', maintenant);
      for (const p of mine) { const g = p.groupId || 'pelland'; try { await Store.savePushSub(g, p.id, js, js ? 'actif' : (this.etatAct || 'a_activer')); } catch (e) { console.warn('abonnement', g, e.message); } }
    },
    async disable() {
      const sub = await this.sub(); if (sub) { try { await sub.unsubscribe(); } catch (e) { } }
      ls.set('pelland.push', 0);
      if (Store.mode !== 'cloud' || !Store.uid) return;
      let mine = []; try { mine = await Store.myPlayers(); } catch (e) { }
      const gs = new Set(mine.map(p => p.groupId || 'pelland').concat([Store.gid]));
      for (const g of gs) { try { await Store.deletePushSub(g); } catch (e) { } }
    },
    // Garde l'abonnement à jour (nouveau groupe, abonnement renouvelé par le navigateur)
    // Membre d'un groupe = notifications actives : dès que le téléphone les permet, l'abonnement est (re)fait sans rien demander
    // État vu par l'organisateur (Joueurs) : actif, bloque, a_activer, a_installer, non_supporte
    etat() { return !this.supported() ? (this.needsInstall() ? 'a_installer' : 'non_supporte') : this.perm() === 'denied' ? 'bloque' : this.perm() === 'granted' ? 'actif' : 'a_activer'; },
    async signaler() {
      if (Store.mode !== 'cloud' || !Store.uid) return;
      const e = this.etat(); if (e === 'actif' || ls.get('pelland.push.etat', '') === e + ':' + Store.gid) return;
      this.etatAct = e; try { await this.save(null); ls.set('pelland.push.etat', e + ':' + Store.gid); } catch (x) { }
    },
    async refresh() {
      if (this.perm() !== 'granted' || !this.supported()) return this.signaler();
      if (Store.mode !== 'cloud' || !Store.uid) return;
      try {
        const reg = await navigator.serviceWorker.ready;
        const s = await this.abonner(reg);
        await this.save(s); ls.set('pelland.push', 1); ls.set('pelland.push.etat', '');
      } catch (e) { this.etatAct = 'a_activer'; }
    },
    on() { return this.perm() === 'granted' && !!ls.get('pelland.push', 0); },
    // Avertit les membres du groupe (sauf soi) ; playerIds = seulement ces joueurs
    async notify(data) {
      if (Store.mode !== 'cloud' || !Store.uid) return;
      try { const tok = await Store.token(); await fetch(PUSH_API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ groupId: Store.gid, ...data }) }); } catch (e) { console.warn('notification', e.message); }
    }
  };
  function pushCard() {
    if (Store.needLogin || Store.mode !== 'cloud') return '';
    if (Push.on()) return '';
    const bloque = Push.perm() === 'denied';
    const install = Push.needsInstall();
    if (!install && !Push.supported()) return '';
    return `<section class="card push-card"><span class="push-ico" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 3a6 6 0 0 0-6 6v3.6L4.3 15.4A1 1 0 0 0 5.2 17h13.6a1 1 0 0 0 .9-1.6L18 12.6V9a6 6 0 0 0-6-6z" fill="currentColor"/><path d="M9.5 19a2.5 2.5 0 0 0 5 0" fill="currentColor"/></svg></span>
      <div><h3>Activez les notifications du groupe</h3><p>Elles sont obligatoires pour les membres : nouvelles dates, rappels, début des parties et résultats. Elles restent actives tant que vous êtes dans le groupe.</p>
      ${bloque ? '<p class="note"><b>Elles sont bloquées sur ce téléphone.</b> Permettez-les dans les réglages : iPhone, Réglages → Notifications → le fanion.ai ; Android, appui long sur l’icône du fanion.ai → Infos sur l’appli → Notifications. Puis rouvrez l’app.</p>'
        : `<div class="row">${install ? '<button class="btn small" data-onbact="ecran" type="button">Ajouter l’app à l’écran d’accueil</button>' : '<button class="btn small" data-pushon type="button">Activer les notifications</button>'}</div>`}
      ${install ? '<p class="note">Sur iPhone, les notifications fonctionnent une fois l’app ajoutée à l’écran d’accueil. Ouvrez-la ensuite par son icône.</p>' : ''}</div></section>`;
  }
  document.addEventListener('click', async e => {
    const t = e.target.closest && e.target.closest('[data-pushon]'); if (!t) return;
    e.preventDefault();
    t.disabled = true;
    try { await Push.enable(); toast('Notifications activées.'); } catch (x) { toast(x.message); Push.signaler(); }
    render();
  });

  async function smsService() {
    if (S.smsReady != null) return S.smsReady;
    try { const r = await fetch(SMS_API + '/status'); S.smsReady = r.ok && !!(await r.json()).ready; } catch (e) { S.smsReady = false; }
    return S.smsReady;
  }
  async function openSms(nums, text) {
    nums = (nums || []).filter(Boolean);
    if (Store.mode === 'cloud' && nums.length && await smsService()) {
      try {
        const tok = await Store.token();
        const r = await fetch(SMS_API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ to: nums, text }) });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.sent) { toast(`Texto envoyé à ${d.sent} joueur${d.sent > 1 ? 's' : ''}${(d.failed || []).length ? ` · ${d.failed.length} non envoyé${d.failed.length > 1 ? 's' : ''}` : ''}.`); return; }
        toast('Envoi automatique impossible' + (d.error ? ' : ' + d.error : '') + '. Messages s’ouvre à la place.');
      } catch (e) { }
    }
    openSmsApp(nums, text);
  }
  function openSmsApp(nums, text) {
    const body = encodeURIComponent(text), ios = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent);
    const url = ios ? `sms:/open?addresses=${nums.join(',')}&body=${body}` : `sms:${nums.join(',')}?body=${body}`;
    window.__lastSms = url; (window.top || window).location.href = url;
  }
