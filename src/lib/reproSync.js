import { supabase } from "./supabaseClient";

const TIPOS_REPRO = ["IA", "PARTO", "SECAGEM"];

const normalizarDataEvento = (valor) => {
  if (!valor) return null;
  const texto = String(valor).trim();
  if (!texto) return null;

  const matchBr = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (matchBr) {
    const [, dia, mes, ano] = matchBr;
    return `${ano}-${mes}-${dia}`;
  }

  const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    return `${matchIso[1]}-${matchIso[2]}-${matchIso[3]}`;
  }

  return null;
};

const normalizarDataSupabase = (valor) => {
  if (!valor) return null;
  const texto = String(valor);
  return texto.slice(0, 10);
};

export async function syncCadastroReproEventos({
  fazendaId,
  animalId,
  dataUltimaIA,
  dataUltimoParto,
  dataSecagem,
}) {
  if (!fazendaId || !animalId) return;

  const dataPorTipo = {
    IA: normalizarDataEvento(dataUltimaIA),
    PARTO: normalizarDataEvento(dataUltimoParto),
    SECAGEM: normalizarDataEvento(dataSecagem),
  };

  const { data: eventosExistentes, error: eventosError } = await supabase
    .from("repro_eventos")
    .select("id, tipo, data_evento, meta")
    .eq("fazenda_id", fazendaId)
    .eq("animal_id", animalId)
    .in("tipo", TIPOS_REPRO);

  if (eventosError) {
    console.error("Erro ao buscar eventos reprodutivos do cadastro:", eventosError);
    return;
  }

  const idsParaRemover = (eventosExistentes || [])
    .filter((evento) => {
      const origem = evento?.meta?.origin;
      if (origem !== "cadastro") return false;
      const dataAtual = normalizarDataSupabase(evento?.data_evento);
      const dataDesejada = dataPorTipo[evento?.tipo] || null;
      if (!dataDesejada) return true;
      return dataAtual !== dataDesejada;
    })
    .map((evento) => evento.id)
    .filter(Boolean);

  if (idsParaRemover.length > 0) {
    const { error: deleteError } = await supabase
      .from("repro_eventos")
      .delete()
      .eq("fazenda_id", fazendaId)
      .in("id", idsParaRemover);

    if (deleteError) {
      console.error("Erro ao limpar eventos de cadastro:", deleteError);
    }
  }

  const payloadUpsert = TIPOS_REPRO.map((tipo) => {
    const data_evento = dataPorTipo[tipo];
    if (!data_evento) return null;
    return {
      fazenda_id: fazendaId,
      animal_id: animalId,
      tipo,
      data_evento,
      meta: { origin: "cadastro" },
    };
  }).filter(Boolean);

  if (payloadUpsert.length === 0) return;

  const { error: upsertError } = await supabase
    .from("repro_eventos")
    .upsert(payloadUpsert, {
      onConflict: "fazenda_id,animal_id,tipo,data_evento",
    });

  if (upsertError) {
    console.error("Erro ao sincronizar eventos reprodutivos do cadastro:", upsertError);
  }
}
