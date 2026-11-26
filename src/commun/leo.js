  // ---------------- Léo, le caddie en personne : visage dans le coin, salut à l'arrivée, visite guidée ----------------
  let leo = null;
  const LEO_CACHE = ['game', 'setup', 'compEdit', 'comp', 'compTv', 'offre', 'login', 'join', 'jeuEdit', 'course'];   // écrans de saisie : on ne cache rien
  const ssGet = k => { try { return sessionStorage.getItem(k); } catch (e) { return null; } };
  const ssSet = k => { try { sessionStorage.setItem(k, '1'); } catch (e) { } };
  const visiteKey = () => 'fanion.leo.visite.' + (Store.uid || meId() || '');
  function leoApres() {
    if (!window.CaddieGuide) return;
    const off = Store.needLogin || !meId() || LEO_CACHE.includes(S.view);
    if (off) { if (leo) leo.cacher(true); return; }
    if (!leo) leo = CaddieGuide.presence({ surFace: () => openCaddie(), label: 'Parler à Léo, votre caddie' });
    leo.cacher(false);
    document.body.classList.add('avec-leo');
    if (S.view !== 'home' || document.getElementById('welcome') || document.querySelector('.cd-fond')) return;
    // Première fois : la visite (propriétaire et organisateurs ; les participants ont leur accueil) ; sinon un mot à chaque ouverture
    if (canOrganize() && !ls.get(visiteKey(), 0)) { ls.set(visiteKey(), Date.now()); setTimeout(leoVisite, 600); return; }
    if (ssGet('fanion.leo.salut') || carteRetourChoix()) return;   // une seule chose à la fois : la carte de retour passe avant le salut
    ssSet('fanion.leo.salut');
    setTimeout(() => { if (S.view === 'home' && !document.querySelector('.cd-fond, #welcome')) leo.dire(leoMessage()); }, 1200);
  }
  function leoMessage() {
    const h = new Date().getHours(), salut = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir', nom = firstName(ls.get('pelland.me', ''));
    const today = new Date().toISOString().slice(0, 10);
    const live = (S.historyList || []).filter(g => g.status !== 'terminée').length;
    const compAuj = (S.compList || []).filter(c => c.date === today).length;
    const nbJ = (S.players || []).length;
    let texte, bouton = null, action = null;
    if (live) { texte = `${live} partie${live > 1 ? 's' : ''} en cours dans le groupe.`; bouton = 'Suivre en direct'; action = () => go('live'); }
    else if (compAuj) { texte = `Une compétition se joue aujourd’hui. Bonne chance !`; bouton = 'Voir le classement'; action = () => go('comps', { compLive: true }); }
    else if (canOrganize() && nbJ < 4) { texte = `Il vous faut au moins 4 joueurs pour un quatuor. On les invite ?`; bouton = 'Inviter des joueurs'; action = () => go('players', { pMode: 'banque' }); }
    else if (canOrganize()) { texte = 'Prêt pour la prochaine ronde ? Offrez des dates et je forme les quatuors.'; bouton = 'Parties à préparer'; action = () => go('quatuors'); }
    else texte = 'Tout est en ordre. Touchez mon visage si vous avez une question.';
    return { titre: `${salut}${nom ? ', ' + nom : ''} !`, texte, bouton, action, duree: 9000 };
  }
  function leoVisite() {
    if (!window.CaddieGuide) return;
    const nom = firstName(ls.get('pelland.me', ''));
    CaddieGuide.ouvrir({
      etapes: [
        { puce: 'Bonjour !', titre: `Bienvenue${nom ? ', ' + nom : ''} ! Moi, c’est Léo, votre caddie.`, texte: `Je vous fais faire le tour de « ${groupName()} » en six coups. Ça prend une minute.` },
        { puce: 'Étape 1', titre: 'Inviter des joueurs', texte: 'Le nom et le cellulaire de chacun : l’invitation part par texto. Chaque joueur crée son compte une fois, pour tous ses groupes.' },
        { puce: 'Étape 2', titre: 'Parties à préparer', texte: 'Offrez quelques dates. Chacun coche les siennes, et je forme les quatuors à la date butoir.' },
        { puce: 'Étapes 3 et 4', titre: 'Créer une partie, la suivre en direct', texte: 'Terrain, équipes, jeu et montants. Un joueur entre les scores ; les autres suivent la partie sur leur téléphone.' },
        { puce: 'Étapes 5 et 6', titre: 'Compétitions et résultats', texte: 'Membre-membre, membre-invité, scrambles, Coupe Ryder ou tableau à élimination, avec le classement en direct. À la fin, je dis qui doit quoi à qui.' },
        { puce: 'Les banques', titre: 'Joueurs, terrains, jeux, compétitions', texte: 'Tout ce que le groupe bâtit reste là pour la prochaine saison : vos terrains, vos jeux maison, vos formats.' },
      ],
      fin: { titre: 'Une question ? Je suis dans le coin.', texte: 'Touchez mon visage en bas à droite, n’importe quand. On commence par inviter vos joueurs ?', bouton: (S.players || []).length < 4 ? 'Inviter des joueurs' : 'C’est parti', action: () => { if ((S.players || []).length < 4) go('players', { pMode: 'banque' }); } },
    });
  }
  // Texto : les joueurs de la partie sont cochés ; on peut ajouter des joueurs d'une autre partie (ou du groupe)