  // =====================================================================
  // Écrans du module raquette : accueil, lieux, soirées, une soirée (réponses, rotations, pointage, classement)
  // =====================================================================
  const nomJoueur = id => ((S.players || []).find(p => p.id === id) || {}).name || '?';
  const prenomJ = id => firstName(nomJoueur(id));
  const equipeTxt = ids => ids.map(prenomJ).join(' et ');
  const jourTxt = d => { try { return new Date(d + 'T12:00').toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' }); } catch (e) { return d; } };
  const heureTxt = h => String(h || '').replace(':', ' h ').replace(/ h 00$/, ' h');
  const aujourdhui = () => new Date().toLocaleDateString('sv');   // AAAA-MM-JJ, heure locale
  const regleSoiree = s => regleDe(s.sport, s.cible);
  const reponses = (s, vals) => {
    const oui = [], non = [];
    Object.entries(vals || {}).filter(([k]) => k.startsWith('v-')).sort((a, b) => (a[1].at || 0) - (b[1].at || 0))
      .forEach(([k, v]) => (v.ok ? oui : non).push(k.slice(2)));
    const places = Number(s.places) || 0;
    return { oui, non, inscrits: places ? oui.slice(0, places) : oui, attente: places ? oui.slice(places) : [] };
  };
  // Manche en cours : la première dont un match n'a pas de pointage
  const mancheCourante = (s, vals) => (s.manches || []).findIndex((m, i) => m.matchs.some((x, j) => !(vals || {})[cleResultat(i, j)]));

  function vHomeRaquette() {
    $('#barTitle').innerHTML = `${APP}<small class="bar-sous">${esc(MARQUE.slogan)}</small>`;
    const a = aujourdhui(), list = S.soirees || [];
    const enCours = list.find(s => s.statut === 'en cours');
    const prochaine = list.filter(s => s.statut === 'offerte' && s.date >= a).sort((x, y) => (x.date + x.heure).localeCompare(y.date + y.heure))[0];
    const carte = (s, k) => `<button class="tile primary" data-soiree="${esc(s.id)}" type="button"><span class="pin">${k}</span><div><strong>${esc(jourTxt(s.date))}, ${esc(heureTxt(s.heure))}</strong><span>${esc(s.lieuNom || '')} · ${esc(SPORTS[s.sport] ? SPORTS[s.sport].nom : '')}${s.statut === 'en cours' ? ' · en cours' : ''}</span></div></button>`;
    return `
      <div class="hero"><div class="hero-k-row"><span class="hero-k">Groupe :</span>${Store.needLogin ? '' : `<span class="hero-liens"><button class="btn ghost small" data-viral type="button">+ Ajouter un groupe</button></span>`}</div>
        <h1>${esc(groupName())}</h1></div>
      ${Store.needLogin ? '' : groupInfo(true)}
      ${retourCarte()}
      ${enCours ? `<h3 class="home-h">En cours</h3><div class="tiles">${carte(enCours, '▶')}</div>` : ''}
      ${prochaine && prochaine !== enCours ? `<h3 class="home-h">Prochaine soirée</h3><div class="tiles">${carte(prochaine, '📅')}</div>` : ''}
      <h3 class="home-h">Le groupe</h3>
      ${lockTiles(`<div class="tiles steps">
        <button class="tile" data-go="players" data-pmode="inviter"><span class="pin step-n">1</span><div><strong>Inviter des joueurs</strong><span>Le nom et le cellulaire de chacun</span></div></button>
        <button class="tile" data-go="soirees"><span class="pin step-n">2</span><div><strong>Soirées</strong><span>Offrir une soirée, voir qui vient, lancer les rotations</span></div></button>
        <button class="tile" data-go="lieux"><span class="pin step-n">3</span><div><strong>Lieux et terrains</strong><span>Où le groupe joue, et combien de terrains</span></div></button>
      </div>`)}
      ${onboardCard()}
      ${avisCard('home')}
      ${referralCard()}
      ${viralCard('home')}
      <p class="note">${Store.mode === 'cloud' ? 'Base partagée active : chacun voit les rotations et les pointages en direct.' : 'Mode local : les soirées restent sur cet appareil.'}</p>
      ${Store.mode === 'local' && Store.error ? `<div class="warn"><b>Pourquoi le mode local :</b> ${esc(Store.error)}</div>` : ''}`;
  }

  // ---------------- Lieux ----------------
  function vLieux() {
    const l = S.lieux || [];
    return `<h2>Lieux et terrains</h2>
      <p class="note">Les endroits où le groupe joue. Le nombre de terrains (ou de tables) est proposé à chaque soirée.</p>
      <div class="list">${l.length ? l.map(x => `<button class="item rq-lieu" data-lieu="${esc(x.id)}" type="button"><b>${esc(x.nom)}</b><span>${esc(x.adresse || '')}</span><span class="pill">${x.terrains} ${x.table ? 'table' : 'terrain'}${x.terrains > 1 ? 's' : ''}</span></button>`).join('') : '<p class="note">Aucun lieu pour l’instant.</p>'}</div>
      ${canOrganize() ? '<button class="btn" id="lieuNew" type="button">Ajouter un lieu</button>' : ''}`;
  }
  function lieuSheet(x) {
    x = x || { id: '', nom: '', adresse: '', terrains: 4, table: false };
    openSheet(`<h3>${x.id ? 'Modifier le lieu' : 'Nouveau lieu'}</h3>
      <label>Nom<input id="lNom" type="text" autocapitalize="words" value="${esc(x.nom)}" placeholder="${esc(SPORT.lieuExemple)}"></label>
      <label>Adresse (facultatif)<input id="lAdr" type="text" value="${esc(x.adresse || '')}"></label>
      <label>Nombre de terrains ou de tables<input id="lNb" type="number" inputmode="numeric" min="1" max="40" value="${x.terrains}"></label>
      <label class="check"><input id="lTable" type="checkbox" ${x.table ? 'checked' : ''}> Ce sont des tables (tennis de table)</label>
      <div class="row"><button class="btn small" id="lSave" type="button">Enregistrer</button>${x.id ? '<button class="btn ghost small" id="lDel" type="button">Retirer</button>' : ''}<button class="btn ghost small" data-close type="button">Annuler</button></div>`, sh => {
      sh.querySelector('[data-close]').onclick = closeSheet;
      sh.querySelector('#lSave').onclick = async () => {
        const nom = sh.querySelector('#lNom').value.trim(), n = Math.round(Number(sh.querySelector('#lNb').value));
        if (!nom) return toast('Entrez le nom du lieu.');
        if (!(n >= 1 && n <= 40)) return toast('Entre 1 et 40 terrains.');
        const y = { ...x, id: x.id || slug(nom) + '-' + Math.random().toString(36).slice(2, 6), nom, adresse: sh.querySelector('#lAdr').value.trim(), terrains: n, table: sh.querySelector('#lTable').checked };
        const list = (S.lieux || []).filter(z => z.id !== y.id).concat([y]).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
        try { await Store.saveLieux(list); S.lieux = list; closeSheet(); render(); } catch (e) { toast('Impossible : ' + e.message); }
      };
      const d = sh.querySelector('#lDel'); if (d) d.onclick = async () => {
        const list = (S.lieux || []).filter(z => z.id !== x.id);
        try { await Store.saveLieux(list); S.lieux = list; closeSheet(); render(); } catch (e) { toast('Impossible : ' + e.message); }
      };
    });
  }

  // ---------------- Soirées ----------------
  function vSoirees() {
    const a = aujourdhui(), l = S.soirees;
    if (!l) return '<p class="note">Chargement…</p>';
    const avenir = l.filter(s => s.statut !== 'terminée' && (s.date >= a || s.statut === 'en cours')).sort((x, y) => (x.date + x.heure).localeCompare(y.date + y.heure));
    const passees = l.filter(s => !avenir.includes(s));
    const ligne = s => `<button class="item hist ${s.statut === 'terminée' ? 'done' : ''}" data-soiree="${esc(s.id)}" type="button"><b>${esc(jourTxt(s.date))}, ${esc(heureTxt(s.heure))}</b><span>${esc(s.lieuNom || '')} · ${esc((SPORTS[s.sport] || {}).nom || '')} · ${s.terrains} ${motLieu(regleSoiree(s), s.terrains)}</span><span class="pill">${esc(s.statut)}</span></button>`;
    return `<h2>Soirées</h2>
      ${canOrganize() ? '<button class="btn" id="soireeNew" type="button">Offrir une soirée</button>' : ''}
      <h3 class="home-h">À venir</h3><div class="list">${avenir.length ? avenir.map(ligne).join('') : '<p class="note">Aucune soirée offerte.</p>'}</div>
      ${passees.length ? `<h3 class="home-h">Passées</h3><div class="list">${passees.slice(0, 30).map(ligne).join('')}</div>` : ''}`;
  }
  function soireeSheet() {
    const lieux = S.lieux || [], dernier = (S.soirees || [])[0] || {};
    if (!lieux.length) { toast('Ajoutez d’abord un lieu.'); return go('lieux'); }
    const sport0 = dernier.sport || 'pickleball', lieu0 = lieux.find(l => l.id === dernier.lieuId) || lieux[0];
    const optsSport = SPORTS_ORDRE.map(k => `<option value="${k}" ${k === sport0 ? 'selected' : ''}>${esc(SPORTS[k].nom)}</option>`).join('');
    openSheet(`<h3>Offrir une soirée</h3>
      <div class="rq-2"><label>Date<input id="sDate" type="date" value="${esc(aujourdhui())}"></label><label>Heure<input id="sHeure" type="time" value="${esc(dernier.heure || '19:00')}"></label></div>
      <label>Lieu<select id="sLieu">${lieux.map(l => `<option value="${esc(l.id)}" ${l === lieu0 ? 'selected' : ''}>${esc(l.nom)}</option>`).join('')}</select></label>
      <div class="rq-2"><label>Terrains réservés<input id="sTer" type="number" inputmode="numeric" min="1" max="40" value="${dernier.terrains || lieu0.terrains}"></label>
        <label>Places (facultatif)<input id="sPlaces" type="number" inputmode="numeric" min="2" max="64" value="${dernier.places || ''}" placeholder="sans limite"></label></div>
      <label>Sport<select id="sSport">${optsSport}</select></label>
      <div class="rq-2"><label>Jeu<select id="sMode"></select></label><label>Manche<select id="sCible"></select></label></div>
      <p class="note" id="sRegle"></p>
      <div class="row"><button class="btn small" id="sSave" type="button">Offrir et prévenir le groupe</button><button class="btn ghost small" data-close type="button">Annuler</button></div>`, sh => {
      const q = s => sh.querySelector(s);
      const majSport = () => {
        const s = SPORTS[q('#sSport').value];
        q('#sMode').innerHTML = s.modes.map(m => `<option value="${m}" ${m === (dernier.sport === q('#sSport').value ? dernier.mode : s.mode) ? 'selected' : ''}>${m === 'double' ? 'Double' : 'Simple'}</option>`).join('');
        q('#sCible').innerHTML = s.cibles.map(c => `<option value="${c}" ${c === (dernier.sport === q('#sSport').value ? dernier.cible : s.cible) ? 'selected' : ''}>${s.unite === 'jeux' ? 'Set à ' + c + ' jeux' : 'À ' + c + ' points'}</option>`).join('');
        majRegle();
      };
      const majRegle = () => { q('#sRegle').textContent = texteRegle(regleDe(q('#sSport').value, q('#sCible').value)) + '.'; };
      q('#sSport').onchange = majSport; q('#sCible').onchange = majRegle; majSport();
      q('#sLieu').onchange = () => { const l = lieux.find(x => x.id === q('#sLieu').value); if (l) q('#sTer').value = l.terrains; };
      q('[data-close]').onclick = closeSheet;
      q('#sSave').onclick = async () => {
        const date = q('#sDate').value, heure = q('#sHeure').value, ter = Math.round(Number(q('#sTer').value)), places = Math.round(Number(q('#sPlaces').value)) || null;
        if (!date || !heure) return toast('Choisissez la date et l’heure.');
        if (!(ter >= 1 && ter <= 40)) return toast('Entre 1 et 40 terrains.');
        const l = lieux.find(x => x.id === q('#sLieu').value);
        const s = { id: 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), date, heure, lieuId: l.id, lieuNom: l.nom, terrains: ter, places,
          sport: q('#sSport').value, mode: q('#sMode').value, cible: Number(q('#sCible').value), statut: 'offerte', joueurs: [], manches: [], creeLe: Date.now() };
        try {
          await Store.saveSoiree(s); S.soirees = [s].concat(S.soirees || []); closeSheet(); toast('Soirée offerte.');
          markStep('offre').catch(() => { });
          Push.notify({ title: groupName(), body: `${SPORTS[s.sport].nom} ${jourTxt(s.date)}, ${heureTxt(s.heure)} à ${s.lieuNom}. Vous venez ?`, url: '?soiree=' + s.id }).catch(() => { });
          ouvrirSoiree(s.id);
        } catch (e) { toast('Impossible : ' + e.message); }
      };
    });
  }

  // ---------------- Une soirée ----------------
  function vSoiree() {
    const s = S.soiree, vals = S.soireeVals || {};
    if (!s) return S.soiree === null ? '<p class="note">Cette soirée n’existe plus.</p>' : '<p class="note">Chargement…</p>';
    const r = regleSoiree(s), me = meId(), org = canOrganize(), rep = reponses(s, vals), mine = vals['v-' + me];
    const tete = `<div class="hero rq-tete"><span class="hero-k">${esc(SPORTS[s.sport].nom)} · ${s.mode === 'double' ? 'double' : 'simple'} · ${esc(texteRegle(r))}</span>
      <h1>${esc(jourTxt(s.date))}, ${esc(heureTxt(s.heure))}</h1><p>${esc(s.lieuNom || '')} · ${s.terrains} ${motLieu(r, s.terrains)}</p></div>`;
    if (s.statut === 'offerte') {
      const nb = rep.oui.length, complet = s.places && nb >= s.places;
      return tete + `
        ${me ? `<section class="card rq-rep"><b>${mine ? (mine.ok ? (rep.attente.includes(me) ? 'Vous êtes sur la liste d’attente.' : 'Vous venez. À bientôt !') : 'Vous ne venez pas.') : 'Vous venez ?'}</b>
          <div class="row"><button class="btn small ${mine && mine.ok ? '' : 'ghost'}" data-rep="1" type="button">${complet && !(mine && mine.ok) ? 'Liste d’attente' : 'Je viens'}</button><button class="btn small ${mine && !mine.ok ? '' : 'ghost'}" data-rep="0" type="button">Je ne viens pas</button></div></section>` : ''}
        <h3 class="home-h">Ils viennent (${rep.inscrits.length}${s.places ? ' / ' + s.places : ''})${complet ? ' · complet' : ''}</h3>
        <div class="chips">${rep.inscrits.map(id => `<span class="chip">${esc(nomJoueur(id))}</span>`).join('') || '<p class="note">Personne pour l’instant.</p>'}</div>
        ${rep.attente.length ? `<h3 class="home-h">Liste d’attente</h3><div class="chips">${rep.attente.map(id => `<span class="chip alt">${esc(nomJoueur(id))}</span>`).join('')}</div>` : ''}
        ${rep.non.length ? `<p class="note">Ne viennent pas : ${esc(rep.non.map(nomJoueur).join(', '))}</p>` : ''}
        ${org ? presentsHtml(s, rep.inscrits) + `<div class="row"><button class="btn" id="lancer" type="button">Lancer la soirée</button><button class="btn ghost small" id="sDel" type="button">${S.confirmDelS ? 'Confirmer : retirer la soirée' : 'Retirer la soirée'}</button></div>` : ''}`;
    }
    const cur = mancheCourante(s, vals), fini = cur < 0 || s.statut === 'terminée';
    const cls = classementSoiree(s, vals);
    const mHtml = i => { const m = s.manches[i]; return `<section class="card rq-manche ${i === cur ? 'now' : ''}"><h3>Manche ${i + 1}${i === cur ? ' · en cours' : ''}</h3>
        ${m.matchs.map((x, j) => matchHtml(s, i, j, x, vals[cleResultat(i, j)], i === cur && (org || x.a.concat(x.b).includes(me)))).join('')}
        ${m.repos.length ? `<p class="note rq-repos">Au repos : ${esc(m.repos.map(nomJoueur).join(', '))}</p>` : ''}</section>`; };
    return tete + `
      ${fini ? '<div class="warn rq-fin">La soirée est finie. Voici le classement.</div>' : ''}
      ${!fini ? mHtml(cur) : ''}
      ${!fini && cur + 1 < s.manches.length ? `<details class="rq-suite"><summary>Manches suivantes (${s.manches.length - cur - 1})</summary>${s.manches.slice(cur + 1).map((m, k) => mHtml(cur + 1 + k)).join('')}</details>` : ''}
      <h3 class="home-h">Classement de la soirée</h3>
      <table class="rq-cls"><thead><tr><th></th><th>Joueur</th><th>Gagnées</th><th>Jouées</th><th>Écart</th></tr></thead><tbody>
        ${cls.map((l, k) => `<tr class="${l.id === me ? 'moi' : ''}"><td>${k + 1}</td><td>${esc(nomJoueur(l.id))}</td><td>${l.gagnees}</td><td>${l.jouees}</td><td>${l.ecart > 0 ? '+' : ''}${l.ecart}</td></tr>`).join('')}</tbody></table>
      ${cur > 0 || fini ? `<details class="rq-suite"><summary>Manches jouées (${fini ? s.manches.length : cur})</summary>${s.manches.slice(0, fini ? s.manches.length : cur).map((m, i) => mHtml(i)).join('')}</details>` : ''}
      ${org ? `<h3 class="home-h">Organisateur</h3>${presentsHtml(s, s.joueurs)}
        <div class="row">${fini ? '' : '<button class="btn ghost small" id="plusManches" type="button">+ 2 manches</button>'}<button class="btn ghost small" id="terminer" type="button">${s.statut === 'terminée' ? 'Rouvrir la soirée' : 'Terminer la soirée'}</button></div>` : ''}`;
  }
  function matchHtml(s, i, j, x, res, saisie) {
    const r = regleSoiree(s), t = `${motLieu(r, 1)[0].toUpperCase() + motLieu(r, 1).slice(1)} ${x.terrain}`;
    const g = res ? (res.a > res.b ? 0 : 1) : -1;
    return `<div class="rq-match" data-m="${i}-${j}"><span class="rq-ter">${t}</span>
      <div class="rq-eq ${g === 0 ? 'gagne' : ''}">${esc(equipeTxt(x.a))}${res ? `<b>${res.a}</b>` : ''}</div>
      <div class="rq-eq ${g === 1 ? 'gagne' : ''}">${esc(equipeTxt(x.b))}${res ? `<b>${res.b}</b>` : ''}</div>
      ${saisie ? `<button class="btn small ${res ? 'ghost' : ''}" data-score="${i}-${j}" type="button">${res ? 'Corriger' : 'Entrer le pointage'}</button>` : ''}</div>`;
  }
  function presentsHtml(s, choisis) {
    const membres = (S.players || []).filter(p => !p.retired).sort(byName);
    return `<details class="rq-presents" ${s.statut === 'offerte' ? 'open' : ''}><summary>Présents (${choisis.length})</summary>
      <p class="note">${s.statut === 'offerte' ? 'Ceux qui ont dit « je viens » sont cochés. Cochez ou décochez à l’arrivée.' : 'Un retard ou un départ ? Cochez ou décochez : les manches suivantes se refont.'}</p>
      <div class="rq-chk">${membres.map(p => `<label class="check"><input type="checkbox" data-pres="${esc(p.id)}" ${choisis.includes(p.id) ? 'checked' : ''}> ${esc(p.name)}</label>`).join('')}</div></details>`;
  }
  function scoreSheet(i, j) {
    const s = S.soiree, x = s.manches[i].matchs[j], r = regleSoiree(s), old = (S.soireeVals || {})[cleResultat(i, j)] || {};
    openSheet(`<h3>Pointage · ${motLieu(r, 1)} ${x.terrain}</h3><p class="note">${esc(texteRegle(r))}.</p>
      <div class="rq-2"><label>${esc(equipeTxt(x.a))}<input id="pA" type="number" inputmode="numeric" min="0" max="99" value="${old.a != null ? old.a : ''}"></label>
        <label>${esc(equipeTxt(x.b))}<input id="pB" type="number" inputmode="numeric" min="0" max="99" value="${old.b != null ? old.b : ''}"></label></div>
      <p class="warn" id="pMsg" hidden></p>
      <div class="row"><button class="btn small" id="pSave" type="button">Enregistrer</button><button class="btn ghost small" data-close type="button">Annuler</button></div>`, sh => {
      const q = k => sh.querySelector(k); let force = false;
      q('[data-close]').onclick = closeSheet;
      q('#pSave').onclick = async () => {
        const v = verifierPointage(r, q('#pA').value, q('#pB').value);
        if (v.gagnant < 0) { q('#pMsg').hidden = false; q('#pMsg').textContent = v.message; return; }
        if (!v.ok && !force) { force = true; q('#pMsg').hidden = false; q('#pMsg').textContent = v.message + ' Touchez Enregistrer encore pour le garder.'; return; }
        try { await Store.setValeur(s.id, cleResultat(i, j), { a: Number(q('#pA').value), b: Number(q('#pB').value), par: meId() || '', at: Date.now() }); closeSheet(); }
        catch (e) { toast('Impossible : ' + e.message); }
      };
      setTimeout(() => q('#pA').focus(), 50);
    });
  }
  // Refait les manches à venir pour les présents ; celles commencées restent
  async function refaireManches(s, joueurs, nombre) {
    const vals = S.soireeVals || {}, cur = mancheCourante(s, vals);
    const garder = s.statut === 'offerte' ? 0 : cur < 0 ? s.manches.length : cur + 1;
    const r = regleSoiree(s);
    const total = nombre || Math.max(s.manches.length, garder + 1, manchesConseillees(joueurs.length, s.terrains, s.mode));
    s.joueurs = joueurs;
    s.manches = preparerManches({ joueurs, terrains: s.terrains, mode: r.modes.includes(s.mode) ? s.mode : r.mode, nombre: total, deja: s.manches.slice(0, garder), graine: s.id });
    S.soiree = await Store.saveSoiree(s);
  }
  function ouvrirSoiree(id) {
    if (S.unwatchSoiree) S.unwatchSoiree();
    S.soiree = undefined; S.soireeVals = {};
    const offS = Store.watchSoiree(id, s => { S.soiree = s; if (S.view === 'soiree') render(); });
    const offV = Store.watchPresence(id, v => { if (v) S.soireeVals = v; if (S.view === 'soiree') render(); });
    S.unwatchSoiree = () => { offS(); offV(); S.unwatchSoiree = null; };
    go('soiree', { soireeId: id });
  }
  document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-soiree]'); if (!t) return; e.preventDefault(); ouvrirSoiree(t.dataset.soiree); });

  Object.assign(bind, {
    home(v) { commonNav(v); setTimeout(maybeWelcome, 300); rememberCurrent(); },
    lieux(v) {
      const n = $('#lieuNew'); if (n) n.onclick = () => lieuSheet();
      v.querySelectorAll('[data-lieu]').forEach(b => b.onclick = () => { if (canOrganize()) lieuSheet((S.lieux || []).find(x => x.id === b.dataset.lieu)); });
    },
    soirees(v) { const n = $('#soireeNew'); if (n) n.onclick = soireeSheet; },
    soiree(v) {
      const s = S.soiree; if (!s) return;
      v.querySelectorAll('[data-rep]').forEach(b => b.onclick = async () => {
        try { await Store.setValeur(s.id, 'v-' + meId(), { ok: b.dataset.rep === '1', at: Date.now() }); } catch (e) { toast('Impossible : ' + e.message); }
      });
      v.querySelectorAll('[data-score]').forEach(b => b.onclick = () => { const [i, j] = b.dataset.score.split('-').map(Number); scoreSheet(i, j); });
      const coches = () => [...v.querySelectorAll('[data-pres]')].filter(c => c.checked).map(c => c.dataset.pres);
      v.querySelectorAll('[data-pres]').forEach(c => c.onchange = async () => {
        if (s.statut === 'offerte') return;   // avant le lancement : on coche librement, rien n'est calculé
        try { await refaireManches(s, coches()); toast('Manches suivantes refaites.'); } catch (e) { toast('Impossible : ' + e.message); }
      });
      const l = $('#lancer'); if (l) l.onclick = async () => {
        const j = coches(), r = regleSoiree(s), mode = r.modes.includes(s.mode) ? s.mode : r.mode;
        if (j.length < (mode === 'simple' ? 2 : 4)) return toast(`Il faut au moins ${mode === 'simple' ? 2 : 4} présents.`);
        s.statut = 'en cours';
        try { await refaireManches(s, j, manchesConseillees(j.length, s.terrains, mode)); markStep('partie').catch(() => { }); toast('C’est parti : manche 1 !'); }
        catch (e) { toast('Impossible : ' + e.message); }
      };
      const p = $('#plusManches'); if (p) p.onclick = async () => { try { await refaireManches(s, s.joueurs, s.manches.length + 2); } catch (e) { toast('Impossible : ' + e.message); } };
      const t = $('#terminer'); if (t) t.onclick = async () => { s.statut = s.statut === 'terminée' ? 'en cours' : 'terminée'; try { S.soiree = await Store.saveSoiree(s); S.soirees = null; } catch (e) { toast('Impossible : ' + e.message); } };
      const d = $('#sDel'); if (d) d.onclick = async () => {
        if (!S.confirmDelS) { S.confirmDelS = true; return render(); }
        S.confirmDelS = false;
        try { await Store.deleteSoiree(s.id); S.soirees = (S.soirees || []).filter(x => x.id !== s.id); go('soirees'); } catch (e) { toast('Impossible : ' + e.message); }
      };
    },
  });
