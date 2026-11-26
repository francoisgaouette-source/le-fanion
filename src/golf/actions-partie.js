
  // Invitation : lien direct vers la partie, envoyé avec le menu Partager de l'iPhone
  function inviteLink(g) { return location.origin + location.pathname + '?partie=' + encodeURIComponent(g.id); } // sans « cadre »
  async function invitePlayers(g) {
    const url = inviteLink(g);
    const others = g.players.filter((p, i) => i !== g.responsable).map(p => p.name.split(' ')[0]).join(', ');
    const text = `Salut ${others} ! Suis la partie en direct (${g.course.name.replace(/^Club de golf /i, '')}) : `;
    if (navigator.share) {
      try { await navigator.share({ title: APP, text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    openSheet(`<h3>Inviter les joueurs</h3>
      <p class="note">Envoyez ce lien aux autres joueurs. Il ouvre directement la partie sur leur iPhone.</p>
      <input id="invUrl" type="text" readonly value="${esc(url)}">
      <div class="row"><button class="btn small" id="invCopy" type="button">Copier le lien</button>
      <a class="btn ghost small" style="display:grid;place-items:center;text-decoration:none" href="sms:&body=${encodeURIComponent(text + url)}">Texto</a>
      <button class="btn ghost small" data-close type="button">Fermer</button></div>
      <p class="note">Code de la partie : <b class="num" style="font-size:20px;letter-spacing:.15em">${esc(g.id)}</b></p>`, sh => {
      sh.querySelector('#invCopy').onclick = async () => { try { await navigator.clipboard.writeText(url); toast('Lien copié.'); } catch (e) { const i = sh.querySelector('#invUrl'); i.select(); toast('Lien sélectionné : copiez-le.'); } };
      sh.querySelector('[data-close]').onclick = closeSheet;
    });
  }
  async function removeGame(id, g) {
    // une partie créée par un autre membre (ou avant la connexion par téléphone) : on en devient responsable, puis on l'efface
    if (g && g.ownerUid !== Store.uid) { const ng = JSON.parse(JSON.stringify(g)); ng.ownerUid = Store.uid; await Store.saveGame(ng); }
    await Store.deleteGame(id);
    if (ls.get('pelland.lastGame', null) === id) { ls.set('pelland.lastGame', null); ls.set('pelland.lastGameInfo', null); }
  }
  function openGame(id) {
    if (S.unwatch) S.unwatch();
    S.undo = [];
    S.view = 'game'; S.game = null; S.presence = {}; render();
    if (S.unwatchPres) S.unwatchPres();
    S.unwatchPres = Store.watchPresence(id, p => { S.presenceBlocked = p === null; S.presence = p || {}; if (S.view === 'game' && S.game) render(); });
    let first = true;
    S.unwatch = Store.watchGame(id, g => {
      const keepHole = S.game && !isOwner() ? S.game.currentHole : null;
      S.game = g; if (keepHole && !first) { /* les joueurs suivent le trou du responsable */ }
      first = false; ls.set('pelland.lastGame', id); ls.set('pelland.lastGameInfo', { id, createdAt: g.createdAt, course: g.course.name, players: g.players.map(p => p.name), hole: g.currentHole || 1 }); render();
    });
    setTimeout(() => { if (S.view === 'game' && !S.game) { $('#view').innerHTML = `<section class="card"><h2>Partie ${esc(id)} introuvable</h2><p class="note">Vérifiez le code avec le responsable.</p></section>`; } }, 6000);
  }

  // Applique des actions (responsable seulement) et enregistre.
  async function commit(actions, speak = true) {
    if (!isOwner()) return;
    const undo = actions.find(a => a.type === 'undo');
    let next, say;
    if (undo) {
      if (!S.undo.length) { say = 'Rien à annuler.'; setReply(say); speak && Voice.say(say); return; }
      next = S.undo.pop(); say = 'Dernière action annulée.';
    } else {
      S.undo.push(JSON.parse(JSON.stringify(S.game))); if (S.undo.length > 40) S.undo.shift();
      const r = L.apply(S.game, actions); next = r.game; say = r.say;
    }
    S.game = next;
    // message court : affiché en haut de la carte du trou, sur le dernier trou enregistré (pas en bulle par-dessus)
    const sc = actions.find(a => a.type === 'scores' || a.type === 'skin');
    if (sc && !undo && isAlt(next)) {
      const r = L.altHoles(next)[sc.hole];
      say = r ? `Trou ${sc.hole} · ${r.desc}` : `Trou ${sc.hole} enregistré`;
    } else if (sc && !undo) {
      const hh = sc.hole, parts = [];
      const nt = L.holeNetText(next, hh); if (nt) parts.push(`Trou ${hh} · ${nt}`); else parts.push(`Trou ${hh} enregistré`);
      if (L.cabaneTeam(next, hh) != null) parts.push('Cabane !');
      const p3 = L.describePar3(next, hh); if (p3) parts.push(p3.replace(/\.$/, ''));
      parts.push(L.totalText(next).replace(/\.$/, ''));
      say = parts.join(' · ');
    }
    const pr = isAlt(next) ? null : L.nextPrompt(next);
    S.pending = pr;
    if (sc && !undo) S.lastSaved = { gid: next.id, hole: sc.hole, text: say };
    render();
    if (!(sc && !undo)) setReply(say);
    if (speak) Voice.say(say);
    try { await Store.saveGame(next); } catch (e) { toast('Non enregistré : ' + e.message); }
  }

  // Traite une phrase (voix ou texte)
  function levenshtein(a, b) {
    const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) { const cur = [i]; for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; }
    return prev[n];
  }
  function handleSetup(text) {
    const d = S.draft || (S.draft = newDraft());
    const c = S.courses.find(x => x.id === d.courseId) || S.courses[0];
    setHeard('« ' + text + ' »');
    // terrain : « on joue au Pinegrove », « terrain Pinegrove »
    const nt = L.norm(text);
    const GENERIC = /^(club|golf|country|de|du|des|la|le|les|et|centre|parcours|terrain)$/;
    const words = nt.split(' ');
    const compact = nt.replace(/ /g, '');
    const hit = x => L.norm(x.name).split(' ').filter(w => w.length > 3 && !GENERIC.test(w))
      .some(w => nt.includes(w) || (w.length >= 6 && compact.includes(w)) || words.some(v => v.length >= 5 && L.norm(v) !== '' && levenshtein(v, w) <= 1));
    const course = S.courses.find(hit);
    let extra = '';
    if (course) { if (course.id !== d.courseId) d.courseId = course.id; extra = `Terrain : ${course.name}. `; }
    else if (/\b(terrain|on joue (au|a)|golf)\b/.test(nt)) {
      const r0 = `Je ne trouve pas ce terrain. Terrains disponibles : ${S.courses.map(x => x.name).join(', ')}. Pour un nouveau terrain, ajoutez-le d'abord dans Terrains, à l'accueil.`;
      setReply(r0); Voice.say(r0); return;
    }
    let rest = text;
    if (course) {
      const cw = L.norm(course.name).split(' ').filter(w => w.length > 3 && !GENERIC.test(w));
      cw.forEach(w => { rest = rest.replace(new RegExp(w.split('').join('[\\s-]*'), 'ig'), ' '); });
      rest = rest.split(/\s+/).filter(tok => { const n = L.norm(tok); return !n || !cw.some(w => n === w || (n.length >= 5 && levenshtein(n, w) <= 1)); }).join(' ')
        .replace(/\b(on joue|terrain|au club|club de golf|au golf)\b/gi, ' ');
    }
    const r = L.parseSetup(rest, d, course || c, S.players.map(p => p.name));
    if (r.create) { $('#create').onclick(); return; }
    S.draft = Object.assign(d, r.draft);
    render();
    let reply = extra + (r.understood ? r.said : (extra ? '' : 'Je n\'ai pas compris. Exemple : « François 12,4, Marc 8,1 ».'));
    if (r.understood || extra) {
      if (r.missing.length) reply += ` Il manque ${r.missing.slice(0, 2).join(' et ')}.`;
      else if (!S.draft.teamMode && /qui joue avec qui/.test(r.said)) { /* on attend la réponse */ }
      else if (!S.draft.teamMode) { const pv = draftPreview(S.draft); reply += ' ' + teamQuestion(S.draft, pv.ps); }
      else reply += ' Tout est prêt. Dites « Créer la partie ».';
    }
    setReply(reply); Voice.say(reply);
  }

  function handle(text) {
    if (S.view === 'setup') return handleSetup(text);
    if (!S.game) return;
    setHeard('« ' + text + ' »');
    // Réponse « oui » / « non » à la question en attente (press, reroll, skin)
    const pend = isOwner() && L.nextPrompt(S.game);
    if (pend) {
      const n = L.norm(text);
      const yes = /^(oui|ouais|ouai|yes|ok|exact|oui oui|affirmatif)\b/.test(n);
      const no = /^(non|nan|no|pas|aucun|aucune|negatif)\b/.test(n) && !/\bpas de (skin|press|reroll)\b/.test(n) || /^non\b/.test(n);
      const who = n.split(' ').map(w => L.matchPlayer(w, S.game.players.map(p => p.name))).filter(i => i >= 0);
      // « équipe 2 » ou un prénom en réponse à la question de la skin
      if (pend.type === 'skin' && !yes && !no && !/\b(qui|combien|quel|quelle|ou en)\b/.test(n)) {
        const tt = /^(?:skin\s+)?(?:pour\s+)?(?:les\s+|l\s+)?(?:equipe\s+)?(1|un|une|2|deux|rouges?|bleu(?:e|s|es)?)$/.test(n) ? L.teamFromText(/^\D*(1|un|une|2|deux)$/.test(n) ? 'equipe ' + n.split(' ').pop() : n) : null;
        const team = tt != null ? tt : (who.length === 1 && !/\d/.test(n)) ? L.getTeams(S.game).findIndex(x => x.includes(who[0])) : null;
        if (team != null) return commit([{ type: 'skin', hole: pend.hole, team, player: tt == null && who.length === 1 ? who[0] : null }]);
      }
      if (yes || no) {
        if (pend.type === 'press') return commit(yes ? (who.length ? who : [null]).map(p => ({ type: 'press', hole: pend.hole, player: p })) : [{ type: 'nopress', hole: pend.hole }]);
        if (pend.type === 'reroll') return commit([{ type: 'reroll', hole: pend.hole, on: !!yes }]);
        if (pend.type === 'skin') {
          if (no) return commit([{ type: 'skin', hole: pend.hole, team: -1 }]);
          const tt = L.teamFromText(n);
          const team = tt != null ? tt : who.length ? L.getTeams(S.game).findIndex(x => x.includes(who[0])) : null;
          if (team == null) { const q = 'Quelle équipe ? Rouges ou Bleus ?'; setReply(q); Voice.say(q); return; }
          return commit([{ type: 'skin', hole: pend.hole, team }]);
        }
      }
    }
    const r = L.parse(text, S.game, { isResponsable: isOwner() });
    if (r.kind === 'command') return commit(r.actions);
    let reply;
    if (r.kind === 'question') reply = L.answer(r.q, S.game);
    else reply = isOwner() ? 'Je n\'ai pas compris. Exemple : « Trou 3, Marc 4, Luc 5 ».' : 'Je n\'ai pas compris. Exemple : « Qui a des coups au 7 ? »';
    setReply(reply); Voice.say(reply);
  }
