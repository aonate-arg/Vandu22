-- Prode de cada GP: el top 10 que arma cada persona (prode.html, js/prode.js).
-- Un prode por persona y por GP; se puede cambiar hasta que larga la carrera.
-- Se puede correr más de una vez sin romper nada (SQL Editor de Supabase).
-- Necesita la tabla perfiles (20261022000000_perfiles.sql) ya creada.

create table if not exists public.prodes (
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Datos del GP, tal cual están en data/content.json
  gran_premio    text not null check (char_length(btrim(gran_premio)) between 1 and 80),
  fecha_gp       timestamptz not null, -- largada de la carrera (largada_carrera): el prode cierra ahí
  -- Los 10 pilotos en orden: pilotos[1] es el ganador
  pilotos        text[] not null,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  primary key (user_id, fecha_gp)
);

comment on table public.prodes is 'Top 10 que arma cada persona para cada GP (prode.html).';

-- Seguridad: cada persona solo puede ver, crear y cambiar su propio prode.
alter table public.prodes enable row level security;

drop policy if exists "Ver mi prode" on public.prodes;
create policy "Ver mi prode" on public.prodes
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Crear mi prode" on public.prodes;
create policy "Crear mi prode" on public.prodes
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Cambiar mi prode" on public.prodes;
create policy "Cambiar mi prode" on public.prodes
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Controles: 10 pilotos distintos y nada de cambios con la carrera ya largada.
create or replace function public.prodes_validar()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if now() >= new.fecha_gp then
    raise exception 'El prode de este GP ya cerró';
  end if;
  if coalesce(array_length(new.pilotos, 1), 0) <> 10
     or (select count(distinct btrim(p)) from unnest(new.pilotos) as p where btrim(p) <> '') <> 10 then
    raise exception 'El prode tiene que tener 10 pilotos distintos';
  end if;
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists prodes_validar on public.prodes;
create trigger prodes_validar
  before insert or update on public.prodes
  for each row execute function public.prodes_validar();
