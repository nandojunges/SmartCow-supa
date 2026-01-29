export function requireFazendaAtiva(fazendaAtualId) {
  if (!fazendaAtualId) {
    throw new Error("Sem fazenda ativa");
  }
  return fazendaAtualId;
}

export function withFazendaId(query, fazendaAtualId) {
  requireFazendaAtiva(fazendaAtualId);
  return query.eq("fazenda_id", fazendaAtualId);
}
