  // ---------------- Le Caddie : l'agent qui répond aux questions (API Claude, par le serveur Fanion) ----------------
  const CADDIE_API = MARQUE.api + '/api/caddie';
  const SCREENS = SPORT.ecrans;
  let caddieReady = null;
  async function caddieStatus() {
    if (caddieReady !== null) return caddieReady;
    try { const r = await fetch(CADDIE_API + '/status'); caddieReady = !!(await r.json()).ready; } catch (e) { caddieReady = false; }
    return caddieReady;
  }
  function caddieMsg(m) {
    let t = String(m.content || ''), go = null;
    t = t.replace(/\[\[ecran:([a-z]+)\]\]/g, (x, k) => { if (SCREENS[k]) go = k; return ''; }).trim();
    const html = esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
    return `<div class="cad-msg ${m.role === 'assistant' ? 'bot' : 'me'}">${html}${go && m.role === 'assistant' ? `<button class="btn small cad-go" data-cadgo="${go}" type="button">Aller à : ${SCREENS[go]}</button>` : ''}</div>`;
  }
  async function openCaddie() {
    S.caddie = S.caddie || [{ role: 'assistant', content: `Bonjour${firstName(ls.get('pelland.me', '')) ? ' ' + firstName(ls.get('pelland.me', '')) : ''} ! Moi, c’est ${MARQUE.personnage}, ${MARQUE.role}. ${SPORT.leoAccueil}` }];
    const ready = Store.mode === 'cloud' && await caddieStatus();
    const draw = sh => {
      sh.innerHTML = `<div class="cad-id"><span class="cad-av" aria-hidden="true">${window.CaddieGuide ? CaddieGuide.avatar() : ''}</span><div><h3>${MARQUE.personnage}</h3><p class="note">${MARQUE.roleMaj}. Posez votre question sur l’app.</p></div></div>
        <div class="cad-log" id="cadLog">${S.caddie.map(caddieMsg).join('')}${S.caddieBusy ? '<div class="cad-msg bot busy">…</div>' : ''}</div>
        ${ready ? `<form class="cad-form" id="cadForm"><input id="cadIn" type="text" placeholder="Votre question" autocomplete="off" ${S.caddieBusy ? 'disabled' : ''}><button class="btn small" type="submit" ${S.caddieBusy ? 'disabled' : ''}>Envoyer</button></form>
          ${S.caddie.length < 2 ? `<div class="cad-sugg">${SPORT.questionsLeo.map(q => `<button class="chip" data-cadq="${esc(q)}" type="button">${esc(q)}</button>`).join('')}</div>` : ''}`
        : '<p class="note">' + MARQUE.personnage + ' arrive bientôt. En attendant, écrivez-nous : nous répondons rapidement.</p>'}
        ${window.CaddieGuide && !Store.needLogin ? '<p class="note cad-visite"><button class="linkbtn" data-leovisite type="button">Revoir la visite avec ' + MARQUE.personnage + '</button> · <button class="linkbtn" data-idee type="button">Proposer une idée à l’équipe</button></p>' : ''}
        <div class="sheet-actions"><a class="btn ghost" href="${caddieMail()}">Écrire à l’équipe</a><button class="btn ghost" data-close type="button">Fermer</button></div>`;
      sh.querySelector('[data-close]').onclick = closeSheet;
      sh.querySelectorAll('[data-cadgo]').forEach(b => b.onclick = () => { closeSheet(); go(b.dataset.cadgo); });
      sh.querySelectorAll('[data-cadq]').forEach(b => b.onclick = () => ask(b.dataset.cadq, sh));
      const vis = sh.querySelector('[data-leovisite]'); if (vis) vis.onclick = () => { closeSheet(); setTimeout(leoVisite, 200); };
      const f = sh.querySelector('#cadForm'); if (f) f.onsubmit = e => { e.preventDefault(); const v = sh.querySelector('#cadIn').value.trim(); if (v) ask(v, sh); };
      const log = sh.querySelector('#cadLog'); if (log) log.scrollTop = log.scrollHeight;
      const i = sh.querySelector('#cadIn'); if (i && !S.caddieBusy) setTimeout(() => i.focus(), 50);
    };
    const ask = async (q, sh) => {
      S.caddie.push({ role: 'user', content: q }); S.caddieBusy = true; draw(sh);
      try {
        const tok = await Store.token();
        const r = await fetch(CADDIE_API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok }, body: JSON.stringify({ messages: S.caddie.slice(1) }) });
        const d = await r.json().catch(() => ({}));
        S.caddie.push({ role: 'assistant', content: r.ok && d.text ? d.text : (d.error || 'Je n’ai pas pu répondre.') + ' Vous pouvez écrire à l’équipe avec le bouton ci-dessous.' });
      } catch (e) { S.caddie.push({ role: 'assistant', content: 'Pas de réseau pour l’instant. Réessayez dans un moment.' }); }
      S.caddieBusy = false; if (!$('#sheetWrap').hidden) draw(sh);
    };
    openSheet('', sh => draw(sh));
  }
  function caddieMail() {
    const conv = (S.caddie || []).slice(1).map(m => (m.role === 'user' ? 'Moi : ' : MARQUE.personnage + ' : ') + m.content.replace(/\[\[ecran:[a-z]+\]\]/g, '')).join('\n\n');
    const body = `Groupe : ${groupName()}\nJoueur : ${ls.get('pelland.me', '') || ''}\n\n${conv ? 'Ma conversation avec ' + MARQUE.personnage + ', ' + MARQUE.leRole + ' :\n\n' + conv + '\n\n' : ''}Ma question :\n`;
    return 'mailto:' + MARQUE.courriel + '?subject=' + encodeURIComponent(APP + ' – question') + '&body=' + encodeURIComponent(body.slice(0, 1800));
  }
  document.addEventListener('click', e => { const t = e.target.closest && e.target.closest('[data-caddie]'); if (t) { e.preventDefault(); openCaddie(); } });
