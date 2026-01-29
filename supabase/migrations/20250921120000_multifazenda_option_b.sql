begin;

-- 1) garantir fazenda default por produtor
insert into public.fazendas (nome, owner_user_id)
select
  coalesce(nullif(trim(p.fazenda), ''), 'Minha fazenda') as nome,
  p.id as owner_user_id
from public.profiles p
where p.tipo_conta = 'PRODUTOR'
  and not exists (
    select 1
    from public.fazendas f
    where f.owner_user_id = p.id
  );

-- 2) ajustes de convites e acessos
alter table public.convites_acesso
  add column if not exists tipo_profissional text,
  add column if not exists nome_profissional text;

alter table public.fazenda_acessos
  add column if not exists ativo boolean default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'fazenda_acessos_fazenda_id_user_id_key'
  ) then
    alter table public.fazenda_acessos
      add constraint fazenda_acessos_fazenda_id_user_id_key unique (fazenda_id, user_id);
  end if;
end $$;

-- 3) adicionar fazenda_id nas tabelas de domínio
alter table public.animais add column if not exists fazenda_id uuid;
alter table public.racas add column if not exists fazenda_id uuid;
alter table public.lotes add column if not exists fazenda_id uuid;
alter table public.eventos_reprodutivos add column if not exists fazenda_id uuid;
alter table public.saidas_animais add column if not exists fazenda_id uuid;
alter table public.medicoes_leite add column if not exists fazenda_id uuid;
alter table public.leite_responsaveis add column if not exists fazenda_id uuid;
alter table public.leite_laboratorios add column if not exists fazenda_id uuid;
alter table public.leite_cmt_testes add column if not exists fazenda_id uuid;
alter table public.leite_cmt_quartos add column if not exists fazenda_id uuid;
alter table public.leite_ccs_registros add column if not exists fazenda_id uuid;
alter table public.estoque_produtos add column if not exists fazenda_id uuid;
alter table public.estoque_lotes add column if not exists fazenda_id uuid;
alter table public.estoque_movimentos add column if not exists fazenda_id uuid;
alter table public.dietas add column if not exists fazenda_id uuid;
alter table public.dietas_itens add column if not exists fazenda_id uuid;
alter table public.financeiro_lancamentos add column if not exists fazenda_id uuid;

-- 4) backfill via user_id
update public.animais a
set fazenda_id = (
  select f.id from public.fazendas f where f.owner_user_id = a.user_id limit 1
)
where a.fazenda_id is null and a.user_id is not null;

update public.racas r
set fazenda_id = (
  select f.id from public.fazendas f where f.owner_user_id = r.user_id limit 1
)
where r.fazenda_id is null and r.user_id is not null;

update public.lotes l
set fazenda_id = (
  select f.id from public.fazendas f where f.owner_user_id = l.user_id limit 1
)
where l.fazenda_id is null and l.user_id is not null;

update public.estoque_produtos p
set fazenda_id = (
  select f.id from public.fazendas f where f.owner_user_id = p.user_id limit 1
)
where p.fazenda_id is null and p.user_id is not null;

update public.financeiro_lancamentos fl
set fazenda_id = (
  select f.id from public.fazendas f where f.owner_user_id = fl.user_id limit 1
)
where fl.fazenda_id is null and fl.user_id is not null;

update public.leite_responsaveis lr
set fazenda_id = (
  select f.id from public.fazendas f where f.owner_user_id = lr.user_id limit 1
)
where lr.fazenda_id is null and lr.user_id is not null;

update public.leite_laboratorios ll
set fazenda_id = (
  select f.id from public.fazendas f where f.owner_user_id = ll.user_id limit 1
)
where ll.fazenda_id is null and ll.user_id is not null;

-- 5) backfill via joins
update public.eventos_reprodutivos er
set fazenda_id = a.fazenda_id
from public.animais a
where er.fazenda_id is null and er.animal_id = a.id and a.fazenda_id is not null;

update public.saidas_animais sa
set fazenda_id = a.fazenda_id
from public.animais a
where sa.fazenda_id is null and sa.animal_id = a.id and a.fazenda_id is not null;

update public.medicoes_leite ml
set fazenda_id = a.fazenda_id
from public.animais a
where ml.fazenda_id is null and ml.animal_id = a.id and a.fazenda_id is not null;

update public.leite_cmt_testes lct
set fazenda_id = a.fazenda_id
from public.animais a
where lct.fazenda_id is null and lct.animal_id = a.id and a.fazenda_id is not null;

