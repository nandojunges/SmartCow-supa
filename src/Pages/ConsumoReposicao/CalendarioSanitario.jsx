// src/pages/ConsumoReposicao/CalendarioSanitario.jsx
import React, { useMemo, useState, useEffect } from "react";
import "../../styles/tabelaModerna.css";

/** =====================================================================
 * CALENDÁRIO SANITÁRIO — SOMENTE LAYOUT (SEM BANCO / SEM API)
 * - Mantém layout completo: tabela sticky + hover/zebra + header azul
 * - Mantém modais e formulários
 * - CRUD em memória (mock) para você plugar no novo banco depois
 * ===================================================================== */

/* ===== estilos modal ===== */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};
const modalCard = {
  background: "#fff",
  borderRadius: "1rem",
  width: "820px",
  maxHeight: "90vh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  fontFamily: "Poppins, sans-serif",
};
const header = {
  background: "#1e40af",
  color: "white",
  padding: "1rem 1.2rem",
  fontWeight: "bold",
  fontSize: "1.05rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

/* ============================ PÁGINA ============================ */

export default function CalendarioSanitario() {
  // ✅ mock inicial (apenas para o layout não ficar vazio)
  const [manejos, setManejos] = useState(() => [
    {
      id: "m1",
      categoria: "Bezerra",
      tipo: "Vacina",
      produto: "Clostridioses",
      frequencia: "180",
      idade: "60 dias",
      via: "Subcutânea",
      dose: 2,
      dataInicial: isoDate(new Date()),
      proximaAplicacao: "",
      ultimaAplicacao: "",
      observacoes: "",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [editarIdx, setEditarIdx] = useState(null);

  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [registrarIdx, setRegistrarIdx] = useState(null);

  const [mostrarExames, setMostrarExames] = useState(false);
  const [excluirIdx, setExcluirIdx] = useState(null);

  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [openPopoverKey, setOpenPopoverKey] = useState(null);
  const [filtros, setFiltros] = useState({ status: "__ALL__" });

  // ✅ não carrega nada de API/banco (layout apenas)
  useEffect(() => {
    setErro("");
    setLoading(false);
  }, []);

  const toggleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      if (prev.direction === "desc") return { key: null, direction: null };
      return { key, direction: "asc" };
    });
  };

  const handleTogglePopover = (key) => {
    setOpenPopoverKey((prev) => (prev === key ? null : key));
  };

  useEffect(() => {
    if (!openPopoverKey) return undefined;
    const handleClick = (event) => {
      if (event.target.closest('[data-filter-trigger="true"]')) return;
      setOpenPopoverKey(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [openPopoverKey]);

  const abrirNovo = () => {
    setEditarIdx(null);
    setMostrarCadastro(true);
  };

  const abrirEdicao = (idx) => {
    setEditarIdx(idx);
    setMostrarCadastro(true);
  };

  // ✅ salva em memória (para manter fluxo/UX do layout)
  const salvarManejo = (registro) => {
    const id = registro?.id || cryptoId();

    setManejos((prev) => {
      const arr = [...prev];
      const idx = arr.findIndex((m) => m.id === id);
      const payload = { ...registro, id };
      if (idx >= 0) arr[idx] = payload;
      else arr.push(payload);
      return arr;
    });

    setMostrarCadastro(false);
    setEditarIdx(null);
  };

  const abrirRegistro = (idx) => {
    setRegistrarIdx(idx);
    setMostrarRegistro(true);
  };

  // ✅ registra em memória (atualiza ultima/proxima + observacoes)
  const salvarRegistro = (dataAplicacao, observacoes) => {
    const cur = manejos[registrarIdx];
    if (!cur) return;

    let proximaAplicacao = cur.proximaAplicacao || "";
    const dias = parseInt(cur.frequencia, 10);
    if (Number.isFinite(dias) && dataAplicacao) {
      const d = new Date(dataAplicacao);
      d.setDate(d.getDate() + dias);
      proximaAplicacao = isoDate(d);
    }

    setManejos((prev) => {
      const arr = [...prev];
      arr[registrarIdx] = {
        ...arr[registrarIdx],
        ultimaAplicacao: dataAplicacao,
        proximaAplicacao,
        observacoes,
      };
      return arr;
    });

    setMostrarRegistro(false);
    setRegistrarIdx(null);
  };

  const confirmarExclusao = () => {
    setManejos((prev) => prev.filter((_, i) => i !== excluirIdx));
    setExcluirIdx(null);
  };

  const titulos = useMemo(
    () => [
      "Categoria",
      "Tipo",
      "Produto",
      "Frequência / Intervalo",
      "Idade de Aplicação",
      "Via",
      "Dose (mL)",
      "Próxima Aplicação",
      "Ações",
    ],
    []
  );

  const statusFromManejo = (m) => {
    const raw = m?.proximaAplicacao || m?.dataInicial;
    if (!raw) return { label: "Sem data", variant: "st-pill--mute", key: "Sem data" };
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dt = new Date(raw);
    dt.setHours(0, 0, 0, 0);
    const dias = Math.ceil((dt - hoje) / 86400000);
    if (dias < 0) return { label: "Vencido", variant: "st-pill--warn", key: "Vencido" };
    if (dias <= 7) return { label: "Próximo", variant: "st-pill--info", key: "Próximo" };
    return { label: "Em dia", variant: "st-pill--ok", key: "Em dia" };
  };

  const manejosExibidos = useMemo(() => {
    let lista = Array.isArray(manejos) ? [...manejos] : [];

    if (filtros.status !== "__ALL__") {
      lista = lista.filter((m) => statusFromManejo(m).key === filtros.status);
    }

    if (sortConfig.key) {
      const dir = sortConfig.direction === "desc" ? -1 : 1;
      lista.sort((a, b) => {
        switch (sortConfig.key) {
          case "produto":
            return String(a.produto || "").localeCompare(String(b.produto || "")) * dir;
          case "data":
            return (
              (new Date(a.proximaAplicacao || a.dataInicial || 0).getTime() -
                new Date(b.proximaAplicacao || b.dataInicial || 0).getTime()) *
              dir
            );
          default:
            return 0;
        }
      });
    }

    return lista;
  }, [manejos, filtros, sortConfig]);

  const resumo = useMemo(() => {
    const total = manejosExibidos.length;
    const statusCounts = manejosExibidos.reduce(
      (acc, m) => {
        const status = statusFromManejo(m);
        if (status.key === "Vencido") acc.vencidos += 1;
        if (status.key === "Próximo") acc.proximos += 1;
        return acc;
      },
      { vencidos: 0, proximos: 0 }
    );
    return { total, ...statusCounts };
  }, [manejosExibidos]);

  return (
    <section className="w-full py-6 font-sans">
      <div className="px-2 md:px-4 lg:px-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[18px] font-extrabold text-[#1e3a8a]">
            Calendário Sanitário
          </h3>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded border border-[#e5e7eb] bg-[#f3f4f6] text-[#111827]"
              onClick={() => setMostrarExames(true)}
            >
              Exames Sanitários
            </button>
            <button
              className="px-3 py-2 rounded bg-[#2563eb] text-white"
              onClick={abrirNovo}
            >
              + Novo Manejo
            </button>
          </div>
        </div>

        {erro && (
          <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-300 px-3 py-2 rounded">
            {erro}
          </div>
        )}

        <div className="st-filter-hint">
          Dica: clique no título das colunas habilitadas para ordenar/filtrar. Clique novamente para
          fechar.
        </div>
        <div className="st-table-container">
          <div className="st-table-wrap">
            <table
              className="st-table st-table--darkhead"
              onMouseLeave={() => {
                setHoveredRowId(null);
                setHoveredColKey(null);
              }}
            >
              <colgroup>
                <col style={{ width: "14%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "12%" }} />
              </colgroup>

              <thead>
                <tr>
                  <th className="col-categoria">
                    <span className="st-th-label">Categoria</span>
                  </th>
                  <th className="col-tipo">
                    <span className="st-th-label">Tipo</span>
                  </th>
                  <th
                    className="col-produto"
                    onMouseEnter={() => setHoveredColKey("produto")}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort("produto")}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        font: "inherit",
                        color: "inherit",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span className="st-th-label">Produto / Manejo</span>
                      {sortConfig.key === "produto" && sortConfig.direction && (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th className="col-frequencia">
                    <span className="st-th-label">Frequência / Intervalo</span>
                  </th>
                  <th className="col-idade">
                    <span className="st-th-label">Idade de Aplicação</span>
                  </th>
                  <th className="col-via">
                    <span className="st-th-label">Via</span>
                  </th>
                  <th className="col-dose">
                    <span className="st-th-label">Dose (mL)</span>
                  </th>
                  <th
                    className="col-data"
                    onMouseEnter={() => setHoveredColKey("data")}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort("data")}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        font: "inherit",
                        color: "inherit",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span className="st-th-label">Data prevista</span>
                      {sortConfig.key === "data" && sortConfig.direction && (
                        <span style={{ fontSize: 12, opacity: 0.7 }}>
                          {sortConfig.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                  </th>
                  <th
                    className="st-td-center col-status"
                    style={{ position: "relative" }}
                  >
                    <button
                      type="button"
                      data-filter-trigger="true"
                      onClick={() => handleTogglePopover("status")}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        margin: 0,
                        font: "inherit",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <span className="st-th-label">Status</span>
                    </button>
                    {openPopoverKey === "status" && (
                      <div
                        className="st-filter-popover"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <label className="st-filter__label">
                          Status
                          <select
                            className="st-filter-input"
                            value={filtros.status}
                            onChange={(event) =>
                              setFiltros((prev) => ({
                                ...prev,
                                status: event.target.value,
                              }))
                            }
                          >
                            <option value="__ALL__">Todos</option>
                            <option value="Em dia">Em dia</option>
                            <option value="Próximo">Próximo</option>
                            <option value="Vencido">Vencido</option>
                            <option value="Sem data">Sem data</option>
                          </select>
                        </label>
                      </div>
                    )}
                  </th>
                  <th className="st-td-center col-acoes">
                    <span className="st-th-label">Ações</span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr className="st-empty">
                    <td colSpan={titulos.length} style={{ textAlign: "center" }}>
                      Carregando…
                    </td>
                  </tr>
                ) : manejosExibidos.length === 0 ? (
                  <tr className="st-empty">
                    <td colSpan={titulos.length} style={{ textAlign: "center" }}>
                      Nenhum manejo cadastrado.
                    </td>
                  </tr>
                ) : (
                  manejosExibidos.map((m, idx) => {
                    const rowId = m.id || idx;
                    const rowHover = hoveredRowId === rowId;
                    const status = statusFromManejo(m);
                    return (
                      <tr key={rowId} className={rowHover ? "st-row-hover" : ""}>
                        <td>{m.categoria || "—"}</td>
                        <td>{m.tipo || "—"}</td>
                        <td
                          className={`${hoveredColKey === "produto" ? "st-col-hover" : ""} ${
                            rowHover ? "st-row-hover" : ""
                          } ${rowHover && hoveredColKey === "produto" ? "st-cell-hover" : ""}`}
                          onMouseEnter={() => {
                            setHoveredRowId(rowId);
                            setHoveredColKey("produto");
                          }}
                        >
                          {m.produto || "—"}
                        </td>
                        <td>{m.frequencia ? `${m.frequencia} dias` : "—"}</td>
                        <td>{m.idade || "—"}</td>
                        <td>{m.via || "—"}</td>
                        <td className="st-td-center">{m.dose ?? "—"}</td>
                        <td
                          className={`${hoveredColKey === "data" ? "st-col-hover" : ""} ${
                            rowHover ? "st-row-hover" : ""
                          } ${rowHover && hoveredColKey === "data" ? "st-cell-hover" : ""}`}
                          onMouseEnter={() => {
                            setHoveredRowId(rowId);
                            setHoveredColKey("data");
                          }}
                        >
                          {m.proximaAplicacao
                            ? formatBR(m.proximaAplicacao)
                            : m.dataInicial
                            ? formatBR(m.dataInicial)
                            : "—"}
                        </td>
                        <td className="st-td-center">
                          <span className={`st-pill ${status.variant}`}>{status.label}</span>
                        </td>
                        <td className="st-td-center">
                          <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap" }}>
                            <button className="st-btn" onClick={() => abrirEdicao(idx)}>
                              Editar
                            </button>
                            <button className="st-btn" onClick={() => abrirRegistro(idx)}>
                              Registrar
                            </button>
                            <button className="st-btn" onClick={() => setExcluirIdx(idx)}>
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr className="st-summary-row">
                  <td colSpan={9}>
                    <div className="st-summary-row__content">
                      <span>Total de eventos: {resumo.total}</span>
                      <span>Vencidos: {resumo.vencidos}</span>
                      <span>Próximos 7 dias: {resumo.proximos}</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Modais */}
        {mostrarCadastro && (
          <Modal
            onClose={() => {
              setMostrarCadastro(false);
              setEditarIdx(null);
            }}
            title={editarIdx != null ? "✏️ Editar Manejo" : "➕ Novo Manejo"}
          >
            <CadastroManejoForm
              value={editarIdx != null ? manejos[editarIdx] : null}
              onCancel={() => {
                setMostrarCadastro(false);
                setEditarIdx(null);
              }}
              onSave={salvarManejo}
            />
          </Modal>
        )}

        {mostrarRegistro && (
          <Modal
            onClose={() => {
              setMostrarRegistro(false);
              setRegistrarIdx(null);
            }}
            title="Registrar Aplicação"
          >
            <RegistroAplicacaoForm
              manejo={manejos[registrarIdx]}
              onCancel={() => {
                setMostrarRegistro(false);
                setRegistrarIdx(null);
              }}
              onSave={salvarRegistro}
            />
          </Modal>
        )}

        {mostrarExames && (
          <Modal onClose={() => setMostrarExames(false)} title="Controle de Exames">
            <ExamesSanitariosForm
              onCancel={() => setMostrarExames(false)}
              onSave={() => {
                // ✅ layout only: aqui depois você pluga insert no novo banco
                setMostrarExames(false);
              }}
            />
          </Modal>
        )}

        {excluirIdx !== null && (
          <Modal onClose={() => setExcluirIdx(null)} title="Confirmar exclusão">
            <div className="text-[14px] text-[#374151]">
              Deseja realmente excluir este manejo?
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-2 rounded border border-[#e5e7eb]"
                onClick={() => setExcluirIdx(null)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 rounded bg-[#ef4444] text-white"
                onClick={confirmarExclusao}
              >
                Excluir
              </button>
            </div>
          </Modal>
        )}
      </div>
    </section>
  );
}

/* ============================ FORMS ============================ */

function CadastroManejoForm({ value, onCancel, onSave }) {
  const CATEGORIAS = ["Bezerra", "Novilha", "Vaca em lactação", "Vaca seca", "Todo plantel"];
  const TIPOS = ["Vacina", "Vermífugo", "Vitamina", "Antiparasitário", "Preventivo"];
  const VIAS = ["Subcutânea", "Oral", "Intramuscular"];

  const [form, setForm] = useState(() => ({
    id: value?.id || null,
    categoria: value?.categoria || "",
    tipo: value?.tipo || "",
    produto: value?.produto || "",
    frequencia: value?.frequencia || "",
    idade: value?.idade || "",
    via: value?.via || "",
    dose: value?.dose || "",
    dataInicial: value?.dataInicial || "",
    proximaAplicacao: value?.proximaAplicacao || "",
    ultimaAplicacao: value?.ultimaAplicacao || "",
  }));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const proximaEstimada = useMemo(() => {
    if (!form.dataInicial) return "";
    const dias = parseInt(form.frequencia, 10);
    const d = new Date(form.dataInicial);
    if (Number.isFinite(dias)) {
      d.setDate(d.getDate() + dias);
      return isoDate(d);
    }
    return form.dataInicial;
  }, [form.dataInicial, form.frequencia]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <SelectInline
        label="Categoria *"
        value={form.categoria}
        onChange={(v) => set("categoria", v)}
        options={CATEGORIAS}
      />
      <SelectInline
        label="Tipo *"
        value={form.tipo}
        onChange={(v) => set("tipo", v)}
        options={TIPOS}
      />
      <Input
        label="Produto / Princípio Ativo *"
        value={form.produto}
        onChange={(v) => set("produto", v)}
      />
      <Input
        label="Frequência (dias) *"
        value={form.frequencia}
        onChange={(v) => set("frequencia", v)}
      />
      <Input label="Idade de Aplicação" value={form.idade} onChange={(v) => set("idade", v)} />
      <SelectInline label="Via" value={form.via} onChange={(v) => set("via", v)} options={VIAS} />
      <Input
        label="Dose por animal (mL) *"
        type="number"
        value={form.dose}
        onChange={(v) => set("dose", v)}
      />
      <Input
        label="Data Inicial"
        type="date"
        value={form.dataInicial}
        onChange={(v) => set("dataInicial", v)}
      />

      <div className="md:col-span-2 flex items-center justify-between">
        <div className="text-[13px] text-[#374151]">
          Próxima aplicação (estimada):{" "}
          <strong>{proximaEstimada ? formatBR(proximaEstimada) : "—"}</strong>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded border border-[#e5e7eb]" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="px-3 py-2 rounded bg-[#2563eb] text-white"
            onClick={() => {
              if (!form.categoria || !form.tipo || !form.produto || !form.dose || !form.frequencia) {
                alert("Preencha os campos obrigatórios.");
                return;
              }
              onSave({ ...form, proximaAplicacao: proximaEstimada || form.proximaAplicacao });
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function RegistroAplicacaoForm({ manejo, onCancel, onSave }) {
  const [data, setData] = useState(isoDate(new Date()));
  const [observacoes, setObservacoes] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Data da Aplicação" type="date" value={data} onChange={setData} />
        <Input label="Manejo" value={`${manejo?.tipo || "—"} • ${manejo?.produto || "—"}`} readOnly />
      </div>

      <div>
        <label className="text-[12px] font-bold text-[#374151]">Observações</label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          className="w-full border border-[#d1d5db] rounded-md p-2 text-[14px] h-24 resize-y"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button className="px-3 py-2 rounded border border-[#e5e7eb]" onClick={onCancel}>
          Cancelar
        </button>
        <button
          className="px-3 py-2 rounded bg-[#2563eb] text-white"
          onClick={() => onSave(data, observacoes)}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

function ExamesSanitariosForm({ onCancel, onSave }) {
  const [dados, setDados] = useState({
    tipo: "",
    outroTipo: "",
    abrangencia: "",
    status: "Propriedade Não Certificada",
    validadeCertificado: "",
    certificado: null,
    dataUltimo: "",
    comprovante: null,
    animal: "",
  });

  const precisaStatus = (t) =>
    ["Brucelose", "Tuberculose", "Brucelose e Tuberculose (certificação conjunta)"].includes(t);

  const set = (k, v) => setDados((p) => ({ ...p, [k]: v }));

  const calcularProxima = () => {
    if (!dados.dataUltimo) return "";
    const d = new Date(dados.dataUltimo);

    switch (dados.tipo) {
      case "Brucelose":
      case "Tuberculose":
        d.setFullYear(d.getFullYear() + 1);
        return isoDate(d);

      case "Brucelose e Tuberculose (certificação conjunta)":
        if (dados.validadeCertificado) return dados.validadeCertificado;
        d.setFullYear(d.getFullYear() + 1);
        return isoDate(d);

      case "Leptospirose":
        d.setMonth(d.getMonth() + 6);
        return isoDate(d);

      default:
        return "";
    }
  };

  const handleFile = (campo, file) => {
    if (!file) {
      set(campo, null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => set(campo, reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <SelectInline
        label="Tipo de Exame *"
        value={dados.tipo}
        onChange={(v) => set("tipo", v)}
        options={[
          "Brucelose",
          "Tuberculose",
          "Brucelose e Tuberculose (certificação conjunta)",
          "Leptospirose",
          "Tripanossoma",
          "Babesiose",
          "Outros (com campo livre)",
        ]}
      />

      {dados.tipo === "Outros (com campo livre)" && (
        <Input label="Nome do Exame" value={dados.outroTipo} onChange={(v) => set("outroTipo", v)} />
      )}

      <SelectInline
        label="Abrangência *"
        value={dados.abrangencia}
        onChange={(v) => set("abrangencia", v)}
        options={["Propriedade inteira", "Animal específico", "Animal novo em entrada"]}
      />

      {(dados.abrangencia === "Animal específico" || dados.abrangencia === "Animal novo em entrada") && (
        <Input label="Animal vinculado" value={dados.animal} onChange={(v) => set("animal", v)} />
      )}

      {precisaStatus(dados.tipo) && (
        <SelectInline
          label="Status da Propriedade"
          value={dados.status}
          onChange={(v) => set("status", v)}
          options={["Propriedade Não Certificada", "Propriedade Certificada"]}
        />
      )}

      {precisaStatus(dados.tipo) && dados.status === "Propriedade Certificada" && (
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-bold text-[#374151]">Certificado (PDF/Imagem)</label>
            <input
              type="file"
              onChange={(e) => handleFile("certificado", e.target.files?.[0])}
              className="w-full border border-[#d1d5db] rounded-md p-2 text-[14px]"
            />
          </div>
          <Input
            label="Validade do Certificado"
            type="date"
            value={dados.validadeCertificado}
            onChange={(v) => set("validadeCertificado", v)}
          />
        </div>
      )}

      <Input
        label="Data do Último Exame *"
        type="date"
        value={dados.dataUltimo}
        onChange={(v) => set("dataUltimo", v)}
      />

      <div>
        <label className="text-[12px] font-bold text-[#374151]">Comprovante do Exame</label>
        <input
          type="file"
          onChange={(e) => handleFile("comprovante", e.target.files?.[0])}
          className="w-full border border-[#d1d5db] rounded-md p-2 text-[14px]"
        />
      </div>

      <div className="md:col-span-2 text-[13px] text-[#374151]">
        Próxima obrigatoriedade:{" "}
        <strong>{calcularProxima() ? formatBR(calcularProxima()) : "—"}</strong>
      </div>

      <div className="md:col-span-2 flex justify-end gap-2">
        <button className="px-3 py-2 rounded border border-[#e5e7eb]" onClick={onCancel}>
          Cancelar
        </button>
        <button
          className="px-3 py-2 rounded bg-[#2563eb] text-white"
          onClick={() => {
            if (!dados.tipo || !dados.dataUltimo || !dados.abrangencia) {
              alert("Preencha os campos obrigatórios.");
              return;
            }
            onSave({ ...dados, proximaObrigatoriedade: calcularProxima() || null });
          }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

/* ============================ MODAL BASE ============================ */

function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={modalCard} onMouseDown={(e) => e.stopPropagation()}>
        <div style={header}>
          <div style={{ fontWeight: "bold" }}>{title}</div>
          <button className="px-2 text-white/90 hover:text-white" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}

/* ============================ UI PRIMITIVES ======================== */

function Input({ label, value, onChange, type = "text", readOnly = false }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-bold text-[#374151]">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={`border border-[#d1d5db] rounded-md p-2 text-[14px] w-full ${
          readOnly ? "bg-[#f3f4f6]" : "bg-white"
        }`}
      />
    </div>
  );
}

function SelectInline({ label, value, onChange, options = [] }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-bold text-[#374151]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="border border-[#d1d5db] rounded-md p-2 text-[14px] w-full bg-white"
      >
        <option value="">Selecione...</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ============================ HELPERS ============================== */

function isoDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatBR(iso) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

// id simples para mock (evita depender de backend)
function cryptoId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}
