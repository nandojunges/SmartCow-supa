// src/pages/Leite/AbaOcorrenciasMastite.jsx
import React, { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import GuiaMastite from "./GuiaMastite";
import MastiteTratamentos from "./MastiteTratamentos";

/**
 * Props (para plugar Supabase depois, sem travar a UI):
 * - vaca: objeto com { id, numero, brinco }
 * - historicoInicial: { casos: [], tratamentos: [] }  (ou [])
 * - onSalvar(novoStore): callback para persistir no backend
 *
 * - produtosEstoque: lista de produtos do estoque (opcional)
 *   Ex: [{ id, nome, carencia_leite, carencia_carne, via, principio_ativo, ... }]
 *
 * - responsaveis: lista de responsáveis (opcional)
 *   Ex: [{ id, nome }]
 *
 * - onCriarResponsavel(nome): async -> retorna { id, nome } (opcional)
 */
export default function AbaOcorrenciasMastite({
  vaca,
  historicoInicial = [],
  onSalvar,
  produtosEstoque = [],
  responsaveis = [],
  onCriarResponsavel,
}) {
  const [tab, setTab] = useState("casos"); // casos | trat | linha
  const [mostrarGuia, setMostrarGuia] = useState(false);

  // Store local unificado (casos + tratamentos)
  const [store, setStore] = useState(() => normalizeIncoming(historicoInicial));

  // Caso selecionado
  const [casoId, setCasoId] = useState(null);

  // Draft do caso atual (para editar/salvar)
  const [draftCaso, setDraftCaso] = useState(() => novoCaso(vaca));

  // Timeline filtro
  const [timelineFiltro, setTimelineFiltro] = useState("todos"); // todos | caso

  const casos = useMemo(() => (Array.isArray(store?.casos) ? store.casos : []), [store]);
  const tratamentos = useMemo(
    () => (Array.isArray(store?.tratamentos) ? store.tratamentos : []),
    [store]
  );

  const casoSelecionado = useMemo(() => {
    const id = casoId || draftCaso?.id;
    return casos.find((c) => c.id === id) || null;
  }, [casoId, draftCaso, casos]);

  const existeCasoAtivo = !!casoSelecionado;

  // Prioridade só faz sentido se existir caso
  const prioridade = useMemo(() => {
    if (!casoSelecionado) return null;
    return deduzPrioridade(casoSelecionado);
  }, [casoSelecionado]);

  // Sync props -> store (sem loop pesado)
  useEffect(() => {
    const incoming = normalizeIncoming(historicoInicial);
    setStore((prev) => (jsonEq(prev, incoming) ? prev : incoming));
  }, [historicoInicial]);

  // Quando muda vaca, reseta estado (não mostra status/prioridade antes de abrir caso)
  useEffect(() => {
    setStore(normalizeIncoming(historicoInicial));
    setCasoId(null);
    setDraftCaso(novoCaso(vaca));
    setTab("casos");
  }, [vaca?.id, vaca?.numero]); // eslint-disable-line

  // Atalhos: G abre guia, ESC fecha guia
  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === "g" || e.key === "G") && !e.altKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setMostrarGuia((v) => !v);
      }
      if (e.key === "Escape") setMostrarGuia(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function persist(next) {
    setStore(next);
    if (typeof onSalvar === "function") onSalvar(next);
  }

  // ===== Ações: casos =====
  function criarNovoCaso() {
    const c = novoCaso(vaca);
    setDraftCaso(c);
    setCasoId(c.id);
    setTab("casos");
  }

  function abrirCaso(id) {
    const c = casos.find((x) => x.id === id);
    if (!c) return;
    setCasoId(id);
    setDraftCaso(c);
  }

  function salvarCaso() {
    // regras mínimas (não deixa salvar vazio)
    const c = { ...draftCaso };

    if (!c.data) return alert("Informe a data do caso.");

    const temSinais = (c.sinais_gerais || []).length > 0;
    const temQuartos = (c.quartos || []).length > 0;
    const temAchado = !!c.achado_leite && c.achado_leite !== "Normal";
    const temObs = String(c.observacao || "").trim().length > 0;

    if (!temSinais && !temQuartos && !temAchado && !temObs) {
      return alert(
        "Para abrir um caso, informe ao menos 1 item: quarto, achado do leite, sinal geral ou observação."
      );
    }

    // status: ao salvar, vira "aberto" automaticamente (agora faz sentido)
    c.status = c.status || "aberto";

    const lista = [...casos];
    const ix = lista.findIndex((x) => x.id === c.id);
    if (ix >= 0) lista[ix] = c;
    else lista.unshift(c);

    persist({ ...store, casos: lista });
    setCasoId(c.id);
    alert("✅ Caso salvo.");
  }

  function fecharCaso() {
    if (!existeCasoAtivo) return;
    setDraftCaso((d) => ({ ...d, status: "fechado" }));
  }

  function reabrirCaso() {
    if (!existeCasoAtivo) return;
    setDraftCaso((d) => ({ ...d, status: "aberto" }));
  }

  function removerCaso() {
    if (!existeCasoAtivo) return;
    const ok = window.confirm("Remover este caso e todos os tratamentos vinculados?");
    if (!ok) return;

    const id = casoSelecionado.id;
    const novoCasos = casos.filter((c) => c.id !== id);
    const novoTrat = tratamentos.filter((t) => t.caso_id !== id);

    persist({ ...store, casos: novoCasos, tratamentos: novoTrat });

    setCasoId(null);
    setDraftCaso(novoCaso(vaca));
  }

  // ===== Timeline =====
  const timelineItens = useMemo(() => {
    const baseCasos =
      timelineFiltro === "caso" && casoSelecionado
        ? casos.filter((c) => c.id === casoSelecionado.id)
        : casos;

    const ids = new Set(baseCasos.map((c) => c.id));
    const baseTrat = tratamentos.filter((t) => ids.has(t.caso_id));

    const itens = [];

    baseCasos.forEach((c) => {
      itens.push({
        id: `caso_${c.id}`,
        data: c.data,
        tipo: "caso",
        titulo: `Caso (${c.tipo === "clinica" ? "Clínica" : "Subclínica"})`,
        detalhe: [
          c.tipo === "clinica" ? `Gravidade: ${labelGrav(c.gravidade)}` : null,
          `Quartos: ${(c.quartos || []).length ? c.quartos.join(", ") : "—"}`,
          `Achado: ${c.achado_leite || "—"}`,
        ]
          .filter(Boolean)
          .join(" • "),
        refId: c.id,
      });

      if (c?.lab?.agentes?.length) {
        itens.push({
          id: `lab_${c.id}`,
          data: c?.lab?.data_coleta || c.data,
          tipo: "lab",
          titulo: "Laboratório",
          detalhe: `Agentes: ${c.lab.agentes.join(", ")}`,
          refId: c.id,
        });
      }

      if (c?.desfecho?.status && c.desfecho.status !== "nao_avaliado") {
        itens.push({
          id: `des_${c.id}`,
          data: c?.desfecho?.data || c.data,
          tipo: "desfecho",
          titulo: `Desfecho: ${c.desfecho.status.toUpperCase()}`,
          detalhe:
            c.desfecho.recidiva === "sim"
              ? `Recidiva em ${c.desfecho.recidiva_dias || "—"} dias`
              : "Sem recidiva",
          refId: c.id,
        });
      }
    });

    baseTrat.forEach((t) => {
      itens.push({
        id: `trat_${t.id}`,
        data: t.data_inicio,
        tipo: "trat",
        titulo: `Tratamento (${t.tipo})`,
        detalhe: `${t.produto}${t.responsavel ? ` • Resp.: ${t.responsavel}` : ""}`,
        refId: t.caso_id,
      });
    });

    return itens.sort((a, b) => (b.data || "").localeCompare(a.data || ""));
  }, [casos, tratamentos, timelineFiltro, casoSelecionado]);

  // ===== Options react-select =====
  const optOrdenha = useMemo(
    () => [
      { value: "manha", label: "Manhã" },
      { value: "tarde", label: "Tarde" },
      { value: "noite", label: "Noite" },
    ],
    []
  );

  const optTipo = useMemo(
    () => [
      { value: "clinica", label: "Clínica" },
      { value: "subclinica", label: "Subclínica" },
    ],
    []
  );

  const optGrav = useMemo(
    () => [
      { value: "leve", label: "Leve" },
      { value: "moderada", label: "Moderada" },
      { value: "grave", label: "Grave" },
    ],
    []
  );

  const optQuartos = useMemo(
    () => ["RF", "LF", "RH", "LH"].map((q) => ({ value: q, label: q })),
    []
  );

  const optAchado = useMemo(
    () =>
      ["Normal", "Grumos", "Aquoso", "Sanguinolento", "Pus", "Odor anormal"].map((x) => ({
        value: x,
        label: x,
      })),
    []
  );

  const optSinais = useMemo(
    () => ["Febre", "Apatia", "Desidratação", "Anorexia"].map((x) => ({ value: x, label: x })),
    []
  );

  // ===== Styles (mantém leve e limpo) =====
  const styles = useMemo(() => selectStyles(), []);

  if (!vaca) {
    return <div style={{ padding: 16, color: "#991b1b", fontWeight: 800 }}>Vaca não encontrada.</div>;
  }

  return (
    <div style={{ padding: "1.1rem", fontFamily: "Poppins, sans-serif" }}>
      {/* Cabeçalho */}
      <div style={ui.header}>
        <div style={{ display: "grid", gap: 6 }}>
          <h3 style={ui.title}>
            🧪 Mastite — Registro e Histórico — {vaca.numero}
            {vaca.brinco ? ` / ${vaca.brinco}` : ""}
          </h3>

          {/* Status/Prioridade só depois que existe caso */}
          {existeCasoAtivo ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Pill tone={casoSelecionado.status === "fechado" ? "success" : "info"}>
                Status: {casoSelecionado.status === "fechado" ? "Fechado" : "Aberto"}
              </Pill>
              <Pill tone={prioridade === "ALTA" ? "danger" : prioridade === "MÉDIA" ? "warn" : "info"}>
                Prioridade: {prioridade}
              </Pill>
            </div>
          ) : (
            <div style={{ color: "#64748b", fontWeight: 800 }}>
              Nenhuma ocorrência aberta. Clique em <b>Novo Caso</b> e salve os primeiros dados.
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="primary" onClick={() => setMostrarGuia(true)} title="Abrir Guia (G)">
            📖 Guia (G)
          </Btn>

          <Btn variant="primary" onClick={criarNovoCaso} title="Criar novo caso">
            ➕ Novo Caso
          </Btn>

          <Btn variant="success" onClick={salvarCaso} title="Salvar caso">
            💾 Salvar Caso
          </Btn>

          {existeCasoAtivo ? (
            casoSelecionado.status !== "fechado" ? (
              <Btn variant="danger" onClick={fecharCaso} title="Fechar caso">
                ✅ Fechar
              </Btn>
            ) : (
              <Btn onClick={reabrirCaso} title="Reabrir caso">
                ↩️ Reabrir
              </Btn>
            )
          ) : null}
        </div>
      </div>

      {/* Abas (Casos / Tratamentos / Linha) */}
      <div style={ui.tabs}>
        <Tab active={tab === "casos"} onClick={() => setTab("casos")}>
          Casos
        </Tab>
        <Tab active={tab === "trat"} onClick={() => setTab("trat")}>
          Tratamentos
        </Tab>
        <Tab active={tab === "linha"} onClick={() => setTab("linha")}>
          Linha do tempo
        </Tab>
      </div>

      {/* CASOS */}
      {tab === "casos" && (
        <div style={{ display: "grid", gap: 12 }}>
          <Card
            title="Histórico de casos"
            subtitle="Clique em um caso para abrir e editar. (incidência, recorrência, sucesso por tratamento)."
            right={<Pill tone="neutral">{casos.length}</Pill>}
          >
            {casos.length === 0 ? (
              <div style={{ color: "#64748b", fontWeight: 800 }}>Nenhum caso registrado ainda.</div>
            ) : (
              <div style={{ display: "grid", gap: 8 }}>
                {casos
                  .slice()
                  .sort((a, b) => (b.data || "").localeCompare(a.data || ""))
                  .map((c) => {
                    const p = deduzPrioridade(c);
                    const isActive = c.id === (casoId || draftCaso?.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() => abrirCaso(c.id)}
                        style={{
                          textAlign: "left",
                          padding: 12,
                          borderRadius: 14,
                          border: `1px solid ${isActive ? "#93c5fd" : "#e5e7eb"}`,
                          background: isActive ? "#eff6ff" : "white",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontWeight: 1000 }}>
                            {fmtISO(c.data)} • {c.tipo === "clinica" ? "Clínica" : "Subclínica"}
                            {c.tipo === "clinica" ? ` • ${labelGrav(c.gravidade)}` : ""}
                          </div>
                          <Pill tone={p === "ALTA" ? "danger" : p === "MÉDIA" ? "warn" : "info"}>
                            {c.status === "fechado" ? "Fechado" : p}
                          </Pill>
                        </div>
                        <div style={{ marginTop: 6, color: "#334155", fontWeight: 800 }}>
                          Quartos: {(c.quartos || []).length ? c.quartos.join(", ") : "—"} • Achado:{" "}
                          {c.achado_leite || "—"}
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </Card>

          <Card
            title="Registrar / editar ocorrência"
            subtitle="Tudo em react-select. Salve para “abrir” a ocorrência. Laboratório é opcional."
            right={
              <Btn
                variant="danger"
                onClick={removerCaso}
                disabled={!existeCasoAtivo}
                title="Remover caso"
              >
                🗑️ Remover
              </Btn>
            }
          >
            {/* Linha 1 */}
            <div style={ui.grid2}>
              <Field label="Data">
                <input
                  type="date"
                  value={draftCaso.data || ""}
                  onChange={(e) => setDraftCaso((d) => ({ ...d, data: e.target.value }))}
                  style={ui.input}
                />
              </Field>

              <Field label="Ordenha">
                <Select
                  styles={styles}
                  options={optOrdenha}
                  value={optOrdenha.find((o) => o.value === (draftCaso.ordenha || "manha"))}
                  onChange={(opt) => setDraftCaso((d) => ({ ...d, ordenha: opt?.value || "manha" }))}
                />
              </Field>
            </div>

            {/* Linha 2 */}
            <div style={{ ...ui.grid2, marginTop: 10 }}>
              <Field label="Tipo">
                <Select
                  styles={styles}
                  options={optTipo}
                  value={optTipo.find((o) => o.value === (draftCaso.tipo || "clinica"))}
                  onChange={(opt) => setDraftCaso((d) => ({ ...d, tipo: opt?.value || "clinica" }))}
                />
              </Field>

              <Field label="Gravidade (se clínica)">
                <Select
                  styles={styles}
                  isDisabled={(draftCaso.tipo || "clinica") !== "clinica"}
                  options={optGrav}
                  value={optGrav.find((o) => o.value === (draftCaso.gravidade || "leve"))}
                  onChange={(opt) => setDraftCaso((d) => ({ ...d, gravidade: opt?.value || "leve" }))}
                />
              </Field>
            </div>

            {/* Linha 3 */}
            <div style={{ ...ui.grid2, marginTop: 10 }}>
              <Field label="Quarto(s) afetado(s)">
                <Select
                  styles={styles}
                  isMulti
                  closeMenuOnSelect={false}
                  options={optQuartos}
                  value={optQuartos.filter((o) => (draftCaso.quartos || []).includes(o.value))}
                  onChange={(vals) =>
                    setDraftCaso((d) => ({
                      ...d,
                      quartos: (vals || []).map((v) => v.value),
                    }))
                  }
                  placeholder="Selecione..."
                />
              </Field>

              <Field label="Achado no leite">
                <Select
                  styles={styles}
                  options={optAchado}
                  value={optAchado.find((o) => o.value === (draftCaso.achado_leite || "Normal"))}
                  onChange={(opt) => setDraftCaso((d) => ({ ...d, achado_leite: opt?.value || "Normal" }))}
                />
              </Field>
            </div>

            {/* Linha 4 */}
            <div style={{ marginTop: 10 }}>
              <Field label="Sinais gerais (se houver)">
                <Select
                  styles={styles}
                  isMulti
                  closeMenuOnSelect={false}
                  options={optSinais}
                  value={optSinais.filter((o) => (draftCaso.sinais_gerais || []).includes(o.value))}
                  onChange={(vals) =>
                    setDraftCaso((d) => ({
                      ...d,
                      sinais_gerais: (vals || []).map((v) => v.value),
                    }))
                  }
                  placeholder="Febre, apatia..."
                />
              </Field>
            </div>

            <div style={{ marginTop: 10 }}>
              <Field label="Observação">
                <textarea
                  value={draftCaso.observacao || ""}
                  onChange={(e) => setDraftCaso((d) => ({ ...d, observacao: e.target.value }))}
                  rows={3}
                  style={{ ...ui.input, resize: "vertical" }}
                  placeholder="Ex.: recorrente, pós-parto, tanque alterado..."
                />
              </Field>
            </div>

            {/* Laboratório opcional - fica aqui, mas enxuto (o resto de TSA fica útil só se existir) */}
            <div style={{ marginTop: 12 }}>
              <MastiteLabBox draftCaso={draftCaso} setDraftCaso={setDraftCaso} />
            </div>

            {/* Desfecho */}
            <div style={{ marginTop: 12 }}>
              <MastiteDesfechoBox draftCaso={draftCaso} setDraftCaso={setDraftCaso} />
            </div>
          </Card>
        </div>
      )}

      {/* TRATAMENTOS (arquivo separado) */}
      {tab === "trat" && (
        <MastiteTratamentos
          vaca={vaca}
          caso={casoSelecionado}
          casos={casos}
          tratamentos={tratamentos}
          setTab={setTab}
          abrirCaso={abrirCaso}
          persist={(nextTratamentos) => persist({ ...store, tratamentos: nextTratamentos })}
          produtosEstoque={produtosEstoque}
          responsaveis={responsaveis}
          onCriarResponsavel={onCriarResponsavel}
        />
      )}

      {/* LINHA DO TEMPO */}
      {tab === "linha" && (
        <Card
          title="Linha do tempo"
          subtitle="Ocorrências + tratamentos + laboratório + desfecho"
          right={
            <div style={{ minWidth: 260 }}>
              <label style={ui.smallLabel}>Mostrar</label>
              <Select
                styles={styles}
                options={[
                  { value: "todos", label: "Todos os casos" },
                  { value: "caso", label: "Apenas caso selecionado" },
                ]}
                value={
                  timelineFiltro === "caso"
                    ? { value: "caso", label: "Apenas caso selecionado" }
                    : { value: "todos", label: "Todos os casos" }
                }
                onChange={(opt) => setTimelineFiltro(opt?.value || "todos")}
              />
            </div>
          }
        >
          {timelineItens.length === 0 ? (
            <div style={{ color: "#64748b", fontWeight: 800 }}>Ainda não há registros.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {timelineItens.map((it) => (
                <div
                  key={it.id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    padding: 12,
                    background: "white",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 1000 }}>
                      {fmtISO(it.data)} • {it.titulo}
                    </div>
                    <Btn onClick={() => { abrirCaso(it.refId); setTab("casos"); }} title="Abrir caso">
                      ↗ Abrir
                    </Btn>
                  </div>
                  <div style={{ marginTop: 6, color: "#334155", fontWeight: 800 }}>{it.detalhe}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {mostrarGuia ? <GuiaMastite onFechar={() => setMostrarGuia(false)} /> : null}
    </div>
  );
}

/* ===================== Subcomponentes (no mesmo arquivo) ===================== */

function MastiteLabBox({ draftCaso, setDraftCaso }) {
  const styles = useMemo(() => selectStyles(), []);
  const agentesOptions = useMemo(
    () =>
      [
        "Staphylococcus aureus",
        "Streptococcus agalactiae",
        "Streptococcus uberis",
        "Streptococcus dysgalactiae",
        "Escherichia coli",
        "Klebsiella spp.",
        "Corynebacterium bovis",
        "Mycoplasma spp.",
        "Pseudomonas aeruginosa",
        "Serratia spp.",
        "Nocardia spp.",
        "Candida spp.",
        "Aspergillus spp.",
        "Prototheca spp.",
      ].map((a) => ({ value: a, label: a })),
    []
  );

  return (
    <Card
      title="Laboratório (opcional)"
      subtitle="Preencha apenas se houver cultura/antibiograma. Serve para análise de resistência."
    >
      <div style={ui.grid2}>
        <Field label="Status da cultura">
          <Select
            styles={styles}
            options={[
              { value: "nao_feita", label: "Não feita" },
              { value: "coletada", label: "Coletada" },
              { value: "resultado", label: "Resultado disponível" },
            ]}
            value={{
              value: draftCaso?.lab?.cultura_status || "nao_feita",
              label:
                (draftCaso?.lab?.cultura_status || "nao_feita") === "coletada"
                  ? "Coletada"
                  : (draftCaso?.lab?.cultura_status || "nao_feita") === "resultado"
                  ? "Resultado disponível"
                  : "Não feita",
            }}
            onChange={(opt) =>
              setDraftCaso((d) => ({
                ...d,
                lab: { ...(d.lab || {}), cultura_status: opt?.value || "nao_feita" },
              }))
            }
          />
        </Field>

        <Field label="Data da coleta">
          <input
            type="date"
            value={draftCaso?.lab?.data_coleta || ""}
            onChange={(e) =>
              setDraftCaso((d) => ({
                ...d,
                lab: { ...(d.lab || {}), data_coleta: e.target.value },
              }))
            }
            style={ui.input}
          />
        </Field>
      </div>

      <div style={{ marginTop: 10 }}>
        <Field label="Agente(s) identificado(s)">
          <Select
            styles={styles}
            isMulti
            closeMenuOnSelect={false}
            options={agentesOptions}
            value={agentesOptions.filter((o) => (draftCaso?.lab?.agentes || []).includes(o.value))}
            onChange={(vals) =>
              setDraftCaso((d) => ({
                ...d,
                lab: { ...(d.lab || {}), agentes: (vals || []).map((v) => v.value) },
              }))
            }
            placeholder="Selecione se houver resultado..."
          />
        </Field>
      </div>

      <div style={{ marginTop: 10 }}>
        <Field label="Observação laboratório">
          <input
            value={draftCaso?.lab?.lab_obs || ""}
            onChange={(e) =>
              setDraftCaso((d) => ({
                ...d,
                lab: { ...(d.lab || {}), lab_obs: e.target.value },
              }))
            }
            style={ui.input}
            placeholder="Ex.: crescimento misto, contaminação..."
          />
        </Field>
      </div>

      <div style={{ marginTop: 10, color: "#64748b", fontWeight: 800 }}>
        TSA (Sensibilidade) fica dentro do módulo de tratamentos, porque é lá que faz sentido comparar
        produto usado vs resultado de resistência.
      </div>
    </Card>
  );
}

function MastiteDesfechoBox({ draftCaso, setDraftCaso }) {
  const styles = useMemo(() => selectStyles(), []);
  return (
    <Card
      title="Desfecho do caso (para taxa de sucesso)"
      subtitle="Você pode preencher depois. Isso gera cura, falha e recidiva."
    >
      <div style={ui.grid2}>
        <Field label="Resultado">
          <Select
            styles={styles}
            options={[
              { value: "nao_avaliado", label: "Não avaliado" },
              { value: "eficaz", label: "Eficaz" },
              { value: "parcial", label: "Parcial" },
              { value: "ineficaz", label: "Ineficaz" },
            ]}
            value={{
              value: draftCaso?.desfecho?.status || "nao_avaliado",
              label:
                (draftCaso?.desfecho?.status || "nao_avaliado") === "eficaz"
                  ? "Eficaz"
                  : (draftCaso?.desfecho?.status || "nao_avaliado") === "parcial"
                  ? "Parcial"
                  : (draftCaso?.desfecho?.status || "nao_avaliado") === "ineficaz"
                  ? "Ineficaz"
                  : "Não avaliado",
            }}
            onChange={(opt) =>
              setDraftCaso((d) => ({
                ...d,
                desfecho: { ...(d.desfecho || {}), status: opt?.value || "nao_avaliado" },
              }))
            }
          />
        </Field>

        <Field label="Data da avaliação">
          <input
            type="date"
            value={draftCaso?.desfecho?.data || ""}
            onChange={(e) =>
              setDraftCaso((d) => ({
                ...d,
                desfecho: { ...(d.desfecho || {}), data: e.target.value },
              }))
            }
            style={ui.input}
          />
        </Field>
      </div>

      <div style={{ ...ui.grid2, marginTop: 10 }}>
        <Field label="Recidiva?">
          <Select
            styles={styles}
            options={[
              { value: "nao", label: "Não" },
              { value: "sim", label: "Sim" },
            ]}
            value={{
              value: draftCaso?.desfecho?.recidiva || "nao",
              label: (draftCaso?.desfecho?.recidiva || "nao") === "sim" ? "Sim" : "Não",
            }}
            onChange={(opt) =>
              setDraftCaso((d) => ({
                ...d,
                desfecho: { ...(d.desfecho || {}), recidiva: opt?.value || "nao" },
              }))
            }
          />
        </Field>

        <Field label="Recidiva em (dias)">
          <input
            value={draftCaso?.desfecho?.recidiva_dias || ""}
            onChange={(e) =>
              setDraftCaso((d) => ({
                ...d,
                desfecho: { ...(d.desfecho || {}), recidiva_dias: e.target.value },
              }))
            }
            style={ui.input}
            disabled={(draftCaso?.desfecho?.recidiva || "nao") !== "sim"}
            placeholder="Ex.: 14"
          />
        </Field>
      </div>

      <div style={{ marginTop: 10 }}>
        <Field label="Observação do desfecho">
          <textarea
            value={draftCaso?.desfecho?.obs || ""}
            onChange={(e) =>
              setDraftCaso((d) => ({
                ...d,
                desfecho: { ...(d.desfecho || {}), obs: e.target.value },
              }))
            }
            rows={2}
            style={{ ...ui.input, resize: "vertical" }}
            placeholder="Ex.: voltou no mesmo quarto, precisou trocar protocolo..."
          />
        </Field>
      </div>
    </Card>
  );
}

/* ===================== UI helpers ===================== */

function Field({ label, children }) {
  return (
    <div>
      <div style={ui.smallLabel}>{label}</div>
      {children}
    </div>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <div style={ui.card}>
      <div style={ui.cardHeader}>
        <div>
          <div style={ui.cardTitle}>{title}</div>
          {subtitle ? <div style={ui.cardSub}>{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      {children}
    </div>
  );
}

function Tab({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 12px",
        borderRadius: 14,
        border: `1px solid ${active ? "#93c5fd" : "#e5e7eb"}`,
        background: active ? "#eff6ff" : "white",
        cursor: "pointer",
        fontWeight: 1000,
      }}
    >
      {children}
    </button>
  );
}

function Pill({ children, tone = "neutral" }) {
  const map = {
    neutral: { bg: "#f1f5f9", bd: "#cbd5e1", c: "#0f172a" },
    info: { bg: "#eff6ff", bd: "#bfdbfe", c: "#1e3a8a" },
    warn: { bg: "#fff7ed", bd: "#fed7aa", c: "#9a3412" },
    danger: { bg: "#fef2f2", bd: "#fecaca", c: "#991b1b" },
    success: { bg: "#f0fdf4", bd: "#bbf7d0", c: "#166534" },
  };
  const t = map[tone] || map.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: 999,
        border: `1px solid ${t.bd}`,
        background: t.bg,
        color: t.c,
        fontWeight: 1000,
        fontSize: "0.82rem",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Btn({ children, onClick, variant = "neutral", title, disabled }) {
  const palettes = {
    neutral: { bg: "#f8fafc", bd: "rgba(51,65,85,.25)", c: "#0f172a" },
    primary: { bg: "#eff6ff", bd: "rgba(30,58,138,.25)", c: "#1e3a8a" },
    success: { bg: "#f0fdf4", bd: "rgba(22,101,52,.25)", c: "#166534" },
    danger: { bg: "#fef2f2", bd: "rgba(153,27,27,.25)", c: "#991b1b" },
  };
  const p = palettes[variant] || palettes.neutral;

  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "9px 12px",
        borderRadius: 12,
        border: `1px solid ${p.bd}`,
        background: disabled ? "#f1f5f9" : p.bg,
        color: disabled ? "#94a3b8" : p.c,
        fontWeight: 1000,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}

function selectStyles() {
  return {
    control: (base) => ({
      ...base,
      borderRadius: 12,
      borderColor: "#cbd5e1",
      minHeight: 44,
      boxShadow: "none",
      fontWeight: 800,
    }),
    menu: (base) => ({ ...base, zIndex: 9999 }),
    option: (base) => ({ ...base, fontWeight: 800 }),
    placeholder: (base) => ({ ...base, color: "#94a3b8", fontWeight: 800 }),
  };
}

/* ===================== lógica ===================== */

function normalizeIncoming(x) {
  const base = Array.isArray(x) ? x : x || {};
  if (Array.isArray(base) && base.length && base[0]?.tipo && !base[0]?.casos) {
    return { casos: base, tratamentos: [] };
  }
  if (base?.casos) return base;
  return { casos: [], tratamentos: [] };
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function hojeISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function novoCaso(vaca) {
  return {
    id: uid(),
    animal_ref: vaca?.numero ?? vaca?.id ?? null,
    created_at: new Date().toISOString(),
    status: "", // só vira "aberto" quando salvar
    data: hojeISO(),
    ordenha: "manha",
    tipo: "clinica",
    gravidade: "leve",
    quartos: [],
    achado_leite: "Normal",
    sinais_gerais: [],
    observacao: "",
    lab: {
      cultura_status: "nao_feita",
      data_coleta: "",
      agentes: [],
      lab_obs: "",
    },
    desfecho: {
      status: "nao_avaliado",
      data: "",
      recidiva: "nao",
      recidiva_dias: "",
      obs: "",
    },
  };
}

function deduzPrioridade(caso) {
  // regra simples, útil e não “chute” de agente
  const tipo = caso?.tipo || "clinica";
  const grav = caso?.gravidade || "leve";
  const sinais = caso?.sinais_gerais || [];
  const achado = caso?.achado_leite || "Normal";

  const sist = sinais.includes("Febre") || sinais.includes("Apatia") || sinais.includes("Desidratação");
  const achadoGrave = achado === "Sanguinolento" || achado === "Pus";

  if (tipo === "clinica" && (grav === "grave" || sist || achadoGrave)) return "ALTA";
  if (tipo === "clinica" && grav === "moderada") return "MÉDIA";
  if (tipo === "subclinica") return "BAIXA";
  return "MÉDIA";
}

function labelGrav(v) {
  if (v === "grave") return "Grave";
  if (v === "moderada") return "Moderada";
  return "Leve";
}

function fmtISO(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(+d)) return iso;
  return d.toLocaleDateString("pt-BR");
}

function jsonEq(a, b) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

const ui = {
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  title: { fontSize: "1.15rem", fontWeight: 1000, margin: 0, color: "#0f172a" },
  tabs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  card: {
    border: "1px solid #e5e7eb",
    background: "white",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 1px 2px rgba(0,0,0,.04)",
  },
  cardHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },
  cardTitle: { fontWeight: 1000, fontSize: "0.98rem" },
  cardSub: { fontSize: "0.85rem", color: "#64748b", marginTop: 2, fontWeight: 800 },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  input: {
    width: "100%",
    padding: "0.6rem 0.65rem",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    fontSize: "0.92rem",
    outline: "none",
    boxSizing: "border-box",
    background: "white",
    fontWeight: 800,
  },
  smallLabel: { fontWeight: 1000, fontSize: "0.84rem", marginBottom: 6, color: "#0f172a" },
};