update public.leite_ccs_registros lccs
set fazenda_id = a.fazenda_id
from public.animais a
where lccs.fazenda_id is null and lccs.animal_id = a.id and a.fazenda_id is not null;

update public.leite_cmt_quartos lcq
set fazenda_id = lct.fazenda_id
from public.leite_cmt_testes lct
where lcq.fazenda_id is null and lcq.teste_id = lct.id and lct.fazenda_id is not null;

update public.estoque_lotes el
set fazenda_id = p.fazenda_id
from public.estoque_produtos p
where el.fazenda_id is null and el.produto_id = p.id and p.fazenda_id is not null;

update public.estoque_movimentos em
set fazenda_id = p.fazenda_id
from public.estoque_produtos p
where em.fazenda_id is null and em.produto_id = p.id and p.fazenda_id is not null;

update public.dietas d
set fazenda_id = l.fazenda_id
from public.lotes l
where d.fazenda_id is null and d.lote_id = l.id and l.fazenda_id is not null;

update public.dietas_itens di
set fazenda_id = d.fazenda_id
from public.dietas d
where di.fazenda_id is null and di.dieta_id = d.id and d.fazenda_id is not null;

-- 6) NOT NULL + FK + índices
alter table public.animais alter column fazenda_id set not null;
alter table public.racas alter column fazenda_id set not null;
alter table public.lotes alter column fazenda_id set not null;
alter table public.eventos_reprodutivos alter column fazenda_id set not null;
alter table public.saidas_animais alter column fazenda_id set not null;
alter table public.medicoes_leite alter column fazenda_id set not null;
alter table public.leite_responsaveis alter column fazenda_id set not null;
alter table public.leite_laboratorios alter column fazenda_id set not null;
alter table public.leite_cmt_testes alter column fazenda_id set not null;
alter table public.leite_cmt_quartos alter column fazenda_id set not null;
alter table public.leite_ccs_registros alter column fazenda_id set not null;
alter table public.estoque_produtos alter column fazenda_id set not null;
alter table public.estoque_lotes alter column fazenda_id set not null;
alter table public.estoque_movimentos alter column fazenda_id set not null;
alter table public.dietas alter column fazenda_id set not null;
alter table public.dietas_itens alter column fazenda_id set not null;
alter table public.financeiro_lancamentos alter column fazenda_id set not null;

alter table public.animais add constraint animais_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.racas add constraint racas_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.lotes add constraint lotes_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.eventos_reprodutivos add constraint eventos_reprodutivos_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.saidas_animais add constraint saidas_animais_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.medicoes_leite add constraint medicoes_leite_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.leite_responsaveis add constraint leite_responsaveis_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.leite_laboratorios add constraint leite_laboratorios_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.leite_cmt_testes add constraint leite_cmt_testes_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.leite_cmt_quartos add constraint leite_cmt_quartos_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.leite_ccs_registros add constraint leite_ccs_registros_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.estoque_produtos add constraint estoque_produtos_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.estoque_lotes add constraint estoque_lotes_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.estoque_movimentos add constraint estoque_movimentos_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.dietas add constraint dietas_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.dietas_itens add constraint dietas_itens_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);
alter table public.financeiro_lancamentos add constraint financeiro_lancamentos_fazenda_id_fkey foreign key (fazenda_id) references public.fazendas(id);

create index if not exists animais_fazenda_id_idx on public.animais (fazenda_id);
create index if not exists racas_fazenda_id_idx on public.racas (fazenda_id);
create index if not exists lotes_fazenda_id_idx on public.lotes (fazenda_id);
create index if not exists eventos_reprodutivos_fazenda_id_idx on public.eventos_reprodutivos (fazenda_id);
create index if not exists saidas_animais_fazenda_id_idx on public.saidas_animais (fazenda_id);
create index if not exists medicoes_leite_fazenda_id_idx on public.medicoes_leite (fazenda_id);
create index if not exists leite_responsaveis_fazenda_id_idx on public.leite_responsaveis (fazenda_id);
create index if not exists leite_laboratorios_fazenda_id_idx on public.leite_laboratorios (fazenda_id);
create index if not exists leite_cmt_testes_fazenda_id_idx on public.leite_cmt_testes (fazenda_id);
create index if not exists leite_cmt_quartos_fazenda_id_idx on public.leite_cmt_quartos (fazenda_id);
create index if not exists leite_ccs_registros_fazenda_id_idx on public.leite_ccs_registros (fazenda_id);
create index if not exists estoque_produtos_fazenda_id_idx on public.estoque_produtos (fazenda_id);
create index if not exists estoque_lotes_fazenda_id_idx on public.estoque_lotes (fazenda_id);
create index if not exists estoque_movimentos_fazenda_id_idx on public.estoque_movimentos (fazenda_id);
create index if not exists dietas_fazenda_id_idx on public.dietas (fazenda_id);
create index if not exists dietas_itens_fazenda_id_idx on public.dietas_itens (fazenda_id);
create index if not exists financeiro_lancamentos_fazenda_id_idx on public.financeiro_lancamentos (fazenda_id);

