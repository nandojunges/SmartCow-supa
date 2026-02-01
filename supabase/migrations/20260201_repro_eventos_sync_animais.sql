begin;

create unique index if not exists ux_repro_eventos_unico
  on public.repro_eventos (fazenda_id, animal_id, tipo, data_evento);

create or replace function public.fn_sync_repro_campos_animais()
returns trigger
language plpgsql
as $$
begin
  if new.tipo = 'IA' then
    update public.animais
    set ultima_ia = case
      when ultima_ia is null or new.data_evento >= ultima_ia then new.data_evento
      else ultima_ia
    end
    where id = new.animal_id
      and fazenda_id = new.fazenda_id;
  elsif new.tipo = 'PARTO' then
    update public.animais
    set ultimo_parto = case
      when ultimo_parto is null or new.data_evento >= ultimo_parto then new.data_evento
      else ultimo_parto
    end
    where id = new.animal_id
      and fazenda_id = new.fazenda_id;
  elsif new.tipo = 'SECAGEM' then
    update public.animais
    set situacao_reprodutiva = 'seca'
    where id = new.animal_id
      and fazenda_id = new.fazenda_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_repro_campos_animais on public.repro_eventos;
create trigger trg_sync_repro_campos_animais
after insert on public.repro_eventos
for each row execute function public.fn_sync_repro_campos_animais();

commit;
