  // ---------------- Parrainage : le propriétaire partage son lien ; les groupes créés avec ce lien sont comptés ----------------
  function refLink(code) { return location.origin + location.pathname + '?ref=' + encodeURIComponent(code || Store.gid); }
  function referralCard() {
    if (Store.needLogin || !meId() || meId() !== ownerId()) return '';
    const mine = (S.groups || []).filter(g => g.ref === Store.gid), paid = mine.filter(g => planOf(g).paid && g.id !== 'pelland').length;
    return `<section class="card referral"><h3>Parrainez un autre groupe</h3>
      <p>Pour chaque groupe qui s’inscrit avec votre lien et passe au forfait Groupe, <b>vous obtenez 5 $ de rabais sur votre prochaine saison</b>. Les rabais s’additionnent.</p>
      <div class="ref-stats"><span><b>${mine.length}</b> groupe${mine.length > 1 ? 's' : ''} inscrit${mine.length > 1 ? 's' : ''}</span><span><b>${paid}</b> au forfait Groupe</span></div>
      <div class="row"><button class="btn small" data-refshare type="button">Partager mon lien</button><button class="btn ghost small" data-refcopy type="button">Copier</button></div></section>`;
  }
  document.addEventListener('click', async e => {
    const t = e.target.closest && e.target.closest('[data-refshare],[data-refcopy]'); if (!t) return;
    const url = refLink(), text = SPORT.parrainage(APP);
    if (t.hasAttribute('data-refshare') && navigator.share) { try { await navigator.share({ title: APP, text, url }); } catch (x) { } return; }
    try { await navigator.clipboard.writeText(text + ' ' + url); toast('Lien copié.'); } catch (x) { openSheet(`<h3>Votre lien</h3><p class="note">Copiez-le :</p><input type="text" readonly value="${esc(url)}" onclick="this.select()"><div class="sheet-actions"><button class="btn" data-close type="button">Fermer</button></div>`, sh => { sh.querySelector('[data-close]').onclick = closeSheet; }); }
  });
