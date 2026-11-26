  // ---------------- Accueil ----------------
  // Membres invités (ni propriétaire ni organisateur) : ces tuiles sont grisées ; survol ou toucher = explication
  const LOCKED = SPORT.verrous;
  function lockTiles(html) {
    if (canOrganize()) return html;
    return html.replace(/<button class="tile" data-go="(courses|players|jeux|quatuors|setup)"/g, (m, k) => `<button class="tile locked" data-locked="${k}" data-tip="${esc(LOCKED[k])} Touchez pour voir un aperçu."`)
      .replace(/(data-locked="\w+" data-tip="[^"]*"[^>]*>)/g, '$1<span class="tile-lock" aria-hidden="true"><svg viewBox="0 0 24 24" width="13" height="13"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" stroke-width="2.4" fill="none"/></svg>Aperçu</span>');
  }
  // =====================================================================
  // Participants (ni propriétaire ni organisateur) : accueil à la première visite du groupe,
  // et aperçu de chaque tuile réservée à l'organisateur.
  // =====================================================================
  const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
  function organizerOf() {
    const orgId = (curGroup().organizers || [])[0] || ownerId();
    return (S.players || []).find(p => p.id === orgId) || null;
  }
  const isParticipant = () => !Store.needLogin && !!meId() && !canOrganize();
  const welcomeKey = () => 'pelland.welcome.' + Store.gid + '.' + meId();
  // Petits aperçus dessinés de chaque écran réservé (données d'exemple)
  const MOCK = SPORT.apercus;
  const LOCKED_INFO = SPORT.apercuInfos;
  function lockedSheet(k) {
    const x = LOCKED_INFO[k], org = organizerOf();
    openSheet(`<div class="lk">
        <div class="lk-head"><span class="lk-lock" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" stroke-width="2.2" fill="none"/></svg></span>
          <div><h3>${esc(x.t)}</h3><p>Réservé à ${org ? esc(org.name) : 'l’organisateur'}</p></div></div>
        <div class="lk-shot" aria-hidden="true">${MOCK[k]()}</div>
        <p class="lk-d">${esc(x.d)}</p>
        <p class="lk-you"><b>Pour vous :</b> ${esc(x.you)}</p>
        <div class="sheet-actions"><button class="btn" data-close type="button">Compris</button></div>
        <p class="lk-own">Envie d’organiser votre propre gang ? <button class="linkbtn" data-viral type="button">Créer mon groupe gratuit</button></p>
      </div>`, sh => { sh.querySelector('[data-close]').onclick = closeSheet; });
  }
  document.addEventListener('click', async e => { const b = e.target.closest && e.target.closest('[data-copyuid]'); if (!b) return; try { await navigator.clipboard.writeText(b.dataset.copyuid); toast('Identifiant copié.'); } catch (x) { toast('Sélectionnez le code pour le copier.'); } });
  document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-locked]'); if (t) { e.preventDefault(); lockedSheet(t.dataset.locked); } });

  // Accueil du participant : une étiquette de sac à son nom, ce qu'il peut faire, ce que l'organisateur fait
  function showWelcome() {
    const me = (S.players || []).find(p => p.id === meId()) || { name: ls.get('pelland.me', '') }, org = organizerOf();
    const wrap = document.createElement('div'); wrap.id = 'welcome'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'wlTitle');
    wrap.innerHTML = `<div class="wl-in">
      <div class="wl-tag" aria-hidden="true">
        <span class="wl-strap"></span>
        <div class="wl-card">
          <span class="wl-hole"></span>
          <div class="wl-brand"><svg width="16" height="19" viewBox="${MARQUE.logoVue}">${MARQUE.logo}</svg>${APP}</div>
          <div class="wl-name">${esc(me.name)}</div>
          <div class="wl-grp">${esc(groupName())}</div>
          <div class="wl-role">Participant</div>
        </div>
      </div>
      <h1 id="wlTitle">Bienvenue dans la gang, ${esc(firstName(me.name))}.</h1>
      <p class="wl-lead">Vous faites partie de « ${esc(groupName())} » comme participant. ${org ? esc(firstName(org.name)) + ' organise' : 'L’organisateur s’occupe de tout'} ; vous, vous jouez.</p>
      <div class="wl-cols">
        <section class="wl-you"><h2>Ce que vous faites</h2><ul>
${SPORT.bienvenueVous}</ul></section>
        <section class="wl-org"><h2>Ce que ${org ? esc(firstName(org.name)) : 'l’organisateur'} fait pour le groupe</h2><ul>
          ${SPORT.bienvenueOrg}</ul>
          <p>Ces tuiles sont grisées pour vous. Touchez-en une pour voir à quoi elle sert.</p></section>
      </div>
      <p class="wl-notif">🔔 En entrant, les notifications du groupe s’activent : nouvelles dates, rappels, parties et résultats. Elles restent actives tant que vous êtes membre du groupe.</p>
      <button class="btn wl-go" id="wlGo" type="button">Entrer dans le groupe</button>
      <p class="wl-own">Envie d’organiser votre propre gang ? <button class="linkbtn" id="wlOwn" type="button">Créer mon groupe gratuit</button></p>
    </div>`;
    document.body.appendChild(wrap);
    const close = () => { try { ls.set(welcomeKey(), Date.now()); } catch (e) { } wrap.classList.add('out'); setTimeout(() => wrap.remove(), 250); };
    // Notifications du groupe : activées d'office en entrant (le geste du joueur permet de demander la permission au téléphone)
    wrap.querySelector('#wlGo').onclick = () => { close(); if (Push.supported() && !Push.needsInstall() && Push.perm() !== 'denied') Push.enable().then(() => toast('Notifications du groupe activées.')).catch(() => Push.signaler()).then(() => render()); else Push.signaler(); };
    wrap.querySelector('#wlOwn').onclick = () => { close(); setTimeout(newGroupSheet, 260); };
    wrap.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    wrap.tabIndex = -1; setTimeout(() => { wrap.scrollTop = 0; wrap.focus({ preventScroll: true }); }, 50);
  }
  function maybeWelcome() { if (S.view === 'home' && isParticipant() && !ls.get(welcomeKey(), 0) && !document.getElementById('welcome')) showWelcome(); }