create extension if not exists "pgcrypto";

create table if not exists public.fazendas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  nome text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, nome)
);

create table if not exists public.fazenda_acessos (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ATIVO',
  profissional_tipo text,
  profissional_nome text,
  created_at timestamptz not null default now(),
  unique (fazenda_id, user_id)
);

create table if not exists public.convites_acesso (
  id uuid primary key default gen_random_uuid(),
  fazenda_id uuid not null references public.fazendas(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  convidado_email text not null,
  status text not null default 'pendente',
  token uuid not null default gen_random_uuid(),
  profissional_tipo text,
  profissional_nome text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (fazenda_id, convidado_email),
  unique (token)
);

alter table public.fazenda_acessos
  add column if not exists status text not null default 'ATIVO',
  add column if not exists profissional_tipo text,
  add column if not exists profissional_nome text;

alter table public.convites_acesso
  add column if not exists status text not null default 'pendente',
  add column if not exists profissional_tipo text,
  add column if not exists profissional_nome text,
  add column if not exists accepted_at timestamptz,
  add column if not exists revoked_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.fazenda_acessos
  alter column status set default 'ATIVO';

alter table public.convites_acesso
  alter column status set default 'pendente';

update public.fazenda_acessos
set status = 'ATIVO'
where status is null;

update public.convites_acesso
set status = lower(status)
where status is not null;

alter table public.fazendas enable row level security;
alter table public.fazenda_acessos enable row level security;
alter table public.convites_acesso enable row level security;

drop policy if exists "fazendas_select_owner_or_access" on public.fazendas;
drop policy if exists "fazendas_select_owner" on public.fazendas;
drop policy if exists "fazendas_insert_owner" on public.fazendas;
drop policy if exists "fazendas_update_owner" on public.fazendas;
drop policy if exists "fazendas_delete_owner" on public.fazendas;

create policy "fazendas_select_owner"
  on public.fazendas
  for select
  using (owner_id = auth.uid());

create policy "fazendas_insert_owner"
  on public.fazendas
  for insert
  with check (owner_id = auth.uid());

create policy "fazendas_update_owner"
  on public.fazendas
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "fazendas_delete_owner"
  on public.fazendas
  for delete
  using (owner_id = auth.uid());

drop policy if exists "fazenda_acessos_select_owner_or_user" on public.fazenda_acessos;
drop policy if exists "fazenda_acessos_insert_owner" on public.fazenda_acessos;
drop policy if exists "fazenda_acessos_delete_owner" on public.fazenda_acessos;
drop policy if exists "fazenda_acessos_update_owner" on public.fazenda_acessos;

create policy "fazenda_acessos_select_owner_or_user"
  on public.fazenda_acessos
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.fazendas
      where fazendas.id = fazenda_acessos.fazenda_id
        and fazendas.owner_id = auth.uid()
    )
  );

create policy "fazenda_acessos_insert_owner"
  on public.fazenda_acessos
  for insert
  with check (
    exists (
      select 1
      from public.fazendas
      where fazendas.id = fazenda_acessos.fazenda_id
        and fazendas.owner_id = auth.uid()
    )
  );

create policy "fazenda_acessos_delete_owner"
  on public.fazenda_acessos
  for delete
  using (
    exists (
      select 1
      from public.fazendas
      where fazendas.id = fazenda_acessos.fazenda_id
        and fazendas.owner_id = auth.uid()
    )
  );

create policy "fazenda_acessos_update_owner"
  on public.fazenda_acessos
  for update
  using (
    exists (
      select 1
      from public.fazendas
      where fazendas.id = fazenda_acessos.fazenda_id
        and fazendas.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.fazendas
      where fazendas.id = fazenda_acessos.fazenda_id
        and fazendas.owner_id = auth.uid()
    )
  );

drop policy if exists "convites_acesso_select_owner" on public.convites_acesso;
drop policy if exists "convites_acesso_insert_owner" on public.convites_acesso;
drop policy if exists "convites_acesso_update_owner" on public.convites_acesso;
drop policy if exists "convites_acesso_delete_owner" on public.convites_acesso;

