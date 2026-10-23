-- Perfiles de usuario de la página de 22.
-- Cada cuenta de Supabase Auth (auth.users) tiene un perfil con los datos del formulario "Crear cuenta".
-- Se puede correr más de una vez sin romper nada (SQL Editor de Supabase o migración desde GitHub).

create table if not exists public.perfiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  nombre           text not null check (char_length(btrim(nombre)) between 1 and 60),
  apellido         text not null check (char_length(btrim(apellido)) between 1 and 60),
  fecha_nacimiento date not null check (fecha_nacimiento > date '1900-01-01'),
  email            text not null,
  escuderia        text not null check (char_length(btrim(escuderia)) between 1 and 40),
  -- Siempre dos dígitos, de 01 a 99 (se guarda como texto para conservar el 0 de adelante)
  numero           text not null constraint perfiles_numero_check check (numero ~ '^(0[1-9]|[1-8][0-9]|9[0-9])$'),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

-- Si la tabla ya existía con el número como entero (versión anterior de este archivo), la pasa a dos dígitos
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'perfiles' and column_name = 'numero' and data_type = 'smallint'
  ) then
    alter table public.perfiles drop constraint if exists perfiles_numero_check;
    alter table public.perfiles alter column numero type text using lpad(numero::text, 2, '0');
    alter table public.perfiles add constraint perfiles_numero_check
      check (numero ~ '^(0[1-9]|[1-8][0-9]|9[0-9])$');
  end if;
end;
$$;

comment on table public.perfiles is 'Datos que cada persona carga al crear su cuenta en la página de 22.';

-- Seguridad: cada persona solo puede ver y editar su propio perfil.
-- No hay permiso de insertar desde la página: el perfil lo crea el trigger de abajo.
alter table public.perfiles enable row level security;

drop policy if exists "Ver mi perfil" on public.perfiles;
create policy "Ver mi perfil" on public.perfiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Editar mi perfil" on public.perfiles;
create policy "Editar mi perfil" on public.perfiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Mantiene actualizado_en al día en cada cambio.
create or replace function public.perfiles_actualizado_en()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists perfiles_actualizado_en on public.perfiles;
create trigger perfiles_actualizado_en
  before update on public.perfiles
  for each row execute function public.perfiles_actualizado_en();

-- Al crear una cuenta, copia los datos del formulario (que llegan en raw_user_meta_data) a perfiles.
-- Si la cuenta se crea a mano desde el panel de Supabase, sin esos datos, no crea perfil.
create or replace function public.crear_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  datos jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if datos ? 'nombre' then
    insert into public.perfiles (id, nombre, apellido, fecha_nacimiento, email, escuderia, numero)
    values (
      new.id,
      btrim(datos ->> 'nombre'),
      btrim(datos ->> 'apellido'),
      (datos ->> 'fecha_nacimiento')::date,
      new.email,
      btrim(datos ->> 'escuderia'),
      lpad(btrim(datos ->> 'numero'), 2, '0')
    );
  end if;
  return new;
end;
$$;

drop trigger if exists crear_perfil on auth.users;
create trigger crear_perfil
  after insert on auth.users
  for each row execute function public.crear_perfil();
