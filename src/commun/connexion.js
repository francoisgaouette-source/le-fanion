  // ---------------- Terrains ----------------
  function vLogin() {
    $('#barTitle').innerHTML = `${APP}<small class="bar-sous">${MARQUE.slogan}</small>`;
    $('#back').hidden = true;
    const refQ = new URLSearchParams(location.search).get('ref');
    const groups = S.groups || [];
    const refGroup = refQ && groups.find(g => g.id === refQ);
    const hero = `<div class="hero"><h1>${APP}</h1><p>${MARQUE.accroche}</p></div>`;
    // Pas encore connecté : le compte HoldingAI (le même pour toutes les apps HoldingAI)
    if (!Store.uid) return hero + `<section class="card"><h2>Connexion</h2>
        <p class="note">Un seul compte pour toutes les apps de L’Établi : votre cellulaire et votre mot de passe. Philou s’en occupe.</p>
        <p class="note"><b>Invité par texto ?</b> Utilisez le cellulaire où vous avez reçu l’invitation : vous retrouverez votre groupe.</p>
        <button class="btn" id="haiGo" type="button">Continuer avec L’Établi</button>
        <p class="note" id="loginMsg">${esc(S.loginMsg || Store.error || '')}</p></section>`;
    // Connecté, mais ce cellulaire n'est inscrit dans aucun groupe : invitation à demander, ou nouveau groupe
    const nom = Store.nom || '';
    return hero + `${refQ ? `<div class="ref-hello">${refGroup ? `Recommandé par <b>${esc(refGroup.name)}</b>. ` : ''}Créez votre groupe : c’est gratuit pour ${SPORT.gratuitPour}, et vos joueurs reçoivent l’invitation par texto.</div>` : ''}
      <section class="card"><h2>${nom ? 'Bienvenue, ' + esc(nom.split(' ')[0]) + ' !' : 'Bienvenue !'}</h2>
        <p class="note">Votre cellulaire${Store.e164 ? ' (' + esc(fmtPhone(Store.e164.slice(2))) + ')' : ''} n’est inscrit dans aucun groupe pour l’instant.</p>
        <p class="note"><b>Invité par un organisateur ?</b> Demandez-lui de vérifier votre cellulaire dans Joueurs, puis rouvrez le lien de son texto.</p>
      </section>
      <section class="card"><h2>Créer un groupe</h2>
        <label>Nom du groupe<input id="ngName" type="text" placeholder="ex. Les lève-tôt du samedi"></label>
        <label>Votre prénom et nom<input id="ngMe" type="text" autocapitalize="words" value="${esc(nom)}"></label>
        <button class="btn" id="ngCreate" type="button">Créer le groupe</button>
        <p class="note" id="acMsg"></p>
        <p class="note">Vous en serez le propriétaire. Ajoutez ensuite vos joueurs dans Joueurs : ils reçoivent l’invitation par texto. Gratuit jusqu’à 4 joueurs.</p>
      </section>
      <p class="note" style="text-align:center"><button class="linkbtn" id="haiOut" type="button">Changer de compte</button></p>`;
  }
