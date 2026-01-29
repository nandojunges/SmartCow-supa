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
  created_at timestamptz not null default now(),
  unique (fazenda_id, convidado_email),
  unique (token)
);

alter table public.fazendas enable row level security;
alter table public.fazenda_acessos enable row level security;
alter table public.convites_acesso enable row level security;

create policy "fazendas_select_owner_or_access"
  on public.fazendas
  for select
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.fazenda_acessos
      where fazenda_acessos.fazenda_id = fazendas.id
        and fazenda_acessos.user_id = auth.uid()
    )
  );

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