-- 7) RLS helper
create or replace function public.tem_acesso_fazenda(fazenda uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.fazendas f
    where f.id = fazenda and f.owner_user_id = auth.uid()
  )
  or exists (
    select 1 from public.fazenda_acessos fa
    where fa.fazenda_id = fazenda
      and fa.user_id = auth.uid()
      and fa.ativo = true
  );
$$;

-- 8) RLS policies (select/insert/update/delete)
-- animais
alter table public.animais enable row level security;
create policy animais_select on public.animais for select using (public.tem_acesso_fazenda(fazenda_id));
create policy animais_insert on public.animais for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy animais_update on public.animais for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy animais_delete on public.animais for delete using (public.tem_acesso_fazenda(fazenda_id));

-- racas
alter table public.racas enable row level security;
create policy racas_select on public.racas for select using (public.tem_acesso_fazenda(fazenda_id));
create policy racas_insert on public.racas for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy racas_update on public.racas for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy racas_delete on public.racas for delete using (public.tem_acesso_fazenda(fazenda_id));

-- lotes
alter table public.lotes enable row level security;
create policy lotes_select on public.lotes for select using (public.tem_acesso_fazenda(fazenda_id));
create policy lotes_insert on public.lotes for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy lotes_update on public.lotes for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy lotes_delete on public.lotes for delete using (public.tem_acesso_fazenda(fazenda_id));

-- eventos_reprodutivos
alter table public.eventos_reprodutivos enable row level security;
create policy eventos_reprodutivos_select on public.eventos_reprodutivos for select using (public.tem_acesso_fazenda(fazenda_id));
create policy eventos_reprodutivos_insert on public.eventos_reprodutivos for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy eventos_reprodutivos_update on public.eventos_reprodutivos for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy eventos_reprodutivos_delete on public.eventos_reprodutivos for delete using (public.tem_acesso_fazenda(fazenda_id));

-- saidas_animais
alter table public.saidas_animais enable row level security;
create policy saidas_animais_select on public.saidas_animais for select using (public.tem_acesso_fazenda(fazenda_id));
create policy saidas_animais_insert on public.saidas_animais for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy saidas_animais_update on public.saidas_animais for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy saidas_animais_delete on public.saidas_animais for delete using (public.tem_acesso_fazenda(fazenda_id));

-- medicoes_leite
alter table public.medicoes_leite enable row level security;
create policy medicoes_leite_select on public.medicoes_leite for select using (public.tem_acesso_fazenda(fazenda_id));
create policy medicoes_leite_insert on public.medicoes_leite for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy medicoes_leite_update on public.medicoes_leite for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy medicoes_leite_delete on public.medicoes_leite for delete using (public.tem_acesso_fazenda(fazenda_id));

-- leite_responsaveis
alter table public.leite_responsaveis enable row level security;
create policy leite_responsaveis_select on public.leite_responsaveis for select using (public.tem_acesso_fazenda(fazenda_id));
create policy leite_responsaveis_insert on public.leite_responsaveis for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy leite_responsaveis_update on public.leite_responsaveis for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy leite_responsaveis_delete on public.leite_responsaveis for delete using (public.tem_acesso_fazenda(fazenda_id));

-- leite_laboratorios
alter table public.leite_laboratorios enable row level security;
create policy leite_laboratorios_select on public.leite_laboratorios for select using (public.tem_acesso_fazenda(fazenda_id));
create policy leite_laboratorios_insert on public.leite_laboratorios for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy leite_laboratorios_update on public.leite_laboratorios for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy leite_laboratorios_delete on public.leite_laboratorios for delete using (public.tem_acesso_fazenda(fazenda_id));

-- leite_cmt_testes
alter table public.leite_cmt_testes enable row level security;
create policy leite_cmt_testes_select on public.leite_cmt_testes for select using (public.tem_acesso_fazenda(fazenda_id));
create policy leite_cmt_testes_insert on public.leite_cmt_testes for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy leite_cmt_testes_update on public.leite_cmt_testes for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy leite_cmt_testes_delete on public.leite_cmt_testes for delete using (public.tem_acesso_fazenda(fazenda_id));

