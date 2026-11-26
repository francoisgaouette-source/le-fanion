  const NOTIF = { actif: ['ok', '🔔 Notifications actives', 'Il reçoit les alertes du groupe.'], bloque: ['bad', '🔕 Notifications bloquées', 'Il les a bloquées sur son téléphone : il ne reçoit rien. Parlez-lui, ou retirez-le du groupe.'],
    a_activer: ['wait', '🔕 Notifications pas activées', 'Il n’a pas encore accepté les notifications sur son téléphone.'], a_installer: ['wait', '🔕 App pas sur l’écran d’accueil', 'Sur iPhone, il doit ajouter l’app à l’écran d’accueil pour recevoir les alertes.'],
    non_supporte: ['bad', '🔕 Téléphone sans notifications', 'Son navigateur ne reçoit pas les notifications.'] };
  async function chargerNotifs() {
    if (Store.mode !== 'cloud' || !canOrganize()) return;
    try {
      const subs = await Store.listPushSubs(), m = {};
      subs.forEach(x => { const e = x.sub ? 'actif' : (x.etat || 'a_activer'); if (!m[x.playerId] || (x.at || 0) > m[x.playerId].at) m[x.playerId] = { e, at: x.at || 0 }; });
      S.notifs = Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.e]));
    } catch (e) { S.notifs = {}; }
    if (S.view === 'players') render();
  }
  function notifStatus(p) {
    if (!S.notifs || !hasAccepted(p)) return '';
    const n = NOTIF[S.notifs[p.id] || 'a_activer'];
    return ` <span class="pl-st notif-${n[0]}" title="${esc(n[2])}">${n[1]}</span>`;
  }
  function plStatus(p) {
    if (hasAccepted(p)) return ' <span class="pl-st ok" title="Invitation acceptée : compte créé">✓ Compte créé</span>' + notifStatus(p);
    if (p.phone || p.phoneHint) return ' <span class="pl-st wait" title="Le texto d’invitation a pu être envoyé ; le joueur n’a pas encore créé son compte">Invité · en attente</span>';
    return ' <span class="pl-st none" title="Ajoutez son cellulaire pour l’inviter">Sans cellulaire</span>';
  }