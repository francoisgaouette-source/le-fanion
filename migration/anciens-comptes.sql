-- À appliquer AVANT l'import. Les comptes Firebase deviennent des comptes HoldingAI (identifiants différents).
-- Quand un joueur se relie à son compte HoldingAI (table liens), ce qui appartenait à son ancien compte Firebase lui revient :
-- parties dont il était responsable, son avis, son rôle d'administrateur, son groupe gratuit.
create table if not exists public.anciens_comptes (
  fb_uid text primary key,
  player_id text not null
);
alter table public.anciens_comptes enable row level security;  -- aucune règle : invisible pour l'app

create or replace function public.reprendre_ancien_compte() returns trigger
language plpgsql security definer set search_path = public as $$
declare anciens text[];
begin
  select array_agg(fb_uid) into anciens from anciens_comptes where player_id = new.player_id;
  if anciens is null then return new; end if;
  update parties set owner_uid = new.uid where owner_uid = any(anciens);
  update avis set uid = new.uid where uid = any(anciens) and not exists (select 1 from avis a where a.uid = new.uid);
  insert into admins (uid) select new.uid where exists (select 1 from admins where uid = any(anciens)) on conflict do nothing;
  update terrains_proposes set propose_uid = new.uid where propose_uid = any(anciens);
  delete from anciens_comptes where fb_uid = any(anciens);
  return new;
end $$;

drop trigger if exists liens_reprendre_ancien_compte on public.liens;
create trigger liens_reprendre_ancien_compte after insert or update of player_id on public.liens
  for each row execute function public.reprendre_ancien_compte();
