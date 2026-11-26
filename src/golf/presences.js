  // ---------------- Présences ----------------
  function myIndex(g) { const me = L.norm(ls.get('pelland.me', '') || ''); return g.players.findIndex(p => L.norm(p.name) === me); }
  function presenceHtml(g) {
    const pr = S.presence || {}, started = Object.values(g.scores || {}).some(r => (r || []).some(v => v != null));
    if (started || g.status === 'terminée') return '';
    const mi = myIndex(g), mine = mi >= 0 ? pr[presKey(g.players[mi].name)] : null;
    const order = isAlt(g) ? g.players.map((_, i) => i) : [...L.getTeams(g)[1], ...L.getTeams(g)[0]];
    const n = order.filter(i => (pr[presKey(g.players[i].name)] || {}).ok === true).length;
    return `<section class="card presence"><h2>Présences <small>${n}/${g.players.length} confirmés</small></h2>
      <div class="pres-list">${order.map(i => { const x = pr[presKey(g.players[i].name)];
        const st = !x ? ['?', 'En attente', 'wait'] : x.ok ? ['✓', 'Présent', 'yes'] : ['✗', 'Absent', 'no'];
        return `<div class="pres ${st[2]}"><b>${st[0]}</b><span class="${isAlt(g) ? '' : 'tc' + teamOf(g, i)}">${esc(g.players[i].name)}</span><small>${st[1]}</small></div>`; }).join('')}</div>
      ${mi >= 0 ? `<div class="row pres-btns"><button class="btn ${mine && mine.ok ? '' : 'ghost'}" data-pres="1" type="button">Je serai là ✓</button><button class="btn ghost ${mine && mine.ok === false ? 'on-no' : ''}" data-pres="0" type="button">Je ne pourrai pas</button></div>` : ''}
      ${isOwner() ? `<button class="btn sms-btn" data-confirmsms type="button" style="margin-top:10px">Texto aux joueurs pour confirmer</button>` : ''}
      ${S.presenceBlocked ? '<div class="warn">Les présences ne peuvent pas être enregistrées : vérifiez votre connexion, puis réessayez.</div>' : ''}</section>`;
  }
  // À la création d'une partie : texto aux joueurs pour confirmer leur présence
  function confirmText(g) {
    const { nums, missing } = playerNumbers(g); if (!nums.length) return;
    const T = isAlt(g) ? null : L.getTeams(g);
    const date = new Date(g.createdAt || Date.now()).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
    const body = [`Tu es inscrit à une partie (${gameName(g)}) – ${g.course.name.replace(/^Club de golf /i, '')}, ${date}.`,
      ...(T ? [`Bleus : ${T[1].map(i => g.players[i].name).join(', ')}`, `Rouges : ${T[0].map(i => g.players[i].name).join(', ')}`] : [`Le 9 points : ${g.players.map(p => p.name).join(', ')}`]),
      !T ? '' : g.stake ? `La game commence à ${fmt$(money(g.stake))}.` : '',
      `Confirme ta présence : ouvre ${inviteLink(g)} et touche « Je serai là ».`].filter(Boolean).join('\n');
    if (missing.length) toast(`Pas de numéro pour ${missing.join(', ')}.`);
    openSms(nums, body);
  }
  function playerNumbers(g) {
    const me = L.norm(ls.get('pelland.me', '') || ''), nums = [], missing = [];
    g.players.forEach(p => { if (L.norm(p.name) === me) return;
      const lib = (S.players || []).find(x => L.norm(x.name) === L.norm(p.name));
      if (lib && lib.phone) nums.push(lib.phone); else missing.push(p.name); });
    return { nums, missing };
  }
  // Textos : par le service Fanion (Twilio, via fanion.ai) quand il est en place ; sinon, Messages s'ouvre sur le téléphone
  // =====================================================================
  // Compétitions (inspiré des tournois de Golf Genius) :
  //   membre-membre en match play, Stableford ou coups ; membre-invité ; Texas scramble ; scramble à 4 ;
  //   Coupe Ryder (deux camps, sessions de matchs) ; tableau à élimination (têtes de série, consolation) ;
  //   plusieurs rondes (cumul) ; ordre du mérite de la saison ; équipes équilibrées A-B-C-D ou tirage ;
  //   classement plein écran (télé du chalet) ; cartes de pointage et affiches de voiturette à imprimer.
  // comps/<id> = { groupId, format, jeu?, name, date, courseId, course, tee, allowance, flights, teams:[{id, dep?, p:[{name,index}]}],
  //   rounds?:[{date, courseId, course, tee}], ryder?:{sides, sessions}, tableau?:{entrants, seeding, consolation, manual},
  //   scores:{ <équipe | équipe@ronde | match>: { <trou>: [scores] } } }
  // =====================================================================