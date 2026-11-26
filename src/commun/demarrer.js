  // ---------------- Bien démarrer : 4 premiers pas pour un nouveau groupe (propriétaire et organisateur) ----------------
  // Le progrès est gardé sur le groupe (onb), donc le même sur tous les téléphones ; l'écran d'accueil est propre à chaque téléphone.
  async function markStep(key) {
    const gr = curGroup(); if ((gr.onb || {})[key]) return;
    const ng = { ...gr, onb: { ...(gr.onb || {}), [key]: Date.now() } };
    S.groups = (S.groups || []).map(g => g.id === ng.id ? ng : g);
    try { await Store.saveGroup(ng); } catch (e) { }
  }
  const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  function onboardSteps() {
    const onb = curGroup().onb || {}, me = meId();
    const withPhone = (S.players || []).filter(p => p.id !== me && (p.phone || p.authEmail)).length;
    return [
      { k: 'joueurs', done: withPhone >= 3, t: 'Ajoutez vos joueurs', d: withPhone ? SPORT.etapeJoueurs(withPhone) : 'Avec leur cellulaire : chacun reçoit son invitation par texto.', go: 'players', b: 'Joueurs' },
      { k: 'offre', done: !!onb.offre || (S.offres || []).length > 0, t: 'Offrez une première date', d: SPORT.etapeOffre, go: 'quatuors', b: 'Offrir' },
      { k: 'partie', done: !!onb.partie, t: 'Jouez une première partie', d: SPORT.etapePartie, go: 'setup', b: 'Commencer' },
      { k: 'ecran', done: standalone() || !!ls.get('pelland.onb.ecran', 0), t: 'Ajoutez l’app à votre écran d’accueil', d: 'Elle s’ouvre ensuite comme une vraie app.', act: 'ecran', b: 'Comment' },
    ];
  }
  function onboardCard() {
    if (Store.needLogin || !canOrganize() || ls.get('pelland.onb.hide.' + Store.gid, 0)) return '';
    const st = onboardSteps(), n = st.filter(x => x.done).length;
    if (n === st.length) return '';
    const next = st.find(x => !x.done);
    return `<section class="card onboard"><div class="onb-head"><h3>Bien démarrer</h3><span class="onb-count">${n} / ${st.length}</span></div>
      <div class="onb-bar"><i style="width:${Math.round(n / st.length * 100)}%"></i></div>
      <ol class="onb-list">${st.map(x => `<li class="${x.done ? 'done' : x === next ? 'next' : ''}"><span class="onb-dot">${x.done ? '✓' : ''}</span><div><b>${esc(x.t)}</b>${x === next ? `<small>${esc(x.d)}</small>` : ''}</div>${x.done ? '' : x === next ? `<button class="btn small" ${x.go ? `data-go="${x.go}"` : `data-onbact="${x.act}"`} type="button">${esc(x.b)}</button>` : `<button class="onb-more" ${x.go ? `data-go="${x.go}"` : `data-onbact="${x.act}"`} type="button" aria-label="${esc(x.b)}">›</button>`}</li>`).join('')}</ol>
      <p class="note onb-foot">Une question ? <button class="linkbtn" data-caddie type="button">Demandez à ${MARQUE.personnage}, ${MARQUE.role}</button> · <button class="linkbtn" data-onbhide type="button">Masquer</button></p></section>`;
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-onbact],[data-onbhide]'); if (!t) return;
    e.preventDefault();
    if (t.hasAttribute('data-onbhide')) { ls.set('pelland.onb.hide.' + Store.gid, 1); return render(); }
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    openSheet(`<h3>${MARQUE.nomMaj} sur votre écran d’accueil</h3>
      <ol class="info-list">${ios ? '<li>Ouvrez ' + APP + ' dans <b>Safari</b>.</li><li>Touchez le bouton <b>Partager</b> (le carré avec une flèche vers le haut).</li><li>Choisissez <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>.</li>'
        : '<li>Ouvrez ' + APP + ' dans <b>Chrome</b>.</li><li>Touchez le menu <b>⋮</b> en haut à droite.</li><li>Choisissez <b>Ajouter à l’écran d’accueil</b> (ou <b>Installer l’application</b>).</li>'}</ol>
      <p class="note">${MARQUE.icone} apparaît avec vos autres apps. Partagez ces étapes avec vos joueurs.</p>
      <div class="sheet-actions"><button class="btn" data-ecranok type="button">C’est fait</button><button class="btn ghost" data-close type="button">Plus tard</button></div>`, sh => {
      sh.querySelector('[data-close]').onclick = closeSheet;
      sh.querySelector('[data-ecranok]').onclick = () => { ls.set('pelland.onb.ecran', 1); closeSheet(); render(); };
    });
  });
