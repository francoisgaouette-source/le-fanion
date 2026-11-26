// Installation obligatoire sur le téléphone : ouverte dans le navigateur d'un cellulaire, l'app demande d'abord
// d'être ajoutée à l'écran d'accueil (comme Le Gousset). Sur ordinateur, rien ne change.
// Exception discrète pour le soutien : ?navigateur=1 (gardé sur cet appareil).
(function () {
  const UA = navigator.userAgent;
  const installee = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const IOS = /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const ANDROID = /Android/.test(UA);
  const MOBILE = IOS || ANDROID || /Mobi/.test(UA);
  let passe = false;
  try { if (/[?&]navigateur=1\b/.test(location.search)) localStorage.setItem('fanion.navigateur', '1'); passe = localStorage.getItem('fanion.navigateur') === '1'; } catch (e) { }
  if (installee || !MOBILE || passe) return;

  const DANS_APP = /FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|MicroMessenger|Snapchat|TikTok|LinkedInApp|GSA\//.test(UA);
  const PAS_SAFARI = IOS && /CriOS|FxiOS|EdgiOS|OPiOS/.test(UA);
  const PARTAGE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style="vertical-align:-4px"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  let prompt = null;

  function etapes() {
    if (DANS_APP) return `<ol><li>Touchez le menu <b>⋯</b> ou <b>⋮</b> de cette fenêtre.</li><li>Choisissez <b>Ouvrir dans ${IOS ? 'Safari' : 'Chrome'}</b> (ou « Ouvrir dans le navigateur »).</li><li>Revenez à ces étapes dans ${IOS ? 'Safari' : 'Chrome'}.</li></ol>`;
    if (PAS_SAFARI) return `<ol><li>Copiez l’adresse <b>app.lefanion.ai</b>.</li><li>Ouvrez-la dans <b>Safari</b> : sur iPhone, seule Safari ajoute une app à l’écran d’accueil.</li><li>Suivez les étapes qui s’y affichent.</li></ol>`;
    if (IOS) return `<ol><li>Touchez le bouton <b>Partager</b> ${PARTAGE} en bas de Safari.</li><li>Faites défiler et choisissez <b>Sur l’écran d’accueil</b>.</li><li>Touchez <b>Ajouter</b>, puis ouvrez le fanion.ai par sa nouvelle icône.</li></ol>`;
    return `<ol><li>Touchez le menu <b>⋮</b> en haut à droite de Chrome.</li><li>Choisissez <b>Installer l’application</b> (ou <b>Ajouter à l’écran d’accueil</b>).</li><li>Ouvrez le fanion.ai par sa nouvelle icône.</li></ol>`;
  }
  function dessiner() {
    let g = document.getElementById('installGate');
    if (!g) { g = document.createElement('div'); g.id = 'installGate'; g.setAttribute('role', 'dialog'); g.setAttribute('aria-modal', 'true'); g.setAttribute('aria-labelledby', 'igTitre'); document.body.appendChild(g); }
    g.innerHTML = `<div class="ig-in">
      <div class="ig-logo" aria-hidden="true"><svg width="44" height="52" viewBox="0 0 26 30"><path d="M5 2v26" stroke="#0d4a2e" stroke-width="2.4" stroke-linecap="round"/><path d="M6 3l15 5.5L6 14z" fill="#e8b52c"/></svg></div>
      <h1 id="igTitre">Installez le fanion.ai</h1>
      <p class="ig-lead">Le fanion.ai s’utilise comme une vraie app, installée sur votre téléphone : les notifications du groupe, le pointage sur le terrain et la connexion fonctionnent seulement ainsi. C’est gratuit et ça prend 10 secondes.</p>
      ${prompt ? '<button class="ig-btn" id="igInstaller" type="button">Installer le fanion.ai</button><p class="ig-ou">ou, à la main :</p>' : ''}
      ${etapes()}
      <p class="ig-note">Déjà installée ? Fermez cette page et ouvrez le fanion.ai par son icône sur votre écran d’accueil.</p>
    </div>`;
    const b = document.getElementById('igInstaller');
    if (b) b.onclick = async () => { try { prompt.prompt(); await prompt.userChoice; } catch (e) { } };
  }
  const css = document.createElement('style');
  css.textContent = `#installGate{position:fixed;inset:0;z-index:2147483000;background:#f3f6f1;color:#10261a;overflow-y:auto;font-family:Barlow,Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
    #installGate .ig-in{max-width:440px;margin:0 auto;padding:max(48px,env(safe-area-inset-top)) 22px 40px}
    #installGate .ig-logo{width:76px;height:76px;border-radius:20px;background:#fff;display:grid;place-items:center;box-shadow:0 4px 16px rgba(13,74,46,.15);margin-bottom:18px}
    #installGate h1{font-family:'Barlow Condensed',Barlow,sans-serif;font-size:36px;line-height:1.05;margin:0 0 10px;color:#0d4a2e}
    #installGate .ig-lead{font-size:17px;line-height:1.45;margin:0 0 18px}
    #installGate ol{margin:0;padding:0;list-style:none;counter-reset:e;display:grid;gap:10px}
    #installGate li{counter-increment:e;background:#fff;border:1px solid #dde3df;border-radius:14px;padding:14px 14px 14px 54px;position:relative;font-size:17px;line-height:1.4}
    #installGate li::before{content:counter(e);position:absolute;left:14px;top:12px;width:28px;height:28px;border-radius:50%;background:#e8b52c;color:#10261a;font-weight:800;display:grid;place-items:center}
    #installGate .ig-btn{display:block;width:100%;border:0;border-radius:14px;background:#0d4a2e;color:#fff;font:700 19px Barlow,system-ui,sans-serif;padding:16px;margin:0 0 6px;cursor:pointer}
    #installGate .ig-ou{text-align:center;color:#5b6b62;margin:8px 0 10px;font-size:14px}
    #installGate .ig-note{color:#5b6b62;font-size:14px;margin-top:18px;line-height:1.4}`;
  document.head.appendChild(css);
  window.FANION_INSTALL_REQUISE = true;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); prompt = e; if (document.body) dessiner(); });
  window.addEventListener('appinstalled', () => { const g = document.getElementById('installGate'); if (g) g.innerHTML = '<div class="ig-in"><h1>C’est installé !</h1><p class="ig-lead">Ouvrez maintenant le fanion.ai par sa nouvelle icône sur votre écran d’accueil.</p></div>'; });
  if (document.body) dessiner(); else document.addEventListener('DOMContentLoaded', dessiner);
})();
