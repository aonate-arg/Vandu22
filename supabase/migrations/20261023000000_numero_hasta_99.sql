-- Permite elegir el número 99 (antes era de 01 a 98).
-- Para la base que ya tiene la tabla perfiles creada con la regla vieja.
-- Se puede correr más de una vez sin romper nada (SQL Editor de Supabase).

alter table public.perfiles drop constraint if exists perfiles_numero_check;
alter table public.perfiles add constraint perfiles_numero_check
  check (numero ~ '^(0[1-9]|[1-9][0-9])$');
