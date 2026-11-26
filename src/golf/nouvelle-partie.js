  // ---------------- Nouvelle partie ----------------
  function newDraft() {
    return {
      courseId: (S.courses[0] || {}).id || '', mode: 'bas', responsable: 0, teamMode: 'auto', teams: null, stake: '', leadChangeValue: '', perPoint: '1', par3Value: '5', count: 4,
      players: [0, 1, 2, 3].map(() => ({ name: '', index: '', tee: 'II' }))
    };
  }
  // Ce qui manque avant de pouvoir créer la partie
  function validIndex(v) { const x = parseFloat(String(v).replace(',', '.')); return String(v).trim() !== '' && /^[-+]?\d+([.,]\d)?$/.test(String(v).trim()) && x >= -10 && x <= 54; }
  // 4 joueurs = la game à Pelland ; 3 joueurs = le 9 points ; 2 joueurs = un contre un (match play, Nassau, skins)
  const gamesFor = n => (n === 2 ? ['match', 'nassau', 'skins'] : n === 3 ? ['neuf', 'skins'] : ['pelland', 'bestball', 'nassau', 'vegas', 'wolf', 'sixes', 'skins'])
    .concat((S.jeux || []).filter(j => j.mode === 'equipes' ? n === 4 : true).map(j => 'perso:' + j.id));
  // Jeu maison choisi dans Nouvelle partie → objet « partie » minimal pour les textes de règles
  const jeuOf = key => (S.jeux || []).find(j => 'perso:' + j.id === key);
  const fakeG = key => key && key.startsWith('perso:') ? { format: 'perso', custom: jeuOf(key) || {}, players: [] } : { format: key, players: [] };
  const fmtLabel = key => key && key.startsWith('perso:') ? ((jeuOf(key) || {}).name || 'Jeu maison') : L.FORMATS[key];
  const gameName = g => L.formatOf(g) === 'perso' ? ((g.custom || {}).name || 'Jeu maison') : L.FORMATS[L.formatOf(g)];
  const filledIdx = d => d.players.map((p, i) => i).filter(i => String(d.players[i].name || '').trim());
  function syncCount(d) { const n = filledIdx(d).length; d.count = n === 2 ? 2 : n === 3 ? 3 : 4;
    // À 2 joueurs, le jeu par défaut devient le match play, avec un enjeu pour la partie (10 $)
    if (d.count === 2 && !gamesFor(2).includes(d.format)) { d.format = 'match'; if (!d.perPoint || d.perPoint === '1') d.perPoint = '10'; }
    return d.count; }
  // Partie à équipes de deux (formation des équipes à choisir) : seulement à 4 joueurs
  const teamGame = (key, n) => n === 4 && (key === 'pelland' || key === 'bestball' || key === 'nassau' || key === 'vegas' || ((jeuOf(key) || {}).mode === 'equipes'));
  function missingList(d) {
    const out = [], idx = filledIdx(d);
    if (useOffres(d) && !d.offre) return ['la date de la partie'];
    if (!S.courses.find(x => x.id === d.courseId) && !S.courses[0]) return ['un terrain (ajoutez-en un dans Terrains)'];
    if (idx.length < 2) d.players.forEach((p, i) => { if (i < 2 && !String(p.name || '').trim()) out.push(`le nom du joueur ${i + 1}`); });
    idx.forEach(i => { const p = d.players[i];
      if (!String(p.index).trim()) out.push(`l'index de ${p.name.trim()}`);
      else if (!validIndex(p.index)) out.push(`un index valide pour ${p.name.trim()} (ex. 12,4)`);
    });
    return out;
  }
  function draftPreview(d) {
    const c = S.courses.find(x => x.id === d.courseId);
    if (!c) return null;
    const ok = !missingList(d).length;
    if (!ok) return { c, ready: false };
    const ps = L.buildPlayers(c, filledIdx(d).map(i => d.players[i]).map(p => ({ name: p.name.trim(), index: parseFloat(String(p.index).replace(',', '.')), tee: p.tee })), d.mode);
    return { c, ready: true, ps };
  }
  // Conseil de handicap selon le jeu choisi (étape Handicap de Nouvelle partie)
  const pourJeu = f => { const n = fmtLabel(f) || ''; return 'Pour ' + (/^(La|Le|Les) /.test(n) ? n[0].toLowerCase() + n.slice(1) : 'le ' + n); };
  function hcpAdvice(d) {
    const f = d.format, n = d.count;
    if (f === 'match') return 'Pour le match play : en bas handicap, le meilleur joue à 0 et l’autre reçoit la différence de coups. C’est la façon habituelle.';
    if (f === 'nassau' && n === 2) return 'Pour le Nassau à deux : en bas handicap, le meilleur joue à 0 et l’autre reçoit la différence.';
    if (f === 'neuf') return 'Pour le 9 points : en bas handicap, le meilleur des trois joue à 0 et les deux autres reçoivent la différence.';
    if (f === 'skins') return 'Pour les skins : chacun joue contre tous ; le bas handicap garde les écarts de coups entre les joueurs.';
    if (f === 'wolf' || f === 'sixes') return `${pourJeu(f)} : les équipes changent en cours de partie ; le bas handicap garde les mêmes écarts de coups.`;
    if (teamGame(f, n)) return `${pourJeu(f)} : les coups se calculent par joueur, puis l’équipe compte ses scores nets.`;
    return 'Les coups de chacun se calculent à partir de son index et de son tertre.';
  }
  function vSetup() {
    $('#barTitle').textContent = 'Nouvelle partie';
    const d = S.draft || (S.draft = newDraft());
    while (d.players.length < 4) d.players.push({ name: '', index: '', tee: (d.players[0] || {}).tee || 'II' });
    syncCount(d);
    const games = gamesFor(d.count); if (!games.includes(d.format)) d.format = games[0];
    const teamsUsed = teamGame(d.format, d.count);
    let stepN = 5; const stepNo = () => ++stepN;   // étapes 6, 7, 8… numérotées selon le jeu choisi
    const od = d.offre ? offreDates().find(x => x.key === d.offre) : null;
    const fromOffre = od ? S.courses.find(x => x.name === od.course) : null;
    if (fromOffre) d.courseId = fromOffre.id;
    const c = S.courses.find(x => x.id === d.courseId) || S.courses[0];
    if (c && !c.tees.find(t => t.name === d.players[0].tee)) d.players.forEach(p => (p.tee = c.tees[0].name));
    const teeOpts = sel => (c ? c.tees : []).map(t => `<option value="${esc(t.name)}" ${t.name === sel ? 'selected' : ''}>${esc(t.name)}</option>`).join('');
    return `
      ${d.players.map((_, i) => `<datalist id="playerList${i}">${listOptions(d, i)}</datalist>`).join('')}
      <section class="card">
        <div class="step">1 · Terrain</div>
        ${fromOffre ? `<p class="fixed-course"><b>${esc(fromOffre.name)}</b><span class="note">Choisi dans Parties à préparer</span></p>` : !S.courses.length ? `<p class="note">Aucun terrain dans la banque pour l’instant.</p><button class="btn" data-go="courses" type="button">Ajouter un terrain</button>` : `<select id="course">${S.courses.map(x => `<option value="${esc(x.id)}" ${x.id === d.courseId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <p class="note">Le terrain n'est pas dans la liste ? Ajoutez-le d'abord dans <b>Terrains</b>, à l'accueil.</p>`}
      </section>
      <section class="card">
        <div class="step">2 à 5 · Joueurs, responsable, index, tertre</div>
        ${offreDates().length ? `<div class="seg src-seg"><button type="button" data-src="offre" aria-pressed="${useOffres(d)}"><b>Ceux qui ont répondu</b><small>À une date offerte</small></button><button type="button" data-src="libre" aria-pressed="${!useOffres(d)}"><b>Tous les joueurs</b><small>Partie libre</small></button></div>` : ''}
        ${useOffres(d) ? `<label>Choisir parmi ceux qui ont répondu pour cette partie<select id="offPick"><option value="">— La date de la partie —</option>${offreDates().map(x => `<option value="${x.key}" ${d.offre === x.key ? 'selected' : ''}>${esc(x.label)} (${x.names.length} dispo)</option>`).join('')}</select></label>
        ${d.offre ? (() => { const nm = (offreDates().find(x => x.key === d.offre) || { names: [] }).names; return `<p class="note">Disponibles : ${esc(nm.join(', ') || 'personne')}${nm.length ? `<br><b>${esc(groupsText(nm.length))}</b>` : ''}</p>${nm.length >= 3 ? `<div class="row grp-acts"><span class="note">Former les groupes :</span><button class="btn small" data-sgroups="varier" type="button">Varier les partenaires</button><button class="btn ghost small" data-sgroups="hasard" type="button">Au hasard</button><span class="note">ou choisissez les joueurs ci-dessous (manuel).</span></div>` : ''}`; })() : ''}` : ''}
        ${(S.quatuors || []).length ? `<label>Quatuor<select id="quatPick"><option value="">— Choisir un quatuor (facultatif) —</option>${S.quatuors.map(x => `<option value="${esc(x.id)}">${esc(x.name || x.players.join(', '))}</option>`).join('')}</select></label>` : ''}
        ${d.players.map((p, i) => `
          <div class="prow">
            <label>Joueur ${i + 1}${i === 2 ? ' <small class="opt">(vide : partie à 2, en match play)</small>' : i === 3 ? ' <small class="opt">(vide : partie à 3, le 9 points)</small>' : ''}${playerPicker(d, i)}</label>
            <label>Index<input id="pi${i}" type="text" inputmode="decimal" value="${esc(p.index)}" placeholder="" aria-label="Index de ${esc(p.name || 'joueur ' + (i + 1))}"></label>
            <label>Tertre<select id="pt${i}">${teeOpts(p.tee)}</select></label>
            <label class="resp"><input type="radio" name="resp" value="${i}" ${d.responsable === i ? 'checked' : ''}> Responsable de la partie</label>
          </div>`).join('')}
      </section>
      <section class="card">
        <div class="step">${stepNo()} · Jeu ${info('jeu-' + d.format)}</div>
        <div class="seg holes-seg">${[['18', '18 trous', '1-18'], ['front', 'Aller', '1-9'], ['back', 'Retour', '10-18']].map(([k, t, r]) => `<button type="button" data-holes="${k}" aria-pressed="${(d.holes || '18') === k}"><b>${t}</b><small>${r}</small></button>`).join('')}</div>
        <div class="games">${games.map(x => `<button type="button" data-game="${x}" aria-pressed="${d.format === x}">${esc(fmtLabel(x))}</button>`).join('')}</div>
        ${d.format === 'wolf' ? `<p class="note">Le loup tourne dans l’ordre des joueurs : joueur 1 au trou 1, joueur 2 au trou 2, etc.</p>` : ''}
        ${d.format === 'sixes' ? `<p class="note">Équipes : joueurs 1+2 contre 3+4 (trous 1 à 6), 1+3 contre 2+4 (7 à 12), 1+4 contre 2+3 (13 à 18) ; sur 9 trous, on change aux 3 trous.</p>` : ''}
      </section>
      ${!teamsUsed ? '' : `<section class="card">
        <div class="step">${stepNo()} · Équipes ${info('equipes')}</div>
        <p class="note step-for">${esc(pourJeu(d.format))} : deux équipes de deux, pour toute la partie.</p>
        <div class="seg">
          <button type="button" data-tmode="auto" aria-pressed="${d.teamMode === 'auto'}"><b>Meilleur + Pire</b><small>Les deux du milieu ensemble</small></button>
          <button type="button" data-tmode="manual" aria-pressed="${d.teamMode === 'manual'}"><b>Je choisis</b><small>Qui joue avec qui</small></button>
        </div>
        ${d.teamMode === 'manual' ? `<label>Partenaire de ${esc(d.players[0].name || 'joueur 1')}<select id="partner">${[1, 2, 3].map(i => `<option value="${i}" ${d.teams && d.teams[0].includes(i) ? 'selected' : ''}>${esc(d.players[i].name || 'Joueur ' + (i + 1))}</option>`).join('')}</select></label>` : ''}
      </section>`}
      <section class="card">
        <div class="step">${stepNo()} · Handicap ${info('handicap')}</div>
        <p class="note step-for">${esc(hcpAdvice(d))}</p>
        <div class="seg">
          <button type="button" data-mode="bas" aria-pressed="${d.mode === 'bas'}"><b>Bas handicap</b><small>Le plus bas joue à 0, les autres reçoivent la différence</small></button>
          <button type="button" data-mode="full" aria-pressed="${d.mode === 'full'}"><b>Full handicap</b><small>Chacun reçoit son handicap de parcours</small></button>
        </div>
      </section>
      <section class="card">
        <div class="step">${stepNo()} · Argent ${info(d.format === 'pelland' ? 'argent' : 'jeu-' + d.format)}</div>
        ${d.format !== 'pelland' ? `<div class="row" style="flex-wrap:nowrap"><label style="flex:1">${({ neuf: 'Par point', bestball: 'Par trou gagné', match: 'Pour la partie', nassau: 'Par pari', vegas: 'Par point', wolf: 'Par point', sixes: 'Par tranche gagnée', skins: 'Par skin' })[d.format] || 'Par point'}<span class="money-in"><input id="ppt" type="text" inputmode="decimal" placeholder="1" value="${esc(fmtIn(d.perPoint))}"><i>$</i></span></label><span style="flex:1"></span></div>
        <p class="note">${esc(ruleText(fakeG(d.format)))} ${esc(gainRule({ ...fakeG(d.format), perPoint: d.perPoint }))}.</p>` : `<div class="row" style="flex-wrap:nowrap">
          <label style="flex:1">La game commence à<span class="money-in"><input id="stake" type="text" inputmode="decimal" placeholder="0" value="${esc(fmtIn(d.stake))}"><i>$</i></span></label>
          <label style="flex:1">À chaque revirement<span class="money-in"><input id="lcv" type="text" inputmode="decimal" placeholder="0" value="${esc(fmtIn(d.leadChangeValue))}"><i>$</i></span></label>
        </div>
        <div class="row" style="flex-wrap:nowrap">
          <label style="flex:1">Par point net<span class="money-in"><input id="ppt" type="text" inputmode="decimal" placeholder="1" value="${esc(fmtIn(d.perPoint))}"><i>$</i></span></label>
          <label style="flex:1">Chaque normale 3<span class="money-in"><input id="p3v" type="text" inputmode="decimal" placeholder="5" value="${esc(fmtIn(d.par3Value))}"><i>$</i></span></label>
        </div>`}
      </section>
      <section class="card">
        <div class="step">${stepNo()} · ${teamsUsed ? 'Coups et équipes' : 'Coups'}</div>
        <div id="pv" class="preview">${previewHtml(d)}</div>
        <p class="note" id="missingNote">${missingList(d).length ? 'Il manque ' + esc(missingList(d).join(', ')) + '.' : ''}</p>
        <button class="btn" id="create" type="button" ${missingList(d).length ? 'disabled' : ''}>Créer la carte de pointage</button>
      </section>`;
  }
  // Noms de la bibliothèque pas encore choisis dans les autres cases
  // Menu déroulant des joueurs de la bibliothèque (sans ceux déjà choisis) + « Autre… » pour taper un nom
  // Nouvelle partie : à partir des réponses aux dates offertes, ou partie libre avec tous les joueurs
  const useOffres = d => offreDates().length > 0 && d.src !== 'libre';
  function playerPicker(d, i) {
    const p = d.players[i];
    const inLib = S.players.some(x => L.norm(x.name) === L.norm(p.name || ''));
    const needDate = useOffres(d), custom = !S.players.length;
    const taken = d.players.map((q, j) => j !== i ? L.norm(q.name || '') : '').filter(Boolean);
    const dispo = d.offre ? ((offreDates().find(x => x.key === d.offre) || {}).names || []).map(L.norm) : null;
    if (needDate && !d.offre) return `<select id="ps${i}" disabled><option>— Choisissez d’abord la date —</option></select>`;
    const opts = S.players.filter(x => !taken.includes(L.norm(x.name)) && (!dispo || dispo.includes(L.norm(x.name))));
    void inLib;
    const sel = S.players.length ? `<select id="ps${i}"><option value="">— Choisir —</option>${opts.map(x => `<option value="${esc(x.name)}" ${!custom && L.norm(x.name) === L.norm(p.name || '') ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : '';
    const inp = custom ? `<input id="pn${i}" type="text" value="${esc(p.name)}" placeholder="Prénom et nom" autocapitalize="words" ${S.players.length ? 'style="margin-top:6px"' : ''}>` : '';
    return sel + inp;
  }
  function listOptions(d, i) {
    const taken = d.players.map((p, j) => j !== i ? L.norm(p.name || '') : '').filter(Boolean);
    return S.players.filter(p => !taken.includes(L.norm(p.name))).map(p => `<option value="${esc(p.name)}"></option>`).join('');
  }
  function money(v) { const x = parseFloat(String(v || '').replace(',', '.').replace(/[^0-9.]/g, '')); return isNaN(x) ? 0 : x; }
  function fmtIn(v) { if (String(v || '').trim() === '') return ''; return money(v).toLocaleString('fr-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  // 15 $ ; les cents seulement s'il y en a (2,50 $)
  const fmt$ = x => { const n = Number(x || 0); const d = Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2; return n.toLocaleString('fr-CA', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' $'; };
  // « 11 coups : 1 2 3 4 5 7 8 9 10 12 14 » (un chiffre en double = 2 coups sur ce trou)
  function strokeHoles(g, p) {
    if (!p.strokes) return 'Aucun coup';
    const list = [];
    for (let h = 1; h <= 18; h++) { const k = L.strokesOnHole(p.strokes, g.course.holes[h - 1].si); if (k > 0) list.push(k > 1 ? `${h}×${k}` : String(h)); else if (k < 0) list.push(`${h}(−)`); }
    return `<b>${Math.abs(p.strokes)} ${BALL}${p.strokes < 0 ? ' à redonner' : ''}</b> : ${list.join('\u00a0- ')}`;
  }
  function draftTeams(d, ps) { return d.teamMode === 'manual' && d.teams ? L.orderTeams(ps, d.teams) : L.makeTeams(ps); }
  function teamQuestion(d, ps) {
    const t = L.makeTeams(ps), n = i => ps[i].name;
    return `Pour les équipes, le meilleur avec le moins bon, donc ${n(t[0][0])} et ${n(t[0][1])} chez les Rouges, ${n(t[1][0])} et ${n(t[1][1])} chez les Bleus ? Dites oui, ou dites qui joue avec qui.`;
  }
  function previewHtml(d) {
    const pv = draftPreview(d);
    if (!pv || !pv.ready) return `<p class="note">Entrez au moins deux prénoms et leur index pour voir les coups${d.count === 4 ? ' et les équipes' : ''}.</p>`;
    return `<table><thead><tr><th>Joueur</th><th>Tertre</th><th style="text-align:right">Index</th><th style="text-align:right">Hcp</th><th style="text-align:right">Coups</th></tr></thead><tbody>
      ${pv.ps.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.tee)}</td><td class="n">${String(p.index).replace('.', ',')}</td><td class="n">${p.courseHandicap}</td><td class="n"><b>${p.strokes}</b></td></tr>`).join('')}
      </tbody></table>${!teamGame(d.format, d.count) ? '' : d.teamMode ? teamsHtml(pv.ps, draftTeams(d, pv.ps)) : '<p class="note">Choisissez la formation des équipes plus haut, à l\'étape Équipes.</p>'}<p class="note">${d.mode === 'full' ? '<b>Coups</b> : chaque joueur reçoit son handicap de parcours (Hcp).' : '<b>Coups</b> = Hcp du joueur − Hcp le plus bas du groupe. Le meilleur joue à 0.'}${coupsCalc(pv.ps, d.mode)} Les coups se placent d’abord sur les trous les plus difficiles : 7 coups, 1 par trou, pour des trous de difficulté 1 à 7. Au-delà de 18 coups, on recommence : un 2<sup>e</sup> coup sur les trous les plus difficiles.</p>`;
  }

  // « Claude : 12 − 7 = 5 coups (trous de difficulté 1 à 5) »
  function coupsCalc(ps, mode) {
    const lo = Math.min(...ps.map(p => p.courseHandicap));
    return '<span class="coups-calc">' + ps.map(p => `<span><b>${esc(p.name)}</b> : ${mode === 'full' ? `Hcp ${p.courseHandicap}` : `${p.courseHandicap} − ${lo}`} = <b>${p.strokes} coup${Math.abs(p.strokes) > 1 ? 's' : ''}</b></span>`).join('') + '</span>';
  }
  const teamOf = (g, i) => L.getTeams(g).findIndex(x => x.includes(i));
  // Résumé : Bleus à gauche, Rouges à droite ; nom, index, score ; points et argent de l'équipe.
  function summaryHtml(g, tots, p3) {
    const T = L.getTeams(g), pts = L.teamPoints(g).tot, money = p3.money;
    const fmt = n => n === 0 ? 'E' : (n > 0 ? '+' + n : '−' + (-n));
    const cell = pi => { const p = g.players[pi], t = tots[pi]; return `<div class="sm-p"><div class="sm-n">${esc(p.name)}${g.responsable === pi ? ' ★' : ''}</div><div class="sm-i">Index ${String(p.index).replace('.', ',')}</div><div class="sm-s">${t.played ? t.gross : '–'}</div><div class="sm-i">${t.played ? `net ${t.net} (${fmt(t.netToPar)})` : '&nbsp;'}</div></div>`; };
    return `<section class="summary">${[1, 0].map(k => `<div class="sm-team t${k}">
        <div class="sm-players">${T[k].map(cell).join('')}</div>
        <div class="sm-foot"><div><b>${pts[k]}</b> point${pts[k] > 1 ? 's' : ''}</div><div><b>${money[k]} $</b></div></div>
      </div>`).join('')}</section>`;
  }
  function teamsHtml(players, teams, pts, money) {
    const lead = pts && pts[0] !== pts[1] ? (pts[0] > pts[1] ? 0 : 1) : -1;
    return `<div class="teams">${teams.map((t, k) => `<div class="team t${k} ${lead === k ? 'lead' : ''}"><span class="step tn">${L.TEAMS[k]}</span><b>${t.map(i => esc(players[i].name)).join(' et ')}</b>${pts ? `<span class="tp num">${pts[k]} <small>pts</small>${money ? ` <small class="money">· ${money[k]} $</small>` : ''}</span>` : ''}<span class="note">index ${t.map(i => String(players[i].index).replace('.', ',')).join(' et ')}</span></div>`).join('')}</div>`;
  }

  // Créer une partie : d'abord le type, partie normale ou compétition
  function typePartieSheet() {
    openSheet(`<h3>Quel type de partie ?</h3>
      <div class="type-partie">
        <button class="type-choix" data-tp="normale" type="button"><span aria-hidden="true">⛳</span><span><b>Partie normale</b><small>Une partie entre amis : terrain, joueurs, jeu (Nassau, skins, Vegas, match…) et montants.</small></span></button>
        <button class="type-choix" data-tp="comp" type="button"><span aria-hidden="true">🏆</span><span><b>Compétition</b><small>Un tournoi avec classement : match play, Texas scramble, Stableford… avec équipes et handicaps.</small></span></button>
      </div>
      <button class="btn ghost" data-close type="button">Annuler</button>`, sh => {
      sh.querySelector('[data-close]').onclick = closeSheet;
      sh.querySelectorAll('[data-tp]').forEach(b => b.onclick = () => { closeSheet(); if (b.dataset.tp === 'normale') go('setup'); else go('comps', { compLive: false }); });
    });
  }
