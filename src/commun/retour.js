  // ---------------- Boucle de retour : idées → équipe (console HoldingAI) → réponse et nouveautés dans l'app, sondage éclair ----------------
  const RETOUR_API = 'https://fanion.ai/api/retour';
  const R = { idees: [], nouveautes: [], sondageDernier: null, charge: false, sondage: null };
  const JOUR = 864e5;
  const STATUT_IDEE = { recue: ['Reçue', ''], etudiee: ['À l’étude', 'etude'], prevue: ['Prévue', 'prevue'], faite: ['Faite ✓', 'faite'], non: ['Pas pour l’instant', 'non'] };
  const TYPE_IDEE = { idee: ['💡', 'Une idée'], probleme: ['🐞', 'Un problème'], aime: ['❤️', 'J’aime'], autre: ['💬', 'Autre'] };
  const PLACE_IDEE = { idee: 'Ce serait pratique si…', probleme: 'Qu’est-ce qui accroche ? Sur quel écran ?', aime: 'Ce que vous aimez le plus…', autre: 'Votre message…' };
  const cleIdee = i => i.statut + '|' + (i.repondu || '');
  const vuKey = () => 'fanion.retour.' + (Store.uid || '');
  const vuR = () => ls.get(vuKey(), {}) || {};
  const noterVu = o => ls.set(vuKey(), { ...vuR(), ...o });
  async function retourApi(body) {
    const tok = Store.mode === 'cloud' && await Store.token(); if (!tok) throw new Error('Connexion requise.');
    const r = await fetch(RETOUR_API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'Erreur ' + r.status); return d;
  }
  async function chargerRetour() {
    if (Store.needLogin || Store.mode !== 'cloud') return;
    try { const d = await retourApi({ action: 'lire' }); Object.assign(R, { idees: d.idees || [], nouveautes: d.nouveautes || [], sondageDernier: d.sondageDernier, charge: true }); }
    catch (e) { return; }
    if (S.view === 'home' && !document.querySelector('#sheetWrap:not([hidden]), #welcome, .cd-fond')) render();
  }
  // Une seule carte à la fois en haut de l'accueil : réponse reçue, puis nouveauté, puis sondage éclair
  function carteRetourChoix() {
    if (!R.charge || Store.needLogin) return null;
    const vu = vuR(), vuI = vu.idees || {};
    const rep = R.idees.find(i => (i.reponse || ['prevue', 'faite', 'non'].includes(i.statut)) && vuI[i.id] !== cleIdee(i));
    if (rep) return { k: 'reponse', i: rep };
    const cree = Number(ls.get('fanion.premiereVisite', 0)) || (ls.set('fanion.premiereVisite', Date.now()), Date.now());
    const depuis = Math.max(cree, Number(vu.nv || 0));
    const nv = R.nouveautes.find(n => new Date(n.cree).getTime() > depuis);
    if (nv) return { k: 'nouveaute', n: nv };
    if (R.sondage) return { k: 'sondage' };
    const dernier = Math.max(new Date(R.sondageDernier || 0).getTime(), Number(vu.sondage || 0));
    if (Date.now() - cree >= 10 * JOUR && Date.now() - dernier >= 90 * JOUR && Date.now() - Number(vu.sondagePlusTard || 0) >= 14 * JOUR) return { k: 'sondage' };
    return null;
  }
  function retourCarte() {
    const c = carteRetourChoix(); if (!c) return '';
    if (c.k === 'reponse') {
      const i = c.i, [mot] = STATUT_IDEE[i.statut] || STATUT_IDEE.recue;
      return `<section class="card retour-carte"><b>${i.statut === 'faite' ? '🎉 Votre idée est en ligne !' : '💬 L’équipe vous a répondu'}</b>
        <p class="note">Vous avez écrit : « ${esc(i.texte.length > 140 ? i.texte.slice(0, 140) + '…' : i.texte)} » · <b>${esc(mot)}</b></p>
        ${i.reponse ? `<p>${esc(i.reponse)}</p>` : ''}
        <div class="row"><button class="btn small" type="button" data-retour="vu-idee" data-id="${esc(i.id)}">Merci !</button><button class="btn ghost small" type="button" data-idee>Voir mes envois</button></div></section>`;
    }
    if (c.k === 'nouveaute') {
      const n = c.n;
      return `<section class="card retour-carte"><b>✨ Nouveau : ${esc(n.titre)}</b>${n.texte ? `<p>${esc(n.texte)}</p>` : ''}
        <div class="row"><button class="btn small" type="button" data-retour="vu-nv" data-t="${new Date(n.cree).getTime()}">Super</button><button class="btn ghost small" type="button" data-idee>Proposer une idée</button></div></section>`;
    }
    if (!R.sondage) return `<section class="card retour-carte"><b>Recommanderiez-vous le fanion.ai à un ami golfeur ?</b>
        <p class="note">0 = pas du tout, 10 = sans hésiter. Une seule question.</p>
        <div class="nps" role="group" aria-label="Note de 0 à 10">${Array.from({ length: 11 }, (_, n) => `<button type="button" class="nps-n" data-note="${n}">${n}</button>`).join('')}</div>
        <div class="row"><button class="linkbtn" type="button" data-retour="sondage-plus-tard">Plus tard</button></div></section>`;
    const n = R.sondage.note, q = n >= 9 ? 'Merci ! Qu’est-ce que vous aimez le plus ?' : n >= 7 ? 'Merci ! Qu’est-ce qui le rendrait parfait pour votre groupe ?' : 'Merci de votre franchise. Qu’est-ce qui accroche le plus ?';
    return `<section class="card retour-carte"><b>${esc(q)}</b>
        <textarea id="sondageRaison" rows="3" maxlength="2000" placeholder="Facultatif, mais ça nous aide beaucoup"></textarea>
        <div class="row"><button class="btn small" type="button" data-retour="sondage-envoyer">Envoyer</button><button class="linkbtn" type="button" data-retour="sondage-passer">Passer</button></div></section>`;
  }
  async function finirSondage(raison) {
    const n = R.sondage.note; R.sondage = null; noterVu({ sondage: Date.now() });
    retourApi({ action: 'sondage', note: n, raison: raison || null, groupe: groupName() }).catch(() => { });
    if (raison) envoyerIdee({ type: n >= 9 ? 'aime' : n <= 6 ? 'probleme' : 'idee', texte: raison, source: 'sondage' }).catch(() => { });
    render();
    if (n >= 9) openSheet(`<h3>Merci, ça fait vraiment plaisir !</h3><p>Vous connaissez un autre groupe de golf qui court après ses joueurs ? Envoyez-lui votre lien : c’est gratuit pour un quatuor${meId() === ownerId() ? ', et vous obtenez 5 $ de rabais sur votre prochaine saison s’il passe au forfait Groupe' : ''}.</p>
      <div class="sheet-actions"><button class="btn" data-refshare type="button">Partager mon lien</button><button class="btn ghost" data-close type="button">Plus tard</button></div>`, sh => { sh.querySelector('[data-close]').onclick = closeSheet; sh.querySelector('[data-refshare]').addEventListener('click', () => setTimeout(closeSheet, 300)); });
    else toast('Merci ! Votre réponse est bien reçue. L’équipe la lit.');
  }
  async function envoyerIdee({ type, texte, contact, source }) {
    const me = (S.players || []).find(p => p.id === meId());
    const d = await retourApi({ action: 'idee', type, texte, contact: !!contact, source, prenom: firstName((me && me.name) || ls.get('pelland.me', '')), groupe: groupName(), ecran: S.view, appareil: navigator.userAgent.slice(0, 160) });
    if (d.idee) R.idees.unshift(d.idee);
    return d;
  }
  function ideeSheet(type0) {
    let type = type0 || 'idee';
    const mesEnvois = () => R.idees.length ? `<h4 class="idee-h">Vos envois</h4><ul class="idee-liste">${R.idees.map(i => {
      const [mot, cls] = STATUT_IDEE[i.statut] || STATUT_IDEE.recue;
      return `<li><div class="idee-tete"><span>${(TYPE_IDEE[i.type] || TYPE_IDEE.autre)[0]} ${esc(new Date(i.cree).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' }))}</span><span class="idee-statut ${cls}">${esc(mot)}</span></div>
        <p>${esc(i.texte)}</p>${i.reponse ? `<p class="idee-rep"><b>Réponse de l’équipe :</b> ${esc(i.reponse)}</p>` : ''}</li>`;
    }).join('')}</ul>` : '';
    openSheet(`<h3>Une idée ? Un pépin ?</h3>
      <p class="note">Ça va directement à l’équipe du fanion.ai. On lit tout, et la réponse s’affiche ici, dans l’app.</p>
      <div class="seg idee-types">${Object.entries(TYPE_IDEE).map(([k, [ic, mot]]) => `<button type="button" data-itype="${k}" aria-pressed="${k === type}"><b>${ic}</b><small>${esc(mot)}</small></button>`).join('')}</div>
      <label class="fld"><span class="sr-only">Votre message</span><textarea id="ideeTexte" rows="4" maxlength="2000" placeholder="${esc(PLACE_IDEE[type])}"></textarea></label>
      <label class="av-ok"><input type="checkbox" id="ideeContact"><span>L’équipe peut me texter pour en parler.</span></label>
      <div class="sheet-actions"><button class="btn" id="ideeGo" type="button">Envoyer</button><button class="btn ghost" data-close type="button">Fermer</button></div>
      <div id="ideeMiennes">${mesEnvois()}</div>`, sh => {
      const ta = sh.querySelector('#ideeTexte');
      sh.querySelectorAll('[data-itype]').forEach(b => b.onclick = () => { type = b.dataset.itype; sh.querySelectorAll('[data-itype]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); ta.placeholder = PLACE_IDEE[type]; });
      sh.querySelector('[data-close]').onclick = closeSheet;
      const go2 = sh.querySelector('#ideeGo');
      go2.onclick = async () => {
        const texte = ta.value.trim(); if (texte.length < 2) { toast('Écrivez quelques mots.'); ta.focus(); return; }
        go2.disabled = true;
        try { await envoyerIdee({ type, texte, contact: sh.querySelector('#ideeContact').checked }); }
        catch (e) { go2.disabled = false; toast('Envoi impossible : ' + e.message); return; }
        go2.disabled = false; ta.value = ''; sh.querySelector('#ideeContact').checked = false;
        sh.querySelector('#ideeMiennes').innerHTML = mesEnvois();
        toast(type === 'aime' ? 'Merci ! Ça fait vraiment plaisir à l’équipe.' : 'Merci ! C’est bien reçu. Vous verrez notre réponse ici.');
      };
      // Ouvrir la liste vaut lecture des réponses
      const vu = vuR().idees || {}; R.idees.forEach(i => { vu[i.id] = cleIdee(i); }); noterVu({ idees: vu });
      if (!R.charge) chargerRetour().then(() => { const m = sh.querySelector('#ideeMiennes'); if (m) m.innerHTML = mesEnvois(); });
    });
  }
  document.addEventListener('click', e => {
    if (!e.target.closest) return;
    const t = e.target.closest('[data-idee]'); if (t) { e.preventDefault(); ideeSheet(); return; }
    const nb = e.target.closest('.retour-carte [data-note]'); if (nb) { R.sondage = { note: Number(nb.dataset.note) }; render(); setTimeout(() => { const x = document.getElementById('sondageRaison'); if (x) x.focus(); }, 60); return; }
    const b = e.target.closest('[data-retour]'); if (!b) return;
    const g = b.dataset.retour;
    if (g === 'vu-idee') { const i = R.idees.find(x => x.id === b.dataset.id); const vu = vuR().idees || {}; if (i) vu[i.id] = cleIdee(i); noterVu({ idees: vu }); }
    else if (g === 'vu-nv') noterVu({ nv: Number(b.dataset.t) });
    else if (g === 'sondage-plus-tard') noterVu({ sondagePlusTard: Date.now() });
    else if (g === 'sondage-envoyer') { finirSondage((document.getElementById('sondageRaison') || {}).value || ''); return; }
    else if (g === 'sondage-passer') { finirSondage(''); return; }
    render();
  });
