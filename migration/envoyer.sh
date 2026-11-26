#!/bin/bash
# Envoie les fichiers import-*.sql (dossier courant) dans la table temporaire depot_import du projet Supabase « Le Fanion ».
# La clé publique (publishable) est lue dans config.js du dépôt ; la table n'accepte que des envois, et elle est supprimée après l'import.
K=$(curl -s https://raw.githubusercontent.com/francoisgaouette-source/pelland/main/config.js | grep -o 'sb_publishable_[A-Za-z0-9_]*' | head -1)
for f in import-*.sql; do
  python3 -c "import json,sys;print(json.dumps({'nom':sys.argv[1],'contenu':open(sys.argv[1]).read()}))" "$f" |
    curl -s -o /dev/null -w "$f %{http_code}\n" -X POST https://iuoaiambosdpsvsymupz.supabase.co/rest/v1/depot_import \
      -H "apikey: $K" -H 'Content-Type: application/json' --data-binary @-
done
