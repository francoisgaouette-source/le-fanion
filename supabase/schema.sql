-- Le Fanion sur Supabase (projet « Le Fanion », iuoaiambosdpsvsymupz) — remplace Firestore.
-- Connexion : compte HoldingAI (Third-Party Auth, Custom OIDC). La personne = auth.jwt()->>'sub'.
-- Chaque collection Firestore devient une table : les champs servant à la sécurité sont des colonnes,
-- le reste du document est gardé tel quel dans « data » (jsonb), pour que l'app change le moins possible.
-- Les règles de firestore.rules sont reprises en règles RLS, déclencheurs et fonctions.

-- ============ Fonctions d'identité ============
create or replace function public.moi() returns text language sql stable as $$
  select nullif(auth.jwt()->>'sub', '')
$$;

-- Cellulaire confirmé du compte HoldingAI, au format +15145550000 (vide si aucun)
create or replace function public.mon_numero() returns text language sql stable as $$
  select case when coalesce(auth.jwt()->>'phone', '') = '' then ''
              else '+' || regexp_replace(auth.jwt()->>'phone', '\D', '', 'g') end
$$;

-- ============ Tables ============
create table public.groupes (
  id text primary key,
  owner text not null default '',             -- id du joueur propriétaire
  organizers text[] not null default '{}',
  plan text not null default '',              -- '' (Gratuit) ou 'groupe' : donné par Fanion après paiement
  paid_until bigint,                          -- millisecondes, comme dans l'app
  max_joueurs int not null default 0,
  n_players int not null default 0,           -- tenu à jour par la base
  archived boolean not null default false,
  deleted boolean not null default false,
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.joueurs (
  id text primary key,
  group_id text not null references public.groupes(id) on delete cascade,
  auth_email text not null default '',
  acct text not null default '',
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on public.joueurs (group_id);

-- Lien compte → joueur → groupe (ancienne collection auth/{uid})
create table public.liens (
  uid text primary key,
  player_id text not null references public.joueurs(id) on delete cascade,
  group_id text not null references public.groupes(id) on delete cascade,
  at timestamptz not null default now()
);

create table public.telephones (
  player_id text primary key references public.joueurs(id) on delete cascade,
  group_id text not null references public.groupes(id) on delete cascade,
  phone text not null default '',             -- 10 chiffres
  e164 text not null default ''               -- +1XXXXXXXXXX
);
create index on public.telephones (group_id);
create index on public.telephones (e164);

create table public.donnees_groupe (           -- ancienne groupdata : quatuors, jeux maison…
  group_id text primary key references public.groupes(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create table public.offres (
  id text primary key,
  group_id text not null references public.groupes(id) on delete cascade,
  data jsonb not null default '{}'
);
create index on public.offres (group_id);

create table public.parties (                  -- ancienne games
  id text primary key,
  group_id text not null references public.groupes(id) on delete cascade,
  owner_uid text not null default '',
  data jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create index on public.parties (group_id);

create table public.presences (
  game_id text primary key references public.parties(id) on delete cascade,
  data jsonb not null default '{}'
);

create table public.competitions (             -- ancienne comps
  id text primary key,
  group_id text not null references public.groupes(id) on delete cascade,
  data jsonb not null default '{}',
  scores jsonb not null default '{}'
);
create index on public.competitions (group_id);

create table public.abonnements_push (         -- ancienne subs, id = <uid>_<groupe>
  id text primary key,
  uid text not null,
  group_id text not null references public.groupes(id) on delete cascade,
  player_id text not null references public.joueurs(id) on delete cascade,
  sub jsonb,
  etat text not null default '',
  at bigint
);
create index on public.abonnements_push (group_id);

create table public.avis (
  uid text primary key,
  stars int not null check (stars between 1 and 5),
  text text not null default '' check (char_length(text) <= 280),
  name text not null default '' check (char_length(name) <= 40),
  group_name text not null default '' check (char_length(group_name) <= 60),
  ok boolean not null default false,
  at bigint not null,
  approved boolean not null default false     -- choisi dans la console, jamais par le joueur
);

create table public.demandes (                 -- ancienne requests : lue seulement dans la console
  id uuid primary key default gen_random_uuid(),
  uid text not null default public.moi(),
  data jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.admins (uid text primary key);

create table public.gratuits (                 -- un seul groupe gratuit par compte
  uid text primary key,
  group_id text not null,
  at timestamptz not null default now()
);

create table public.terrains (                 -- ancienne courses (commune à tous)
  id text primary key,
  data jsonb not null default '{}'
);

create table public.terrains_proposes (
  id text primary key default gen_random_uuid()::text,
  groupe text not null references public.groupes(id) on delete cascade,
  propose_uid text not null,
  statut text not null default 'propose',
  data jsonb not null default '{}'
);

create table public.cartes_terrains (
  course_id text primary key,
  photos jsonb not null default '[]',
  cree bigint
);

-- ============ Fonctions de sécurité ============
create or replace function public.dans_groupe(g text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from liens where uid = public.moi() and group_id = g)
$$;

create or replace function public.mon_joueur() returns text
language sql stable security definer set search_path = public as $$
  select player_id from liens where uid = public.moi()
$$;

create or replace function public.proprio(g text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from groupes gr join liens l on l.group_id = gr.id
                 where gr.id = g and l.uid = public.moi() and gr.owner <> '' and gr.owner = l.player_id)
$$;

create or replace function public.est_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where uid = public.moi())
$$;

-- Le cellulaire confirmé du compte est celui inscrit pour ce joueur
create or replace function public.bon_numero(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.mon_numero() <> '' and exists (
    select 1 from telephones t where t.player_id = p
      and (t.e164 = public.mon_numero() or '+1' || t.phone = public.mon_numero()))
$$;

revoke execute on function public.dans_groupe(text), public.mon_joueur(), public.proprio(text),
  public.est_admin(), public.bon_numero(text) from public, anon;
grant execute on function public.dans_groupe(text), public.mon_joueur(), public.proprio(text),
  public.est_admin(), public.bon_numero(text) to authenticated;

-- ============ Déclencheurs ============
-- Le groupe d'une ligne ne change jamais
create or replace function public.garder_groupe() returns trigger language plpgsql as $$
begin
  if new.group_id is distinct from old.group_id then raise exception 'Le groupe ne peut pas changer.'; end if;
  return new;
end $$;
create trigger garder_groupe before update on public.joueurs for each row execute function public.garder_groupe();
create trigger garder_groupe before update on public.parties for each row execute function public.garder_groupe();
create trigger garder_groupe before update on public.offres for each row execute function public.garder_groupe();
create trigger garder_groupe before update on public.competitions for each row execute function public.garder_groupe();
create trigger garder_groupe before update on public.telephones for each row execute function public.garder_groupe();

-- Groupe : forfait réservé à Fanion; propriétaire, organisateurs, archivage et suppression réservés au propriétaire
create or replace function public.proteger_groupe() returns trigger language plpgsql set search_path = public as $$
declare est_proprio boolean;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;  -- Fanion (clé de service, console)
  if new.plan is distinct from old.plan or new.paid_until is distinct from old.paid_until
     or new.max_joueurs is distinct from old.max_joueurs or new.n_players is distinct from old.n_players
     or new.id is distinct from old.id then
    raise exception 'Le forfait est géré par Fanion.';
  end if;
  est_proprio := old.owner <> '' and old.owner = public.mon_joueur();
  if (new.archived is distinct from old.archived or new.deleted is distinct from old.deleted) and not est_proprio then
    raise exception 'Seul le propriétaire archive ou supprime le groupe.';
  end if;
  if old.deleted and not new.deleted then raise exception 'Un groupe supprimé ne revient pas.'; end if;
  if (new.owner is distinct from old.owner or new.organizers is distinct from old.organizers)
     and old.owner <> '' and not est_proprio then
    raise exception 'Seul le propriétaire change le propriétaire ou l''organisateur.';
  end if;
  -- l'organisateur doit avoir accepté son invitation (compte créé)
  if new.organizers is distinct from old.organizers and cardinality(new.organizers) > 0
     and not exists (select 1 from joueurs j where j.id = new.organizers[1] and (j.acct <> '' or j.auth_email <> '')) then
    raise exception 'L''organisateur doit d''abord créer son compte.';
  end if;
  return new;
end $$;
create trigger proteger_groupe before update on public.groupes for each row execute function public.proteger_groupe();

-- Compteur de joueurs du groupe (banque de 64 au plus)
create or replace function public.compter_joueurs() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update groupes set n_players = n_players + 1 where id = new.group_id;
    if (select n_players from groupes where id = new.group_id) > 64 then
      raise exception 'Maximum de 64 joueurs dans la banque du groupe.';
    end if;
    return new;
  else
    update groupes set n_players = greatest(n_players - 1, 0) where id = old.group_id;
    return old;
  end if;
end $$;
create trigger compter_joueurs after insert or delete on public.joueurs for each row execute function public.compter_joueurs();

-- Partie : le responsable la modifie; un autre membre peut la reprendre
create or replace function public.proteger_partie() returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if not (old.owner_uid = public.moi() or old.owner_uid = '' or new.owner_uid = public.moi()) then
    raise exception 'Cette partie appartient à un autre responsable.';
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger proteger_partie before update on public.parties for each row execute function public.proteger_partie();

-- Avis : « approved » est choisi dans la console seulement
create or replace function public.proteger_avis() returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.approved := case when tg_op = 'UPDATE' then old.approved else false end;
  end if;
  return new;
end $$;
create trigger proteger_avis before insert or update on public.avis for each row execute function public.proteger_avis();

-- ============ Sécurité (RLS) ============
alter table public.groupes enable row level security;
alter table public.joueurs enable row level security;
alter table public.liens enable row level security;
alter table public.telephones enable row level security;
alter table public.donnees_groupe enable row level security;
alter table public.offres enable row level security;
alter table public.parties enable row level security;
alter table public.presences enable row level security;
alter table public.competitions enable row level security;
alter table public.abonnements_push enable row level security;
alter table public.avis enable row level security;
alter table public.demandes enable row level security;
alter table public.admins enable row level security;
alter table public.gratuits enable row level security;
alter table public.terrains enable row level security;
alter table public.terrains_proposes enable row level security;
alter table public.cartes_terrains enable row level security;

-- Groupes : création par la fonction creer_groupe seulement
create policy lire on public.groupes for select to authenticated using (public.dans_groupe(id));
create policy modifier on public.groupes for update to authenticated using (public.dans_groupe(id)) with check (public.dans_groupe(id));

-- Joueurs : seul le propriétaire ajoute ou retire; un membre modifie les fiches de son groupe
create policy lire on public.joueurs for select to authenticated using (public.dans_groupe(group_id));
create policy ajouter on public.joueurs for insert to authenticated with check (public.proprio(group_id));
create policy modifier on public.joueurs for update to authenticated using (public.dans_groupe(group_id)) with check (public.dans_groupe(group_id));
create policy retirer on public.joueurs for delete to authenticated using (public.proprio(group_id));

-- Liens : chacun lit le sien; création par la fonction relier_joueur
create policy lire on public.liens for select to authenticated using (uid = public.moi());

-- Téléphones : le groupe, ou mes propres inscriptions (mon cellulaire) dans tous les groupes
create policy lire on public.telephones for select to authenticated
  using (public.dans_groupe(group_id) or (public.mon_numero() <> '' and e164 = public.mon_numero()));
create policy ecrire on public.telephones for insert to authenticated
  with check (public.dans_groupe(group_id) and e164 = '+1' || phone
              and exists (select 1 from public.joueurs j where j.id = player_id and j.group_id = telephones.group_id));
create policy modifier on public.telephones for update to authenticated
  using (public.dans_groupe(group_id)) with check (public.dans_groupe(group_id) and e164 = '+1' || phone);
create policy effacer on public.telephones for delete to authenticated using (public.dans_groupe(group_id));

-- Données privées du groupe
create policy lire on public.donnees_groupe for select to authenticated using (public.dans_groupe(group_id));
create policy creer on public.donnees_groupe for insert to authenticated with check (public.dans_groupe(group_id));
create policy modifier on public.donnees_groupe for update to authenticated using (public.dans_groupe(group_id)) with check (public.dans_groupe(group_id));

-- Offres : tout le groupe
create policy groupe on public.offres for all to authenticated using (public.dans_groupe(group_id)) with check (public.dans_groupe(group_id));

-- Parties
create policy lire on public.parties for select to authenticated using (public.dans_groupe(group_id));
create policy creer on public.parties for insert to authenticated with check (public.dans_groupe(group_id) and owner_uid = public.moi());
create policy modifier on public.parties for update to authenticated using (public.dans_groupe(group_id)) with check (public.dans_groupe(group_id));
create policy effacer on public.parties for delete to authenticated using (public.dans_groupe(group_id) and owner_uid = public.moi());

-- Présences : le groupe de la partie
create policy groupe on public.presences for all to authenticated
  using (exists (select 1 from public.parties p where p.id = game_id and public.dans_groupe(p.group_id)))
  with check (exists (select 1 from public.parties p where p.id = game_id and public.dans_groupe(p.group_id)));

-- Compétitions : le propriétaire crée et supprime; le groupe lit et inscrit les scores
create policy lire on public.competitions for select to authenticated using (public.dans_groupe(group_id));
create policy creer on public.competitions for insert to authenticated with check (public.proprio(group_id));
create policy modifier on public.competitions for update to authenticated using (public.dans_groupe(group_id)) with check (public.dans_groupe(group_id));
create policy effacer on public.competitions for delete to authenticated using (public.proprio(group_id));

-- Notifications : chacun abonne son téléphone; le groupe lit les abonnements (pour envoyer)
create policy lire on public.abonnements_push for select to authenticated using (uid = public.moi() or public.dans_groupe(group_id));
create policy creer on public.abonnements_push for insert to authenticated with check (
  uid = public.moi() and id = public.moi() || '_' || group_id
  and exists (select 1 from public.joueurs j where j.id = player_id and j.group_id = abonnements_push.group_id)
  and (public.bon_numero(player_id) or (public.dans_groupe(group_id) and public.mon_joueur() = player_id)));
create policy modifier on public.abonnements_push for update to authenticated using (uid = public.moi()) with check (
  uid = public.moi() and id = public.moi() || '_' || group_id
  and (public.bon_numero(player_id) or (public.dans_groupe(group_id) and public.mon_joueur() = player_id)));
create policy effacer on public.abonnements_push for delete to authenticated using (uid = public.moi());

-- Avis : un par compte; publics une fois approuvés
create policy lire on public.avis for select to anon, authenticated using (approved or uid = public.moi());
create policy creer on public.avis for insert to authenticated with check (uid = public.moi());
create policy modifier on public.avis for update to authenticated using (uid = public.moi()) with check (uid = public.moi());
create policy effacer on public.avis for delete to authenticated using (uid = public.moi());

-- Demandes d'ajout de jeux : envoyées seulement
create policy envoyer on public.demandes for insert to authenticated with check (uid = public.moi());

-- Équipe Fanion
create policy lire on public.admins for select to authenticated using (uid = public.moi());

-- Groupe gratuit : lu par son compte; libéré quand le groupe est supprimé ou payé
create policy lire on public.gratuits for select to authenticated using (uid = public.moi());
create policy liberer on public.gratuits for delete to authenticated using (
  uid = public.moi() and not exists (select 1 from public.groupes g where g.id = group_id and not g.deleted and g.plan <> 'groupe'));

-- Terrains communs
create policy lire on public.terrains for select to authenticated using (true);
create policy modifier on public.terrains for update to authenticated using (true) with check (true);
create policy creer on public.terrains for insert to authenticated with check (public.est_admin() or id like 'qc-%' or id = 'pinegrove');

create policy creer on public.terrains_proposes for insert to authenticated
  with check (public.dans_groupe(groupe) and propose_uid = public.moi() and statut = 'propose');
create policy lire on public.terrains_proposes for select to authenticated using (public.est_admin() or public.dans_groupe(groupe));
create policy decider on public.terrains_proposes for update to authenticated using (public.est_admin()) with check (public.est_admin());
create policy effacer on public.terrains_proposes for delete to authenticated
  using (public.est_admin() or (propose_uid = public.moi() and statut = 'propose'));

create policy lire on public.cartes_terrains for select to authenticated using (true);
create policy ecrire on public.cartes_terrains for all to authenticated using (public.est_admin()) with check (public.est_admin());

-- ============ Fonctions appelées par l'app ============
-- Créer un groupe avec son fondateur (un seul groupe gratuit par compte)
create or replace function public.creer_groupe(p_groupe text, p_joueur text, p_donnees_groupe jsonb, p_donnees_joueur jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare u text := public.moi();
begin
  if u is null then raise exception 'Connexion requise.'; end if;
  if exists (select 1 from gratuits where uid = u) then raise exception 'Vous avez déjà un groupe gratuit.'; end if;
  insert into groupes (id, owner, data) values (p_groupe, p_joueur, coalesce(p_donnees_groupe, '{}'));
  insert into joueurs (id, group_id, acct, data) values (p_joueur, p_groupe, u, coalesce(p_donnees_joueur, '{}'));
  insert into liens (uid, player_id, group_id) values (u, p_joueur, p_groupe)
    on conflict (uid) do update set player_id = excluded.player_id, group_id = excluded.group_id, at = now();
  insert into gratuits (uid, group_id) values (u, p_groupe);
  if public.mon_numero() <> '' then
    insert into telephones (player_id, group_id, phone, e164)
    values (p_joueur, p_groupe, right(public.mon_numero(), 10), public.mon_numero());
  end if;
end $$;

-- Relier mon compte à un joueur : mon cellulaire confirmé est le sien, ou son courriel est celui de mon compte
create or replace function public.relier_joueur(p_joueur text) returns text
language plpgsql security definer set search_path = public as $$
declare u text := public.moi(); g text; courriel text := coalesce(auth.jwt()->>'email', '');
begin
  if u is null then raise exception 'Connexion requise.'; end if;
  select group_id into g from joueurs where id = p_joueur;
  if g is null then raise exception 'Joueur introuvable.'; end if;
  if not (public.bon_numero(p_joueur)
          or (courriel <> '' and exists (select 1 from joueurs where id = p_joueur and lower(auth_email) = lower(courriel)))) then
    raise exception 'Ce joueur n''est pas relié à votre cellulaire.';
  end if;
  insert into liens (uid, player_id, group_id) values (u, p_joueur, g)
    on conflict (uid) do update set player_id = excluded.player_id, group_id = excluded.group_id, at = now();
  update joueurs set acct = u where id = p_joueur and acct = '';
  return g;
end $$;

-- Mes inscriptions dans tous les groupes (écran « choisir mon groupe »)
create or replace function public.mes_joueurs()
returns table (player_id text, group_id text, nom_joueur jsonb, nom_groupe jsonb)
language sql stable security definer set search_path = public as $$
  select j.id, j.group_id, j.data, g.data
  from telephones t join joueurs j on j.id = t.player_id join groupes g on g.id = j.group_id
  where public.mon_numero() <> '' and t.e164 = public.mon_numero() and not g.deleted
$$;

-- Fusions partielles (comme set({ … }, { merge: true }) de Firestore)
create or replace function public.presence_maj(p_partie text, p_cle text, p_valeur jsonb) returns void
language sql security invoker set search_path = public as $$
  insert into presences (game_id, data) values (p_partie, jsonb_build_object(p_cle, p_valeur))
  on conflict (game_id) do update set data = presences.data || jsonb_build_object(p_cle, p_valeur)
$$;

create or replace function public.comp_score(p_comp text, p_equipe text, p_trou text, p_valeur jsonb) returns void
language sql security invoker set search_path = public as $$
  update competitions set scores = jsonb_set(
    scores || jsonb_build_object(p_equipe, coalesce(scores->p_equipe, '{}'::jsonb)),
    array[p_equipe, p_trou], p_valeur, true)
  where id = p_comp
$$;

create or replace function public.comp_maj(p_comp text, p_chemin text[], p_valeur jsonb) returns void
language plpgsql security invoker set search_path = public as $$
declare i int;
begin
  -- crée les niveaux intermédiaires au besoin, puis écrit la valeur
  for i in 1 .. cardinality(p_chemin) - 1 loop
    update competitions set data = jsonb_set(data, p_chemin[1:i], coalesce(data #> p_chemin[1:i], '{}'::jsonb), true) where id = p_comp;
  end loop;
  update competitions set data = jsonb_set(data, p_chemin, p_valeur, true) where id = p_comp;
end $$;

revoke execute on function public.creer_groupe(text, text, jsonb, jsonb), public.relier_joueur(text), public.mes_joueurs(),
  public.presence_maj(text, text, jsonb), public.comp_score(text, text, text, jsonb), public.comp_maj(text, text[], jsonb)
  from public, anon;
grant execute on function public.creer_groupe(text, text, jsonb, jsonb), public.relier_joueur(text), public.mes_joueurs(),
  public.presence_maj(text, text, jsonb), public.comp_score(text, text, text, jsonb), public.comp_maj(text, text[], jsonb)
  to authenticated;

-- ============ Temps réel (remplace onSnapshot) ============
alter publication supabase_realtime add table public.parties, public.presences, public.competitions;

-- ============ Corrections après l'avis de sécurité Supabase ============
alter function public.garder_groupe() set search_path = public;
alter function public.moi() set search_path = public;
alter function public.mon_numero() set search_path = public;
revoke execute on function public.compter_joueurs() from public, anon, authenticated;