create policy "convites_acesso_select_owner"
  on public.convites_acesso
  for select
  using (
    exists (
      select 1
      from public.fazendas
      where fazendas.id = convites_acesso.fazenda_id
        and fazendas.owner_id = auth.uid()
    )
  );

create policy "convites_acesso_insert_owner"
  on public.convites_acesso
  for insert
  with check (
    exists (
      select 1
      from public.fazendas
      where fazendas.id = convites_acesso.fazenda_id
        and fazendas.owner_id = auth.uid()
    )
  );

create policy "convites_acesso_update_owner"
  on public.convites_acesso
  for update
  using (
    exists (
      select 1
      from public.fazendas
      where fazendas.id = convites_acesso.fazenda_id
        and fazendas.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.fazendas
      where fazendas.id = convites_acesso.fazenda_id
        and fazendas.owner_id = auth.uid()
    )
  );

create policy "convites_acesso_delete_owner"
  on public.convites_acesso
  for delete
  using (
    exists (
      select 1
      from public.fazendas
      where fazendas.id = convites_acesso.fazenda_id
        and fazendas.owner_id = auth.uid()
    )
  );

create or replace function public.criar_convite_acesso(
  p_fazenda_id uuid,
  p_email text,
  p_role text default null,
  p_nome text default null
)
returns table (convite_id uuid, status text, token uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  select owner_id into v_owner
  from public.fazendas
  where id = p_fazenda_id;

  if v_owner is null then
    raise exception 'Fazenda não encontrada';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Você não tem permissão para convidar nesta fazenda';
  end if;

  v_email := lower(trim(p_email));
  if v_email is null or v_email = '' then
    raise exception 'E-mail inválido';
  end if;

  return query
  insert into public.convites_acesso (
    fazenda_id,
    invited_by,
    convidado_email,
    status,
    token,
    profissional_tipo,
    profissional_nome,
    created_at,
    accepted_at,
    revoked_at,
    updated_at
  )
  values (
    p_fazenda_id,
    auth.uid(),
    v_email,
    'pendente',
    gen_random_uuid(),
    p_role,
    p_nome,
    now(),
    null,
    null,
    now()
  )
  on conflict (fazenda_id, convidado_email)
  do update set
    invited_by = excluded.invited_by,
    status = 'pendente',
    token = gen_random_uuid(),
    profissional_tipo = excluded.profissional_tipo,
    profissional_nome = excluded.profissional_nome,
    created_at = now(),
    accepted_at = null,
    revoked_at = null,
    updated_at = now()
  returning id, status, token;
end;
$$;

create or replace function public.aceitar_convite_acesso(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_convite public.convites_acesso%rowtype;
  v_email text;
  v_profile_email text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  select * into v_convite
  from public.convites_acesso
  where token = p_token;

  if not found then
    raise exception 'Convite não encontrado';
  end if;

  v_email := lower(coalesce(auth.email(), ''));

  select lower(email) into v_profile_email
  from public.profiles
  where id = auth.uid();

  if v_email <> lower(v_convite.convidado_email)
     and coalesce(v_profile_email, '') <> lower(v_convite.convidado_email) then
    raise exception 'Este convite não pertence ao seu e-mail';
  end if;

  insert into public.fazenda_acessos (
    fazenda_id,
    user_id,
    status,
    profissional_tipo,
    profissional_nome,
    created_at
  )
  values (
    v_convite.fazenda_id,
    auth.uid(),
    'ATIVO',
    v_convite.profissional_tipo,
    v_convite.profissional_nome,
    now()
  )
  on conflict (fazenda_id, user_id)
  do update set
    status = 'ATIVO',
    profissional_tipo = excluded.profissional_tipo,
    profissional_nome = excluded.profissional_nome;

  update public.convites_acesso
  set status = 'aceito',
      accepted_at = now(),
      revoked_at = null,
      updated_at = now()
  where id = v_convite.id;

  return v_convite.fazenda_id;
end;
$$;

create or replace function public.bloquear_acesso(
  p_fazenda_id uuid,
  p_user_id uuid,
  p_bloquear boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_status text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  select owner_id into v_owner
  from public.fazendas
  where id = p_fazenda_id;

  if v_owner is null then
    raise exception 'Fazenda não encontrada';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Você não tem permissão para alterar acessos nesta fazenda';
  end if;

  v_status := case when p_bloquear then 'BLOQUEADO' else 'ATIVO' end;

  update public.fazenda_acessos
  set status = v_status
  where fazenda_id = p_fazenda_id
    and user_id = p_user_id;
end;
$$;

create or replace function public.remover_acesso(
  p_fazenda_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  select owner_id into v_owner
  from public.fazendas
  where id = p_fazenda_id;

  if v_owner is null then
    raise exception 'Fazenda não encontrada';
  end if;

  if v_owner <> auth.uid() then
    raise exception 'Você não tem permissão para remover acessos nesta fazenda';
  end if;

  delete from public.fazenda_acessos
  where fazenda_id = p_fazenda_id
    and user_id = p_user_id;
end;
$$;

create or replace function public.listar_meus_convites()
returns table (
  id uuid,
  fazenda_id uuid,
  fazenda_nome text,
  convidado_email text,
  status text,
  token uuid,
  profissional_tipo text,
  profissional_nome text,
  created_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_profile_email text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  v_email := lower(coalesce(auth.email(), ''));

  select lower(email) into v_profile_email
  from public.profiles
  where id = auth.uid();

  return query
  select
    convites.id,
    convites.fazenda_id,
    fazendas.nome,
    convites.convidado_email,
    convites.status,
    convites.token,
    convites.profissional_tipo,
    convites.profissional_nome,
    convites.created_at,
    convites.accepted_at,
    convites.revoked_at,
    convites.updated_at
  from public.convites_acesso convites
  join public.fazendas fazendas on fazendas.id = convites.fazenda_id
  where convites.status = 'pendente'
    and (
      convites.convidado_email = v_email
      or convites.convidado_email = coalesce(v_profile_email, '')
    )
  order by convites.created_at desc;
end;
$$;

create or replace function public.listar_fazendas_com_acesso()
returns table (
  acesso_id uuid,
  fazenda_id uuid,
  fazenda_nome text,
  owner_id uuid,
  status text,
  created_at timestamptz,
  profissional_tipo text,
  profissional_nome text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  return query
  select
    acessos.id,
    acessos.fazenda_id,
    fazendas.nome,
    fazendas.owner_id,
    acessos.status,
    acessos.created_at,
    acessos.profissional_tipo,
    acessos.profissional_nome
  from public.fazenda_acessos acessos
  join public.fazendas fazendas on fazendas.id = acessos.fazenda_id
  where acessos.user_id = auth.uid()
    and lower(acessos.status) = 'ativo'
  order by acessos.created_at desc;
end;
$$;

create or replace function public.listar_convites_pendentes()
returns table (
  id uuid,
  fazenda_id uuid,
  fazenda_nome text,
  convidado_email text,
  status text,
  profissional_tipo text,
  profissional_nome text,
  created_at timestamptz,
  invited_by uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_profile_email text;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado';
  end if;

  v_email := lower(coalesce(auth.email(), ''));

  select lower(email) into v_profile_email
  from public.profiles
  where id = auth.uid();

  return query
  select
    convites.id,
    convites.fazenda_id,
    fazendas.nome,
    convites.convidado_email,
    convites.status,
    convites.profissional_tipo,
    convites.profissional_nome,
    convites.created_at,
    convites.invited_by
  from public.convites_acesso convites
  join public.fazendas fazendas on fazendas.id = convites.fazenda_id
  where convites.status = 'pendente'
    and (
      convites.convidado_email = v_email
      or convites.convidado_email = coalesce(v_profile_email, '')
    )
  order by convites.created_at desc;
end;
$$;
