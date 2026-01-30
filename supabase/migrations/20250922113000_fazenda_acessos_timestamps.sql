begin;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table public.fazenda_acessos
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_fazenda_acessos_updated_at'
  ) then
    create trigger trg_fazenda_acessos_updated_at
    before update on public.fazenda_acessos
    for each row
    execute function public.set_updated_at();
  end if;
end $$;

commit;
