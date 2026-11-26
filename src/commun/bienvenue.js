  // ---------------- Accueil ----------------
  // Membres invités (ni propriétaire ni organisateur) : ces tuiles sont grisées ; survol ou toucher = explication
  const LOCKED = {
    courses: 'Réservé à l’organisateur : il ajoute et corrige les terrains du groupe.',
    players: 'Réservé à l’organisateur : il ajoute les joueurs et leur cellulaire.',
    jeux: 'Réservé à l’organisateur : il choisit les jeux, les règles et les montants du groupe.',
    quatuors: 'Réservé à l’organisateur : il offre les dates et forme les quatuors. Vous répondez avec le lien reçu par texto.',
    setup: 'Réservé à l’organisateur : il crée les parties. Vous les suivez en direct dans Parties en cours.',
  };
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
  const MOCK = {
    players: () => `<div class="mk mk-list">${[['Marc Lavoie', 'ok', 'Compte créé'], ['Julie Roy', 'ok', 'Compte créé'], ['Éric Gagnon', 'wait', 'Invité']].map(([n, c, t]) =>
      `<div class="mk-row"><span class="mk-av">${n.split(' ').map(x => x[0]).join('')}</span><b>${n}</b><span class="mk-pill ${c}">${t}</span></div>`).join('')}<div class="mk-add">+ Ajouter un joueur et son cellulaire</div></div>`,
    quatuors: () => `<div class="mk mk-offre"><div class="mk-date"><b>Samedi 14 juin, 8 h</b><span>Pinegrove</span></div>
      <div class="mk-yes">${['Marc', 'Julie', 'Éric', 'Luc', 'Ana', 'Paul', 'Guy', 'Bob'].map(n => `<span>${n}</span>`).join('')}</div>
      <div class="mk-q"><span>Quatuor 1 : Marc, Julie, Éric, Luc</span><span>Quatuor 2 : Ana, Paul, Guy, Bob</span></div></div>`,
    setup: () => `<div class="mk mk-setup"><div class="mk-f"><span>Terrain</span><b>Pinegrove, tertres blancs</b></div><div class="mk-f"><span>Jeu</span><b>La game à Pelland</b></div>
      <div class="mk-teams"><div class="r"><b>Rouges</b>Marc et Paul</div><div class="b"><b>Bleus</b>Julie et Luc</div></div><div class="mk-f"><span>La game commence à</span><b>10 $</b></div></div>`,
    courses: () => `<div class="mk mk-course"><b>Pinegrove</b><span>Saint-Jean-sur-Richelieu, normale 72</span>
      <div class="mk-holes">${[5, 3, 4, 4, 5, 3, 5, 3, 4, 4, 5, 3, 5, 4, 3, 4, 4, 4].map((p, i) => `<i><small>${i + 1}</small>${p}</i>`).join('')}</div></div>`,
    jeux: () => `<div class="mk mk-jeu"><b>La game à Pelland</b><ul><li>Plus bas net du trou : 2 points</li><li>Skin, oiselet, press et reroll</li></ul>
      <div class="mk-money"><span>Départ <b>10 $</b></span><span>Revirement <b>5 $</b></span><span>Normale 3 <b>5 $</b></span></div></div>`,
  };
  const LOCKED_INFO = {
    players: { t: 'Inviter des joueurs', d: 'L’organisateur ajoute chaque joueur avec son cellulaire ; l’invitation part par texto.', you: 'Vous avez reçu cette invitation : votre compte est créé.' },
    quatuors: { t: 'Parties à préparer', d: 'L’organisateur offre des dates ; l’app voit qui est disponible et forme les quatuors.', you: 'Vous recevez un texto avec un lien : cochez vos dates, c’est tout.' },
    setup: { t: 'Créer une partie', d: 'Terrain, joueurs, équipes, jeu et montants : l’organisateur lance la partie et entre les scores.', you: 'Vous suivez la partie en direct dans Parties en cours.' },
    courses: { t: 'Banque de terrains', d: 'Les terrains du groupe, avec leurs normales, la difficulté de chaque trou et leurs tertres.', you: 'Les coups de handicap de chacun en découlent automatiquement.' },
    jeux: { t: 'Banque de jeux', d: 'Les règles et les montants de chaque jeu : la game à Pelland, Nassau, Vegas, skins, Wolf…', you: 'Les règles détaillées sont aussi sur fanion.ai/regles.' },
  };
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
          <div class="wl-brand"><svg width="16" height="19" viewBox="0 0 26 30"><path d="M5 2v26" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M6 3l15 5.5L6 14z" fill="#e3a90c"/></svg>le fanion.ai</div>
          <div class="wl-name">${esc(me.name)}</div>
          <div class="wl-grp">${esc(groupName())}</div>
          <div class="wl-role">Participant</div>
        </div>
      </div>
      <h1 id="wlTitle">Bienvenue dans la gang, ${esc(firstName(me.name))}.</h1>
      <p class="wl-lead">Vous faites partie de « ${esc(groupName())} » comme participant. ${org ? esc(firstName(org.name)) + ' organise' : 'L’organisateur s’occupe de tout'} ; vous, vous jouez.</p>
      <div class="wl-cols">
        <section class="wl-you"><h2>Ce que vous faites</h2><ul>
          <li><b>Répondre aux dates</b> avec le lien reçu par texto.</li>
          <li><b>Suivre les parties en direct</b> : scores, points et argent, trou par trou.</li>
          <li><b>Revoir les parties jouées</b> et qui doit quoi à qui.</li>
          <li><b>Voir le classement</b> des compétitions.</li>
          <li><b>Poser vos questions</b> à Léo, votre caddie : touchez son visage dans le coin.</li></ul></section>
        <section class="wl-org"><h2>Ce que ${org ? esc(firstName(org.name)) : 'l’organisateur'} fait pour le groupe</h2><ul>
          <li>Inviter les joueurs</li><li>Offrir les dates et former les quatuors</li><li>Créer les parties</li><li>Gérer les terrains et les jeux</li></ul>
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