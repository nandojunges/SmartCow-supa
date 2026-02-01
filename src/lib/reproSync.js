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

export async function syncCadastroReproEventos({
  fazendaId,
  animalId,
  userId,
  eventos = [],
}) {
  if (!fazendaId || !animalId) return;

  const eventosNormalizados = (eventos || [])
    .map((evento) => {
      const tipo = evento?.tipo;
      const dataEvento =
        evento?.data_evento ||
        evento?.data ||
        evento?.dataEvento ||
        evento?.data_evento_br;
      const data_evento = normalizarDataEvento(dataEvento);
      if (!TIPOS_REPRO.includes(tipo) || !data_evento) return null;
      return {
        fazenda_id: fazendaId,
        animal_id: animalId,
        user_id: userId ?? null,
        tipo,
        data_evento,
      };
    })
    .filter(Boolean);

  if (eventosNormalizados.length === 0) return;

  const eventosUnicos = Array.from(
    new Map(
      eventosNormalizados.map((evento) => [
        `${evento.tipo}-${evento.data_evento}`,
        evento,
      ])
    ).values()
  );

  const { error: upsertError } = await supabase
    .from("repro_eventos")
    .upsert(eventosUnicos, {
      onConflict: "fazenda_id,animal_id,tipo,data_evento",
    });

  if (upsertError) {
    console.error("Erro ao sincronizar eventos reprodutivos do cadastro:", upsertError);
  }
}
