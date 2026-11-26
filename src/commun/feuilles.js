  // ---------------- Feuilles (saisie manuelle) ----------------
  function openSheet(html, bindFn) {
    const w = $('#sheetWrap'), s = $('#sheet');
    s.innerHTML = html; w.hidden = false;
    w.onclick = e => { if (e.target === w) closeSheet(); };
    bindFn(s);
  }
  function closeSheet() { $('#sheetWrap').hidden = true; }
  // Texto d'invitation quand on ajoute un joueur avec son téléphone
  function inviteText(name, phone, id) {
    const d = String(phone || '').replace(/\D/g, ''); if (d.length < 10) return;
    openSheet(`<h3>Inviter ${esc(name)}</h3><p class="note">Un texto d’invitation est prêt pour le ${esc(fmtPhone(d))}.</p>
      <div class="row"><button class="btn sms-btn" data-go-sms type="button">Envoyer le texto</button><button class="btn ghost small" data-close type="button">Plus tard</button></div>`, sh => {
      sh.querySelector('[data-close]').onclick = closeSheet;
      sh.querySelector('[data-go-sms]').onclick = () => { closeSheet(); inviteSms(name, d, id); };
    });
  }
  function inviteSms(name, d, id) {
    const url = location.origin + location.pathname + (id ? '?joueur=' + encodeURIComponent(id) : '');
    const body = `Salut ${name.split(' ')[0]} ! Tu as été invité à te joindre au groupe « ${groupName()} » sur ${APP}, ${MARQUE.description}. Ouvre l’app : ${url} — ton nom est déjà choisi. La première fois, crée ton compte avec ton cellulaire (${fmtPhone(d)}) : tu reçois un code par texto, puis tu choisis un mot de passe. Sur iPhone : bouton Partager, puis « Sur l’écran d’accueil ».`;
    openSms([d], body);
  }