alter table public.asistentes
  add column if not exists rol text default 'participante',
  add column if not exists rol_descripcion text,
  add column if not exists compania_numero smallint,
  add column if not exists barrio text,
  add column if not exists compania_pareja_id uuid references public.asistentes(id) on delete set null;

create index if not exists idx_asistentes_rol on public.asistentes(rol);
create index if not exists idx_asistentes_compania on public.asistentes(compania_numero);
