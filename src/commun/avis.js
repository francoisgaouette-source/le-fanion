  // ---------------- Avis des joueurs : demandés après une partie terminée ; publiés sur fanion.ai si le joueur accepte et après approbation ----------------
  const AVIS_K = 'fanion.avis.etat';   // { given: true } ou { later: date }
  function avisCard(where) {
    if (Store.needLogin || !meId()) return '';
    const st = ls.get(AVIS_K, {}) || {};
    if (where === 'game') ls.set(AVIS_K, { ...st, eligible: 1 });
    if (st.given || (st.later && Date.now() - st.later < 30 * 864e5)) return '';
    if (where === 'home' && !st.eligible) return '';
    return `<section class="card avis-card"><div class="av-stars" aria-hidden="true">★★★★★</div>
      <h3>${MARQUE.nomMaj} vous plaît ?</h3><p>Dites-le en une phrase. Avec votre accord, votre commentaire pourra paraître sur ${MARQUE.domaine} pour aider d’autres groupes à se lancer.</p>
      <div class="row"><button class="btn small" data-avis type="button">Donner mon avis</button><button class="btn ghost small" data-avislater type="button">Plus tard</button></div></section>`;
  }
  const shortName = n => { const w = String(n || '').trim().split(/\s+/); return (w[0] || '') + (w.length > 1 ? ' ' + w[w.length - 1][0].toUpperCase() + '.' : ''); };
  async function avisSheet() {
    const me = (S.players || []).find(p => p.id === meId()) || { name: ls.get('pelland.me', '') };
    const old = await Store.getAvis() || {};
    let stars = old.stars || 0;
    openSheet(`<div class="avis-sheet"><h3>Votre avis sur ${APP}</h3>
      <div class="av-pick" role="radiogroup" aria-label="Note sur 5">${[1, 2, 3, 4, 5].map(n => `<button type="button" role="radio" data-star="${n}" aria-label="${n} étoile${n > 1 ? 's' : ''}">★</button>`).join('')}</div>
      <label class="fld">En une phrase, qu’est-ce que ${APP} change pour votre groupe ?<textarea id="avText" maxlength="280" rows="3" placeholder="${SPORT.avisExemple}">${esc(old.text || '')}</textarea></label>
      <p class="note" id="avCount"></p>
      <label class="av-ok"><input type="checkbox" id="avOk" ${old.ok === false ? '' : 'checked'}><span>J’accepte que ${APP} publie ce commentaire sur ${MARQUE.domaine}, signé <b>${esc(shortName(me.name))}</b>, ${esc(groupName())}.</span></label>
      <div class="sheet-actions"><button class="btn" id="avSend" type="button">Envoyer</button><button class="btn ghost" data-close type="button">Annuler</button></div></div>`, sh => {
      const paint = () => { sh.querySelectorAll('[data-star]').forEach(b => { const on = +b.dataset.star <= stars; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(+b.dataset.star === stars)); }); };
      const ta = sh.querySelector('#avText'), cnt = () => { sh.querySelector('#avCount').textContent = `${ta.value.length} / 280`; };
      sh.querySelectorAll('[data-star]').forEach(b => b.onclick = () => { stars = +b.dataset.star; paint(); });
      ta.oninput = cnt; paint(); cnt();
      sh.querySelector('[data-close]').onclick = closeSheet;
      sh.querySelector('#avSend').onclick = async () => {
        if (!stars) { toast('Choisissez une note de 1 à 5 étoiles.'); return; }
        const a = { stars, text: ta.value.trim().slice(0, 280), name: shortName(me.name).slice(0, 40), groupName: String(groupName() || '').slice(0, 60), ok: sh.querySelector('#avOk').checked, at: Date.now() };
        try { await Store.saveAvis(a); ls.set(AVIS_K, { ...(ls.get(AVIS_K, {}) || {}), given: 1 }); closeSheet(); toast('Merci ! Votre avis est envoyé.'); render(); }
        catch (e) { toast('Envoi impossible : ' + e.message); }
      };
    });
  }
  document.addEventListener('click', e => {
    const t = e.target.closest && e.target.closest('[data-avis],[data-avislater]'); if (!t) return;
    if (t.hasAttribute('data-avis')) { avisSheet(); return; }
    ls.set(AVIS_K, { ...(ls.get(AVIS_K, {}) || {}), later: Date.now() }); render();
  });
