  // ---------------- Offres de parties ----------------
  const fmtDate = ms => new Date(ms).toLocaleString('fr-CA', { weekday: 'short', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' }).replace(' h 00', ' h').replace(/(\d+):(\d+)/, '$1 h $2');
  const fmtDay = ms => new Date(ms).toLocaleDateString('fr-CA', { weekday: 'long', day: 'numeric', month: 'long' });
  const offreReps = o => Object.keys(o).filter(k => k.startsWith('rep_')).map(k => o[k]);
  function offresHtml() {
    const f = S.newOffre;
    const list = (S.offres || []).map(o => {
      const reps = offreReps(o), past = Date.now() > o.deadline;
      return `<div class="offre"><div class="offre-h"><b>${esc(o.course)}</b>${o.place ? `<span class="place">${esc(o.place)}</span>` : ''}<small>${past ? 'Réponses fermées' : 'Réponses avant le ' + esc(fmtDay(o.deadline))} · ${reps.length} réponse${reps.length > 1 ? 's' : ''}</small></div>
        ${o.dates.map(dt => { const yes = reps.filter(r => (r.dates || []).includes(dt)).map(r => r.name);
          return `<div class="offre-d"><div><b>${esc(fmtDate(dt))}</b><span>${yes.length ? esc(yes.join(', ')) : 'Personne pour l’instant'}</span>${yes.length ? `<span class="grp">${esc(groupsText(yes.length))}</span>` : ''}</div><span class="cnt ${yes.length >= 4 ? 'ok' : ''}">${yes.length}</span></div>${yes.length >= 3 && canOrganize() ? `<div class="row offre-acts"><button class="btn small" data-oauto="${esc(o.id)}|${dt}" type="button">Former les groupes</button><button class="btn ghost small" data-oquat="${esc(o.id)}|${dt}" type="button">Manuel</button></div>` : ''}`; }).join('')}
        ${canOrganize() ? '' : '<!--'}<div class="row"><button class="btn small" data-orem="${esc(o.id)}" type="button">Rappel</button><button class="btn ghost small" data-osms="${esc(o.id)}" type="button">Renvoyer le texto</button><button class="btn ghost small" data-odel="${esc(o.id)}" type="button">${S.confirmDelO === o.id ? 'Confirmer' : 'Retirer'}</button></div>${canOrganize() ? '' : '-->'}</div>`; }).join('');
    const form = f ? `<div class="offre-form">
        <label>Terrain<select id="oCourse">${S.courses.map(c => `<option value="${esc(c.name)}" ${c.name === f.course ? 'selected' : ''}>${esc(c.name)}${c.sim ? ' (simulateur)' : ''}</option>`).join('')}</select></label>
        <label>Lieu (facultatif)<input id="oPlace" type="text" value="${esc(f.place || '')}" placeholder="${SPORT.lieuExemple}"></label>
        <div class="lbl">Dates offertes</div>
        ${f.dates.map((d, i) => `<div class="row" style="flex-wrap:nowrap"><input type="datetime-local" data-od="${i}" value="${esc(d)}" style="flex:1;min-width:0"><button class="x" type="button" data-odx="${i}" aria-label="Retirer">×</button></div>`).join('')}
        <button class="btn ghost small" id="oAddDate" type="button">+ Ajouter une date</button>
        <label>Date butoir pour répondre<input type="date" id="oDeadline" value="${esc(f.deadline)}"></label>
        <div class="row"><button class="btn sms-btn" id="oSend" type="button">Enregistrer et texter les joueurs</button><button class="btn ghost small" id="oCancel" type="button">Annuler</button></div></div>`
      : canOrganize() ? `<button class="btn" id="oNew" type="button">Créer des parties</button>` : '<p class="note">Seuls le propriétaire et l’organisateur du groupe offrent des parties.</p>';
    return `<section class="card"><h2>Parties offertes</h2><p class="note">Proposez des dates : tous les joueurs reçoivent un texto et indiquent dans l’app les dates où ils sont disponibles, avant la date butoir.</p>${form}${list}</section>`;
  }
  // Rappels : à ceux qui n'ont pas répondu, ou aux joueurs disponibles pour une date
  function reminderSheet(o) {
    const me = L.norm(ls.get('pelland.me', '') || ''), reps = offreReps(o), answered = new Set(reps.map(r => L.norm(r.name)));
    const course = o.course.replace(/^Club de golf /i, '') + (o.place ? ' – ' + o.place : ''), link = `${location.origin + location.pathname}?offre=${o.id}`, past = Date.now() > o.deadline;
    const byNames = names => (S.players || []).filter(p => L.norm(p.name) !== me && names.has(L.norm(p.name)));
    const noAns = (S.players || []).filter(p => L.norm(p.name) !== me && !answered.has(L.norm(p.name)));
    const choices = [];
    if (!past) choices.push({ label: 'Ceux qui n’ont pas encore répondu', ps: noAns, text: `Rappel – ${groupName()} : tu n’as pas encore indiqué tes disponibilités pour les parties à ${course}. Réponds avant le ${fmtDay(o.deadline)} : ${link}` });
    if (!past) choices.push({ label: 'Tous les joueurs du groupe', ps: (S.players || []).filter(p => L.norm(p.name) !== me), text: `Rappel – ${groupName()} : parties offertes à ${course} : ${o.dates.map(fmtDate).join(', ')}. Indique tes disponibilités : ${link}` });
    o.dates.filter(dt => dt > Date.now() - 3600e3).forEach(dt => { const yes = new Set(reps.filter(r => (r.dates || []).includes(dt)).map(r => L.norm(r.name)));
      if (yes.size) choices.push({ label: `Joueurs du ${fmtDate(dt)}`, ps: byNames(yes), text: `Rappel – ${groupName()} : on joue ${fmtDate(dt)} à ${course}. À bientôt sur le terrain !` }); });
    const draw = (sh, sel) => {
      const c = sel != null ? choices[sel] : null;
      sh.innerHTML = `<h3>Rappel</h3>
        ${choices.length ? `<div class="list">${choices.map((x, i) => `<button class="item rem-opt ${sel === i ? 'on' : ''}" data-rc="${i}" type="button"><b>${esc(x.label)}</b><span>${x.ps.length} joueur${x.ps.length > 1 ? 's' : ''}${x.ps.length ? ' : ' + esc(x.ps.map(p => p.name.split(' ')[0]).join(', ')) : ''}</span></button>`).join('')}</div>` : '<p class="note">Aucun rappel à envoyer pour l’instant.</p>'}
        ${c ? `<label>Message<textarea id="rmMsg" rows="4">${esc(c.text)}</textarea></label>${c.ps.some(p => !p.phone) ? `<p class="warn" style="margin:6px 0">Pas de numéro pour ${esc(c.ps.filter(p => !p.phone).map(p => p.name).join(', '))}.</p>` : ''}` : ''}
        <div class="row"><button class="btn small" id="rmGo" type="button" ${c && c.ps.some(p => p.phone) ? '' : 'disabled'}>Envoyer le texto${c ? ` (${c.ps.filter(p => p.phone).length})` : ''}</button><button class="btn ghost small" data-close type="button">Annuler</button></div>`;
      sh.querySelectorAll('[data-rc]').forEach(bt => bt.onclick = () => draw(sh, +bt.dataset.rc));
      sh.querySelector('[data-close]').onclick = closeSheet;
      const go = sh.querySelector('#rmGo'); if (go) go.onclick = () => { if (!c) return; const txt = sh.querySelector('#rmMsg').value; closeSheet();
        Push.notify({ title: 'Rappel – ' + groupName(), body: txt.replace(/^Rappel – [^:]*: /, '').slice(0, 200), url: './?offre=' + o.id, tag: 'rappel-' + o.id, playerIds: c.ps.map(p => p.id) });
        openSms(c.ps.filter(p => p.phone).map(p => p.phone), txt); };
    };
    openSheet('', sh => draw(sh, choices.length === 1 ? 0 : null));
  }
  function offreSms(o) {
    const me = L.norm(ls.get('pelland.me', '') || '');
    const nums = (S.players || []).filter(p => p.phone && L.norm(p.name) !== me).map(p => p.phone);
    const missing = (S.players || []).filter(p => !p.phone && L.norm(p.name) !== me).map(p => p.name);
    const body = [`${groupName()} (${APP}) – parties offertes à ${o.course.replace(/^Club de golf /i, '')}${o.place ? ' – ' + o.place : ''} :`, ...o.dates.map(d => '• ' + fmtDate(d)),
      `Indique tes disponibilités avant le ${fmtDay(o.deadline)} : ${location.origin + location.pathname}?offre=${o.id}`].join('\n');
    if (missing.length) toast(`Pas de numéro pour ${missing.join(', ')}.`);
    openSms(nums, body);
  }
  function vOffre() {
    $('#barTitle').textContent = 'Disponibilités';
    const o = S.offre;
    if (o === undefined) { Store.getOffre(S.offreId).then(x => { S.offre = x; if (S.view === 'offre') render(); }); return '<p class="note">Chargement…</p>'; }
    if (!o) return '<section class="card"><h2>Offre introuvable</h2><p class="note">Elle a peut-être été retirée.</p></section>';
    const me = ls.get('pelland.me', '') || '', key = 'rep_' + presKey(me), mine = (o[key] || {}).dates || [], past = Date.now() > o.deadline;
    const sel = S.offreSel || (S.offreSel = mine.slice());
    return `<section class="card"><h2>${esc(o.course)}</h2>${o.place ? `<p class="note" style="margin-top:-6px">${esc(o.place)}</p>` : ''}
      <p class="note">${past ? 'La date butoir est passée : les réponses sont fermées.' : `Cochez les dates où vous êtes disponible, avant le <b>${esc(fmtDay(o.deadline))}</b>.`}</p>
      <div class="dispo">${o.dates.map(dt => `<button type="button" class="dispo-d" data-dispo="${dt}" aria-pressed="${sel.includes(dt)}" ${past ? 'disabled' : ''}><b>${sel.includes(dt) ? '✓' : ''}</b><span>${esc(fmtDate(dt))}</span></button>`).join('')}</div>
      <div class="row dispo-btns">${past ? '' : `<button class="btn" id="dispoSave" type="button">Enregistrer</button>`}<button class="btn ghost" id="dispoCancel" type="button">${past ? 'Retour' : 'Annuler'}</button></div>
      ${o[key] ? `<p class="note">Réponse enregistrée${sel.length ? '' : ' : aucune date'}.</p>` : ''}</section>`;
  }
  // Dates offertes (Parties à préparer) avec les joueurs qui se sont dits disponibles
  function offreDates() {
    const out = [];
    (S.offres || []).forEach(o => o.dates.forEach(dt => { if (dt < Date.now() - 864e5) return;
      const names = offreReps(o).filter(r => (r.dates || []).includes(dt)).sort((a, b) => (a.at || 0) - (b.at || 0)).map(r => r.name);
      out.push({ key: o.id + '|' + dt, course: o.course, label: `${o.course.replace(/^Club de golf /i, '')} – ${fmtDate(dt)}`, names }); }));
    return out.sort((a, b) => +a.key.split('|')[1] - +b.key.split('|')[1]);
  }
