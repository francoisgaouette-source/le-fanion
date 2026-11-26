  // ---------------- Les jeux (règles) ----------------
  const GAMES_INFO = [
    { f: 'pelland', who: '4 joueurs, en équipes de deux (Rouges et Bleus)', rules: [
      'À chaque trou, le joueur au plus bas score net gagne 2 points pour son équipe.',
      'Le joueur au plus haut score net donne 2 points à l’équipe adverse.',
      'Égalité entre deux équipes : pas de points ; dans la même équipe : 2 points une seule fois.',
      'Skin : 1 point à l’équipe du joueur qui l’obtient. S’il ne fait pas la normale (au brut), le point va à l’autre équipe.',
      'Oiselet (au brut) : 1 point à l’équipe du joueur, pour chaque oiselet.',
      'Cabane : oiselet brut + skin + plus haut net chez l’adversaire = 12 points pour le trou.',
      'Press : l’équipe en déficit double les points du trou, skin et oiselets compris ; l’autre peut répondre par un reroll (×4).'],
      money: ['La game : montant de départ gagné par l’équipe qui mène à la fin.', 'Chaque revirement (l’équipe qui mène perd son avance : retour à égalité ou l’autre passe devant) ajoute un montant.', 'Normales 3 : la skin + la normale gagne le montant choisi (5 $ par défaut), sinon reporté à la normale 3 suivante.', 'Chaque point net d’écart vaut le montant par point.', 'Montants par joueur.'] },
    { f: 'neuf', who: '3 joueurs, chacun pour soi', rules: ['À chaque trou : 5 points au meilleur net, 3 au deuxième, 1 au troisième.', 'Égalité : on partage (4-4-1, 5-2-2 ou 3-3-3).'],
      money: ['Chacun gagne ou paie la différence de points avec chaque autre joueur, × le montant par point.'] },
    { f: 'bestball', who: '4 joueurs, en équipes de deux', rules: ['Le meilleur net de chaque équipe compte.', 'L’équipe la plus basse gagne le trou ; égalité : trou partagé.'],
      money: ['Écart de trous gagnés × le montant par trou, par joueur.'] },
    { f: 'match', who: '2 joueurs, un contre un', rules: ['Au net, avec les coups de handicap de chacun.', 'Le plus bas score du trou le gagne ; égalité : trou partagé.', 'On compte l’avance en trous (« 2 d’avance »). Dès que l’avance dépasse le nombre de trous qui restent, le match est fini : « gagne 3 et 2 » veut dire 3 trous d’avance avec 2 trous à jouer.', 'Égalité après le dernier trou : match nul.'],
      money: ['Un seul enjeu, pour la partie : le gagnant du match empoche le montant ; match nul, personne ne paie.'] },
    { f: 'vegas', who: '4 joueurs, en équipes de deux', rules: ['Sur chaque trou, les deux scores nets de l’équipe forment un nombre, le plus bas d’abord : 4 et 5 donnent 45.', 'Un oiselet (au brut) renverse le nombre de l’autre équipe : son 45 devient 54. Oiselet des deux côtés : rien ne change.', 'Maximum par joueur : double boguey net, pour garder des nombres à deux chiffres.', 'L’écart entre les deux nombres donne les points du trou à l’équipe la plus basse.'],
      money: ['Écart de points × le montant par point, par joueur. Les points montent vite : on joue souvent à 0,10 $ ou 0,25 $ le point.'] },
    { f: 'nassau', who: '4 joueurs, en équipes de deux', rules: ['Trois paris en Best Ball : l’aller (trous 1 à 9), le retour (10 à 18) et le total des 18 trous.', 'Le meilleur net de chaque équipe gagne le trou ; l’équipe qui gagne le plus de trous gagne le pari.', 'Égalité dans un pari : personne ne gagne.', 'Sur 9 trous : un seul pari.'],
      money: ['Chaque pari gagné vaut la mise ; perdu, −la mise. Maximum : 3 fois la mise, par joueur.'] },
    { f: 'wolf', who: '4 joueurs ; le loup tourne à chaque trou', rules: ['Joueur 1 est le loup au trou 1, joueur 2 au trou 2, et ainsi de suite.', 'Le loup choisit un partenaire : chaque gagnant fait +1, chaque perdant −1.', 'Le loup joue seul : 2 points par adversaire, gagnés ou perdus.', 'Seul à l’aveugle (avant les coups de départ) : 3 points par adversaire.'],
      money: ['Points × le montant par point.'] },
    { f: 'sixes', who: '4 joueurs ; les équipes changent', rules: ['1+2 contre 3+4, puis 1+3 contre 2+4, puis 1+4 contre 2+3 (6 trous chacun sur 18, 3 sur 9).', 'Dans chaque tranche : Best Ball, 1 point par trou gagné.'],
      money: ['La tranche gagnée vaut la mise ; perdue, −la mise.'] },
    { f: 'skins', who: '3 ou 4 joueurs, chacun pour soi', rules: ['Le seul meilleur net du trou gagne le skin.', 'Égalité : le skin est reporté et s’ajoute au trou suivant.'],
      money: ['Chaque autre joueur paie le montant par skin au gagnant.'] },
  ];
  function vJeux() {
    $('#barTitle').textContent = 'Les jeux';
    return `<p class="note">Le jeu se choisit en créant la partie. Tout se compte au net, avec les coups de handicap de chacun.</p>
      <div class="jeux">${GAMES_INFO.map(x => `<details class="card jeu"><summary><b>${esc(L.FORMATS[x.f])}</b><span>${esc(x.who)}</span></summary>
        <h3>Règles</h3><ul>${x.rules.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
        <h3>L’argent</h3><ul>${x.money.map(r => `<li>${esc(r)}</li>`).join('')}</ul></details>`).join('')}</div>
      <h2 class="jeux-h">Jeux maison du groupe</h2>
      <div class="jeux">${(S.jeux || []).map(j => `<details class="card jeu"><summary><b>${esc(j.name)}</b><span>${j.mode === 'equipes' ? '4 joueurs, en équipes de deux' : '3 ou 4 joueurs, chacun pour soi'}</span></summary>
        <ul>${persoLines(j).map(r => `<li>${esc(r)}</li>`).join('')}<li>${esc(gainRule({ format: 'perso', custom: j, players: [], perPoint: j.pp }))}.</li></ul>
        ${canOrganize() ? `<div class="row" style="margin-top:10px"><button class="btn small" data-jedit="${esc(j.id)}" type="button">Modifier</button><button class="btn ghost small" data-jdel="${esc(j.id)}" type="button">${S.confirmDelJ === j.id ? 'Confirmer' : 'Retirer'}</button></div>` : ''}</details>`).join('') || '<p class="note">Aucun jeu maison pour l’instant.</p>'}</div>
      ${canOrganize() ? '<button class="btn" data-jnew type="button">Ajouter un jeu</button>' : ''}`;
  }
  // Ajouter un jeu : on demande d'abord si les règles sont sur le web (adresse) ; sinon, on demande de l'expliquer
  function askNewGame() {
    const st = { web: null };
    const draw = sh => {
      sh.innerHTML = `<h3>Ajouter un jeu</h3>
        <label>Nom du jeu<input id="ngName" type="text" placeholder="ex. Le Bingo Bango Bongo" value="${esc(st.name || '')}"></label>
        <p style="margin:10px 0 6px"><b>Les explications de ce jeu sont-elles sur le web ?</b></p>
        <div class="seg"><button type="button" data-web="1" aria-pressed="${st.web === true}"><b>Oui</b><small>Je donne l’adresse</small></button><button type="button" data-web="0" aria-pressed="${st.web === false}"><b>Non</b><small>Je l’explique</small></button></div>
        ${st.web === true ? `<label>Où ? Adresse de la page (lien)<input id="ngUrl" type="url" inputmode="url" placeholder="https://…" value="${esc(st.url || '')}"></label>` : ''}
        ${st.web === false ? `<label>Expliquez le jeu que vous voulez créer<textarea id="ngTxt" rows="7" placeholder="Combien de joueurs ? En équipes ou chacun pour soi ? Comment on gagne des points à chaque trou ? Comment l’argent se compte ?">${esc(st.txt || '')}</textarea></label>` : ''}
        ${st.web != null ? '<p class="note">Nous ajoutons le jeu au fanion.ai et vous avisons dès qu’il est prêt.</p>' : ''}
        <div class="row"><button class="btn small" id="ngSend" type="button" ${st.web == null ? 'disabled' : ''}>Envoyer</button><button class="btn ghost small" data-close type="button">Annuler</button></div>
        <p class="note" style="margin-top:10px">Vous savez déjà comment le compter ? <button class="linkbtn" id="ngSelf" type="button">Le créer moi-même</button></p>`;
      const keep = () => { const n = sh.querySelector('#ngName'), u = sh.querySelector('#ngUrl'), t = sh.querySelector('#ngTxt'); if (n) st.name = n.value; if (u) st.url = u.value; if (t) st.txt = t.value; };
      sh.querySelectorAll('[data-web]').forEach(b => b.onclick = () => { keep(); st.web = b.dataset.web === '1'; draw(sh); const f = sh.querySelector(st.web ? '#ngUrl' : '#ngTxt'); if (f) f.focus(); });
      sh.querySelector('[data-close]').onclick = closeSheet;
      sh.querySelector('#ngSelf').onclick = () => { closeSheet(); go('jeuEdit', { editJeu: null }); };
      sh.querySelector('#ngSend').onclick = async () => {
        keep();
        if (!String(st.name || '').trim()) return toast('Donnez le nom du jeu.');
        if (st.web && !/^\S+\.\S+/.test(String(st.url || '').trim())) return toast('Entrez l’adresse de la page.');
        if (!st.web && String(st.txt || '').trim().length < 20) return toast('Expliquez le jeu en quelques phrases.');
        const req = { name: st.name.trim(), url: st.web ? st.url.trim() : '', text: st.web ? '' : st.txt.trim(), group: groupName(), groupId: Store.gid, by: ls.get('pelland.me', '') || '', at: Date.now() };
        try { await Store.saveGameRequest(req); } catch (e) { }
        const body = `Nouveau jeu demandé pour le fanion.ai\n\nGroupe : ${req.group}\nDemandé par : ${req.by}\nJeu : ${req.name}\n` + (req.url ? `Règles sur le web : ${req.url}\n` : `Explication :\n${req.text}\n`);
        closeSheet(); toast('Demande envoyée. Merci !');
        location.href = 'mailto:bonjour@fanion.ai?subject=' + encodeURIComponent('le fanion.ai – Ajouter un jeu : ' + req.name) + '&body=' + encodeURIComponent(body);
      };
    };
    openSheet('', sh => draw(sh));
  }
  function vJeuEdit() {
    const j = S.editJeu || (S.editJeu = { name: '', mode: 'equipes', low: 2, high: 2, team: 0, birdie: 0, stake: 0, ranks: '5, 3, 1, 0', skin: 0, pp: 1 });
    $('#barTitle').textContent = j.id ? 'Modifier le jeu' : 'Ajouter un jeu';
    const numIn = (k, label, help) => `<label>${label}<input data-jf="${k}" type="text" inputmode="decimal" value="${esc(j[k] ?? '')}"></label>${help ? `<p class="note" style="margin-top:-4px">${help}</p>` : ''}`;
    return `<section class="card">
        <label>Nom du jeu<input data-jf="name" type="text" value="${esc(j.name)}" placeholder="ex. La game du mardi"></label>
        <div class="seg"><button type="button" data-jmode="equipes" aria-pressed="${j.mode === 'equipes'}"><b>En équipes</b><small>2 contre 2, 4 joueurs</small></button><button type="button" data-jmode="individuel" aria-pressed="${j.mode !== 'equipes'}"><b>Chacun pour soi</b><small>3 ou 4 joueurs</small></button></div>
      </section>
      <section class="card"><h2>Points à chaque trou</h2><p class="note">Tout se compte au net. Mettez 0 pour ne pas utiliser une règle.</p>
        ${j.mode === 'equipes'
          ? numIn('low', 'Plus bas net : points à son équipe') + numIn('high', 'Plus haut net : points à l’équipe adverse') + numIn('team', 'Meilleur total des deux nets de l’équipe') + numIn('birdie', 'Chaque oiselet (au brut) : points à l’équipe')
          : numIn('ranks', 'Points par rang (1er, 2e, 3e, 4e)', 'Séparés par des virgules, ex. 5, 3, 1, 0. Égalités partagées.') + numIn('birdie', 'Chaque oiselet (au brut)') + numIn('skin', 'Skin : seul meilleur net du trou', 'Reporté au trou suivant en cas d’égalité.')}
      </section>
      <section class="card"><h2>L’argent</h2>
        ${numIn('pp', 'Montant par point ($)')}
        ${j.mode === 'equipes' ? numIn('stake', 'Mise : gagnée par l’équipe qui mène à la fin ($)') : '<p class="note">Chacun gagne ou paie la différence de points avec chaque autre joueur.</p>'}
      </section>
      <section class="card"><h2>Résumé</h2><ul class="info-list" id="jSum">${persoLines(j).map(r => `<li>${esc(r)}</li>`).join('')}</ul></section>
      <button class="btn" id="jSave" type="button">Enregistrer le jeu</button>`;
  }