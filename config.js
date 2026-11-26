// Réglages publics du Fanion (app.fanion.ai).
// Projet Supabase « Le Fanion ». La clé publique peut être dans le code : la sécurité vient des règles de la base.
window.FANION_CONFIG = window.APP_CONFIG = {
  supabaseUrl: "https://iuoaiambosdpsvsymupz.supabase.co",
  supabaseKey: "sb_publishable_OyJAYcd00NPMK0_yiW54dA_ySQhECPK",
  // Compte HoldingAI (compte.holdingai.app) : client OAuth du Fanion dans le projet Supabase « HoldingAI Compte »
  HOLDINGAI: {
    clientId: "",          // à remplir quand le client « Le Fanion » est créé (Authentication > OAuth Apps)
    app: "fanion",
    retour: "https://app.fanion.ai/"
  }
};
