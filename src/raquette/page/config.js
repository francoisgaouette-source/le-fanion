// Réglages publics de l'app raquette. Sans projet Supabase (étape 5 du plan), l'app fonctionne en mode local.
// Au lancement : projet Supabase séparé du Fanion (supabaseUrl, supabaseKey) et client OAuth HoldingAI de l'app.
window.APP_CONFIG = {
  supabaseUrl: "",
  supabaseKey: "",
  HOLDINGAI: { clientId: "", app: "raquette", retour: "" }
};