-- leite_cmt_quartos
alter table public.leite_cmt_quartos enable row level security;
create policy leite_cmt_quartos_select on public.leite_cmt_quartos for select using (public.tem_acesso_fazenda(fazenda_id));
create policy leite_cmt_quartos_insert on public.leite_cmt_quartos for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy leite_cmt_quartos_update on public.leite_cmt_quartos for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy leite_cmt_quartos_delete on public.leite_cmt_quartos for delete using (public.tem_acesso_fazenda(fazenda_id));

-- leite_ccs_registros
alter table public.leite_ccs_registros enable row level security;
create policy leite_ccs_registros_select on public.leite_ccs_registros for select using (public.tem_acesso_fazenda(fazenda_id));
create policy leite_ccs_registros_insert on public.leite_ccs_registros for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy leite_ccs_registros_update on public.leite_ccs_registros for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy leite_ccs_registros_delete on public.leite_ccs_registros for delete using (public.tem_acesso_fazenda(fazenda_id));

-- estoque_produtos
alter table public.estoque_produtos enable row level security;
create policy estoque_produtos_select on public.estoque_produtos for select using (public.tem_acesso_fazenda(fazenda_id));
create policy estoque_produtos_insert on public.estoque_produtos for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy estoque_produtos_update on public.estoque_produtos for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy estoque_produtos_delete on public.estoque_produtos for delete using (public.tem_acesso_fazenda(fazenda_id));

-- estoque_lotes
alter table public.estoque_lotes enable row level security;
create policy estoque_lotes_select on public.estoque_lotes for select using (public.tem_acesso_fazenda(fazenda_id));
create policy estoque_lotes_insert on public.estoque_lotes for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy estoque_lotes_update on public.estoque_lotes for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy estoque_lotes_delete on public.estoque_lotes for delete using (public.tem_acesso_fazenda(fazenda_id));

-- estoque_movimentos
alter table public.estoque_movimentos enable row level security;
create policy estoque_movimentos_select on public.estoque_movimentos for select using (public.tem_acesso_fazenda(fazenda_id));
create policy estoque_movimentos_insert on public.estoque_movimentos for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy estoque_movimentos_update on public.estoque_movimentos for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy estoque_movimentos_delete on public.estoque_movimentos for delete using (public.tem_acesso_fazenda(fazenda_id));

-- dietas
alter table public.dietas enable row level security;
create policy dietas_select on public.dietas for select using (public.tem_acesso_fazenda(fazenda_id));
create policy dietas_insert on public.dietas for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy dietas_update on public.dietas for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy dietas_delete on public.dietas for delete using (public.tem_acesso_fazenda(fazenda_id));

-- dietas_itens
alter table public.dietas_itens enable row level security;
create policy dietas_itens_select on public.dietas_itens for select using (public.tem_acesso_fazenda(fazenda_id));
create policy dietas_itens_insert on public.dietas_itens for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy dietas_itens_update on public.dietas_itens for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy dietas_itens_delete on public.dietas_itens for delete using (public.tem_acesso_fazenda(fazenda_id));

-- financeiro_lancamentos
alter table public.financeiro_lancamentos enable row level security;
create policy financeiro_lancamentos_select on public.financeiro_lancamentos for select using (public.tem_acesso_fazenda(fazenda_id));
create policy financeiro_lancamentos_insert on public.financeiro_lancamentos for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy financeiro_lancamentos_update on public.financeiro_lancamentos for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy financeiro_lancamentos_delete on public.financeiro_lancamentos for delete using (public.tem_acesso_fazenda(fazenda_id));

-- convites_acesso
alter table public.convites_acesso enable row level security;
create policy convites_acesso_select on public.convites_acesso for select using (public.tem_acesso_fazenda(fazenda_id));
create policy convites_acesso_insert on public.convites_acesso for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy convites_acesso_update on public.convites_acesso for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy convites_acesso_delete on public.convites_acesso for delete using (public.tem_acesso_fazenda(fazenda_id));

-- fazenda_acessos
alter table public.fazenda_acessos enable row level security;
create policy fazenda_acessos_select on public.fazenda_acessos for select using (public.tem_acesso_fazenda(fazenda_id));
create policy fazenda_acessos_insert on public.fazenda_acessos for insert with check (public.tem_acesso_fazenda(fazenda_id));
create policy fazenda_acessos_update on public.fazenda_acessos for update using (public.tem_acesso_fazenda(fazenda_id)) with check (public.tem_acesso_fazenda(fazenda_id));
create policy fazenda_acessos_delete on public.fazenda_acessos for delete using (public.tem_acesso_fazenda(fazenda_id));

commit;
