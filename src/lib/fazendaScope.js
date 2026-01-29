export function requireFazendaAtiva(fazendaAtivaId) {
  if (!fazendaAtivaId) {
    throw new Error("Sem fazenda ativa");
  }
  return fazendaAtivaId;
}

export function withFazendaId(query, fazendaAtivaId) {
  requireFazendaAtiva(fazendaAtivaId);
  return query.eq("fazenda_id", fazendaAtivaId);
}
