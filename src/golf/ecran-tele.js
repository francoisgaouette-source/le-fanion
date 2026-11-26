  // ---------- Écran télé : classement plein écran, en direct, les classes défilent ----------
  function vCompTv() {
    const c = S.comp; if (!c) return '<p class="note">Chargement…</p>';
    $('#barTitle').textContent = c.name;
    let inner;
    if (c.format === 'ryder') inner = ryderBoardHtml(c, true);
    else if (c.format === 'tableau') { const { main, conso } = tbBrackets(c); inner = bracketHtml(c, main, 'Tableau principal', true) + (conso ? bracketHtml(c, conso, 'Consolation', true) : ''); }
    else if (eff(c) === 'match') inner = matchBoardHtml(c);
    else inner = boardHtml(c, null);
    return `<div class="tv"><div class="tv-top"><h1>${esc(c.name)}</h1><span>${esc(c.course.name)} · ${esc(dateLong(c.date))}</span><span class="tv-live">● En direct</span><button class="btn ghost small" data-tvquit type="button">Fermer</button></div><div class="tv-body">${inner}</div></div>`;
  }
