  // ---------------- Petit « i » d'explication ----------------
  const info = key => `<button type="button" class="info" data-info="${key}" aria-label="Explication">i</button>`;
  const HELP = {
    handicap: ['Handicap', ['Hcp de parcours = index × slope ÷ 113 + (évaluation − normale), arrondi. Il dépend du tertre choisi.', 'Bas handicap : le meilleur joue à 0 et les autres reçoivent la différence (ex. 12 − 7 = 5 coups).', 'Full handicap : chacun reçoit son Hcp au complet.', 'Les coups se placent d’abord sur les trous les plus difficiles (handicap 1, 2, 3…). Au-delà de 18, un 2e coup.']],
    argent: ['L’argent de la game à Pelland', ['La game commence à : le montant de départ, gagné par l’équipe qui mène à la fin.', 'À chaque revirement : ajouté chaque fois que l’équipe qui mène perd son avance (retour à égalité ou l’autre passe devant).', 'Par point net : multiplié par l’écart de points à la fin.', 'Chaque normale 3 : gagné par l’équipe qui a la skin et fait la normale ; sinon reporté à la normale 3 suivante.', 'Tous les montants sont par joueur.']],
    equipes: ['Les équipes', ['Meilleur + Pire : le plus bas index joue avec le plus haut, les deux du milieu ensemble.', 'Le meilleur joueur est toujours chez les Rouges.', 'Je choisis : vous décidez qui joue avec qui.']],
    game: ['La game commence à', ['Le montant de départ, par joueur. L’équipe qui mène à la fin du parcours le gagne.']],
    par3now: ['Les pars 3 sont à', ['Le montant en jeu à la prochaine normale 3, par joueur.', 'L’équipe qui a la skin et fait la normale le gagne. Sinon, il est reporté et s’ajoute à la normale 3 suivante.']],
    revirement: ['À chaque revirement', ['Un revirement, c’est quand l’équipe qui mène perd son avance : quand les points reviennent à égalité (à zéro) ou quand l’autre équipe passe devant. Chaque revirement ajoute ce montant à la game, par joueur.', 'La case montre le montant par revirement et le nombre de revirements jusqu’ici.']],
    meneurs: ['Meneurs', ['L’équipe en avance et son écart en points nets.', 'Gain par joueur en ce moment = la game + les revirements + les normales 3 (gagnées moins perdues) + l’écart × le montant par point.']],
    press: ['Press et reroll', ['Avant le départ d’un trou, l’équipe en déficit peut presser : les points du trou comptent double.', 'L’autre équipe peut alors répondre par un reroll : les points comptent quatre fois.', 'Le responsable touche le bouton Press du trou. Oublié ? On peut le toucher après les scores : revenez au trou avec ‹ et touchez Press, ou retirez-la avec Pressé ✓.']],
  };
  function showInfo(key) {
    let t, lines;
    if (key.startsWith('jeu-perso')) { const c = key === 'jeu-perso' ? (S.game || {}).custom : jeuOf(key.slice(4)); if (!c) return; t = c.name || 'Jeu maison'; lines = [...persoLines(c), gainRule({ format: 'perso', custom: c, players: [], perPoint: c.pp }) + '.']; }
    else if (key.startsWith('jeu-')) { const g = GAMES_INFO.find(x => x.f === key.slice(4)); if (!g) return; t = L.FORMATS[g.f]; lines = [g.who, ...g.rules, ...g.money.map(m => 'Argent : ' + m)]; }
    else if (HELP[key]) [t, lines] = HELP[key]; else return;
    openSheet(`<h3>${esc(t)}</h3><ul class="info-list">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul><div class="sheet-actions"><button class="btn" data-close type="button">Compris</button></div>`, sh => { sh.querySelector('[data-close]').onclick = closeSheet; });
  }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-info]'); if (!b) return; e.preventDefault(); e.stopPropagation(); showInfo(b.dataset.info); }, true);