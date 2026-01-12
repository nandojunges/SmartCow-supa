// src/pages/Leite/Leite.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Select from "react-select";
import { supabase } from "../../lib/supabaseClient";
import ModalMedicaoLeite from "./ModalMedicaoLeite";
import FichaLeiteira from "./FichaLeiteira";
import ResumoLeiteDia from "./ResumoLeiteDia";
import "../../styles/tabelaModerna.css";

/* ===== helpers de data / DEL ===== */
function parseBR(str) {
  if (!str || str.length !== 10) return null;
  const [d, m, y] = str.split("/").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isFinite(dt.getTime()) ? dt : null;
}

function toBR(dt) {
  if (!dt) return "";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function calcularDEL(partoBR) {
  const dt = parseBR(partoBR);
  if (!dt) return 0;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((hoje - dt) / 86400000));
}

function ymdHoje() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje.toISOString().split("T")[0];
}

function addDaysISO(iso, delta) {
  if (!iso) return iso;
  const dt = new Date(iso + "T00:00:00");
  dt.setDate(dt.getDate() + delta);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Último parto (usa coluna ultimo_parto do Supabase) */
function getUltimoPartoBR(animal) {
  const iso = animal?.ultimo_parto; // DATE no Supabase
  if (!iso) return "";
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? "" : toBR(dt);
}

/** Normaliza texto (minúsculo, sem acento) */
function normalizar(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Regra: está em lactação? */
function isLactatingAnimal(a) {
  const categoriaNorm = normalizar(a?.categoria);
  const statusProdNorm = normalizar(a?.situacao_pro || a?.situaco_pro);

  const temUltimoParto = !!a?.ultimo_parto;

  // Negativos claros
  if (statusProdNorm.includes("seca") || categoriaNorm.includes("seca")) {
    return false;
  }

  // Positivos claros via texto
  if (statusProdNorm.startsWith("lact")) return true;
  if (categoriaNorm.includes("lact")) return true;

  // fallback: tem último parto e não está marcada como seca
  if (!statusProdNorm && temUltimoParto) return true;

  return false;
}

/* ===================== react-select (Lote) ===================== */
const selectLoteStyles = {
  container: (base) => ({ ...base, width: "100%" }),
  control: (base, state) => ({
    ...base,
    minHeight: 34,
    height: 34,
    borderRadius: 999,
    borderColor: state.isFocused ? "#60a5fa" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 1px #60a5fa" : "none",
    backgroundColor: "#f9fafb",
    fontSize: 13,
    cursor: "pointer",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 10px" }),
  indicatorsContainer: (base) => ({ ...base, height: 34 }),
  menuPortal: (base) => ({ ...base, zIndex: 9999999 }),
  menu: (base) => ({ ...base, zIndex: 9999999, borderRadius: 12, overflow: "hidden" }),
  option: (base, state) => ({
    ...base,
    fontSize: 13,
    backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#e5edff" : "#fff",
    color: state.isSelected ? "#fff" : "#111827",
    cursor: "pointer",
    paddingTop: 10,
    paddingBottom: 10,
  }),
};

/* =================== TABELA RESUMO DO DIA =================== */
function TabelaResumoDia({
  vacas = [],
  medicoes = {},
  dataTabela,
  onClickFicha,
  onClickRegistrar,

  // lote (vigente na dataTabela) + edição
  lotesOptions = [],
  loteEfetivoPorNumero = {},
  loteEditPorNumero = {},
  onChangeLote,
  salvarLotes,
  salvandoLotes,
  podeEditarLote,
  dataEhPassada,
  modoEdicaoPassado,
  toggleModoEdicaoPassado,
}) {
  const [colunaHover, setColunaHover] = useState(null);

  const titulos = useMemo(
    () => ["Número", "Brinco", "DEL", "Manhã", "Tarde", "3ª", "Total", "Última Medição", "Lote", "Ações"],
    []
  );

  const toNum = (v) => parseFloat(String(v ?? "0").replace(",", ".")) || 0;

  const getLoteValue = (numeroStr) => {
    const loteId = loteEditPorNumero[numeroStr] ?? loteEfetivoPorNumero[numeroStr] ?? null;
    if (!loteId) return null;
    return lotesOptions.find((o) => o.value === loteId) || null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* barra de lote (salvar / editar passado) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Data da tabela: <strong>{String(dataTabela || "").split("-").reverse().join("/") || "—"}</strong>{" "}
          {dataEhPassada ? " (passado)" : " (hoje/futuro)"}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {dataEhPassada && (
            <button
              type="button"
              className="botao-editar"
              style={{ ...navBtnRound, width: "auto", padding: "0 14px", borderRadius: 999 }}
              onClick={toggleModoEdicaoPassado}
              disabled={salvandoLotes}
              title="Habilitar edição retroativa de lote"
            >
              {modoEdicaoPassado ? "Bloquear edição" : "Editar esta data"}
            </button>
          )}

          <button
            type="button"
            className="botao-acao"
            onClick={salvarLotes}
            disabled={salvandoLotes || !podeEditarLote}
            title={!podeEditarLote ? "Edição de lote está bloqueada nesta data" : "Salvar lotes alterados"}
          >
            {salvandoLotes ? "Salvando lotes..." : "💾 Salvar lote do dia"}
          </button>
        </div>
      </div>

      <div className="st-table-wrap">
        <table
          className="st-table st-table--darkhead"
          onMouseLeave={() => setColunaHover(null)}
        >
          <colgroup>
            <col style={{ width: 70 }} /> {/* Número */}
            <col style={{ width: 80 }} /> {/* Brinco */}
            <col style={{ width: 60 }} /> {/* DEL */}
            <col style={{ width: 70 }} /> {/* Manhã */}
            <col style={{ width: 70 }} /> {/* Tarde */}
            <col style={{ width: 55 }} /> {/* 3ª */}
            <col style={{ width: 75 }} /> {/* Total */}
            <col style={{ width: 130 }} /> {/* Última Medição */}
            <col style={{ width: 220 }} /> {/* Lote */}
            <col style={{ width: 170 }} /> {/* Ações */}
          </colgroup>

          <thead>
            <tr>
              {titulos.map((titulo, index) => (
                <th
                  key={titulo}
                  onMouseEnter={() => setColunaHover(index)}
                  onMouseLeave={() => setColunaHover(null)}
                  className={colunaHover === index ? "st-col-hover" : ""}
                >
                  {titulo}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {vacas.length === 0 ? (
              <tr className="st-empty">
                <td colSpan={titulos.length} className="st-td-center">
                  Nenhuma vaca em lactação encontrada.
                </td>
              </tr>
            ) : (
              vacas.map((vaca, rowIndex) => {
                const numeroStr = String(vaca.numero ?? "");
                const dados = medicoes[numeroStr] || {};

                const totalCalc = (toNum(dados.manha) + toNum(dados.tarde) + toNum(dados.terceira)).toFixed(1);

                const del = calcularDEL(getUltimoPartoBR(vaca));

                const ultimaMed = dados.total ? String(dataTabela || "").split("-").reverse().join("/") : "—";

                const colunas = [
                  { value: vaca.numero ?? "—", className: "st-num st-td-center" },
                  { value: vaca.brinco ?? "—" },
                  { value: String(del), className: "st-num st-td-center" },
                  { value: dados.manha ?? "—", className: "st-num st-td-right" },
                  { value: dados.tarde ?? "—", className: "st-num st-td-right" },
                  { value: dados.terceira ?? "—", className: "st-num st-td-right" },
                  { value: dados.total ?? totalCalc ?? "—", className: "st-num st-td-right" },
                  { value: ultimaMed },
                ];

                return (
                  <tr key={vaca.id ?? vaca.numero ?? rowIndex}>
                    {colunas.map((coluna, colIndex) => (
                      <td
                        key={colIndex}
                        className={`${colunaHover === colIndex ? "st-col-hover" : ""} ${coluna.className || ""}`}
                        title={colIndex <= 1 ? String(coluna.value) : undefined}
                      >
                        {coluna.value}
                      </td>
                    ))}

                    {/* Lote (vigente) — editável só quando permitido */}
                    <td className={colunaHover === 8 ? "st-col-hover" : ""}>
                      <div style={{ width: "100%", minWidth: 0 }}>
                        <Select
                          value={getLoteValue(numeroStr)}
                          onChange={(opt) => onChangeLote(numeroStr, opt?.value || null)}
                          options={lotesOptions}
                          styles={selectLoteStyles}
                          isClearable
                          placeholder="—"
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          isDisabled={!podeEditarLote || salvandoLotes}
                        />
                      </div>
                    </td>

                    {/* Ações */}
                    <td className={`st-td-center ${colunaHover === 9 ? "st-col-hover" : ""}`}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                        <button type="button" className="st-btn" onClick={() => onClickFicha?.(vaca)}>
                          Ficha
                        </button>

                        <button type="button" className="st-btn" onClick={() => onClickRegistrar?.(vaca)}>
                          Registrar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* =========================== PÁGINA LEITE =========================== */

function mergeMedicoesDia(existentes = {}, novas = {}) {
  return { ...existentes, ...novas };
}

export default function Leite() {
  const [vacas, setVacas] = useState([]);

  const vacasLactacao = useMemo(() => {
    const filtradas = vacas.filter(isLactatingAnimal);
    console.log("Leite - vacas em lactação (filtradas):", filtradas);
    return filtradas;
  }, [vacas]);

  const [dataAtual, setDataAtual] = useState(ymdHoje()); // calendário
  const [dataTabela, setDataTabela] = useState(null); // tabela
  const jaSetouUltimaTabelaRef = useRef(false);

  const [medicoesPorDia, setMedicoesPorDia] = useState({});
  const medicoesDoDiaTabela = medicoesPorDia[dataTabela] || {};

  const [modalAberto, setModalAberto] = useState(false);
  const [vacaSelecionada, setVacaSelecionada] = useState(null);

  const [fichaAberta, setFichaAberta] = useState(false);
  const [vacaFicha, setVacaFicha] = useState(null);

  // ✅ lotes de Lactação do banco (para selects)
  const [lotesLeite, setLotesLeite] = useState([]);
  const [loadingLotes, setLoadingLotes] = useState(false);

  const lotesOptions = useMemo(() => {
    return (lotesLeite || []).map((l) => ({
      value: l.id,
      label: `${l.nome} — ${l.nivel_produtivo}`,
      meta: { nome: l.nome, nivel: l.nivel_produtivo },
    }));
  }, [lotesLeite]);

  // ✅ controle de edição retroativa
  const hojeISO = useMemo(() => ymdHoje(), []);
  const dataEhPassada = useMemo(() => {
    if (!dataTabela) return false;
    return dataTabela < hojeISO;
  }, [dataTabela, hojeISO]);

  const [modoEdicaoPassado, setModoEdicaoPassado] = useState(false);
  useEffect(() => {
    setModoEdicaoPassado(false);
  }, [dataTabela]);

  const podeEditarLote = useMemo(() => {
    return !dataEhPassada || modoEdicaoPassado;
  }, [dataEhPassada, modoEdicaoPassado]);

  const loteEfetivoPorNumero = useMemo(() => {
    const mapNumeroToLoteId = {};
    vacasLactacao.forEach((v) => {
      const numeroStr = String(v.numero ?? "");
      if (v?.lote_id) {
        mapNumeroToLoteId[numeroStr] = v.lote_id;
      }
    });
    return mapNumeroToLoteId;
  }, [vacasLactacao]);
  const [loteEditPorNumero, setLoteEditPorNumero] = useState({});
  const [salvandoLotes, setSalvandoLotes] = useState(false);

  /* ===== Resumo do dia (baseado na DATA DA TABELA) ===== */
  const resumoDia = useMemo(() => {
    const toNum = (v) => parseFloat(String(v ?? "0").replace(",", ".")) || 0;

    let producaoTotal = 0;
    let melhor = null;
    let pior = null;
    let qtdComMedicao = 0;

    vacasLactacao.forEach((vaca) => {
      const numeroStr = String(vaca.numero ?? "");
      const dados = medicoesDoDiaTabela[numeroStr] || {};

      const total =
        dados.total !== undefined && dados.total !== ""
          ? toNum(dados.total)
          : toNum(dados.manha) + toNum(dados.tarde) + toNum(dados.terceira);

      if (total > 0) {
        producaoTotal += total;
        qtdComMedicao += 1;
        if (!melhor || total > melhor.total) melhor = { vaca, total };
        if (!pior || total < pior.total) pior = { vaca, total };
      }
    });

    const mediaPorVaca = vacasLactacao.length > 0 ? producaoTotal / vacasLactacao.length : 0;

    return {
      producaoTotal: producaoTotal.toFixed(1),
      mediaPorVaca: mediaPorVaca.toFixed(1),
      melhor,
      pior,
      qtdComMedicao,
    };
  }, [vacasLactacao, medicoesDoDiaTabela]);

  const carregarVacas = useCallback(async () => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Erro ao obter usuário:", userError);
        return;
      }
      if (!user) return;

      const { data, error } = await supabase.from("animais").select("*").eq("user_id", user.id);

      if (error) {
        console.error("Erro ao buscar animais:", error);
        setVacas([]);
        return;
      }

      setVacas(data || []);
    } catch (e) {
      console.error("Erro inesperado ao carregar vacas:", e);
      setVacas([]);
    }
  }, []);

  /* ===== Carregar vacas do plantel (Supabase) ===== */
  useEffect(() => {
    carregarVacas();
  }, [carregarVacas]);

  /* ===== Carregar lotes Lactação (para selects) ===== */
  useEffect(() => {
    async function carregarLotes() {
      try {
        setLoadingLotes(true);

        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) {
          setLoadingLotes(false);
          return;
        }

        const { data, error } = await supabase
          .from("lotes")
          .select("id,nome,funcao,nivel_produtivo,ativo")
          .eq("funcao", "Lactação")
          .eq("ativo", true)
          .not("nivel_produtivo", "is", null)
          .order("nome", { ascending: true });

        if (error) {
          console.error("Erro ao carregar lotes (Lactação):", error);
          setLotesLeite([]);
          setLoadingLotes(false);
          return;
        }

        setLotesLeite(Array.isArray(data) ? data : []);
        setLoadingLotes(false);
      } catch (e) {
        console.error("Erro inesperado ao carregar lotes:", e);
        setLotesLeite([]);
        setLoadingLotes(false);
      }
    }

    carregarLotes();
  }, []);

  /* ===== ✅ Buscar ÚLTIMA DATA COM MEDIÇÃO (para a TABELA) ===== */
  useEffect(() => {
    async function carregarUltimaDataTabela() {
      try {
        if (jaSetouUltimaTabelaRef.current) return;

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Erro ao obter usuário para última medição:", userError);
          return;
        }
        if (!user) return;

        const { data, error } = await supabase
          .from("medicoes_leite")
          .select("data_medicao")
          .eq("user_id", user.id)
          .order("data_medicao", { ascending: false })
          .limit(1);

        if (error) {
          console.error("Erro ao buscar última data de medição:", error);
          return;
        }

        const ultimaData = data?.[0]?.data_medicao; // yyyy-mm-dd
        setDataTabela(ultimaData || ymdHoje());
        jaSetouUltimaTabelaRef.current = true;
      } catch (e) {
        console.error("Erro inesperado ao carregar última data da tabela:", e);
      }
    }

    carregarUltimaDataTabela();
  }, []);

  /* ===== Carregar medições do DIA DA TABELA (Supabase) ===== */
  useEffect(() => {
    async function carregarMedicoesDiaTabela() {
      try {
        if (!dataTabela || vacas.length === 0) return;

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Erro ao obter usuário para medições:", userError);
          return;
        }
        if (!user) return;

        const { data, error } = await supabase
          .from("medicoes_leite")
          .select("id, animal_id, data_medicao, tipo_lancamento, litros_manha, litros_tarde, litros_terceira, litros_total")
          .eq("user_id", user.id)
          .eq("data_medicao", dataTabela);

        if (error) {
          console.error("Erro ao buscar medições de leite:", error);
          return;
        }

        const mapaPorNumero = {};

        data.forEach((linha) => {
          const vaca = vacas.find((v) => v.id === linha.animal_id);
          if (!vaca) return;

          const numeroStr = String(vaca.numero ?? "");

          mapaPorNumero[numeroStr] = {
            manha: linha.litros_manha !== null && linha.litros_manha !== undefined ? String(linha.litros_manha) : "",
            tarde: linha.litros_tarde !== null && linha.litros_tarde !== undefined ? String(linha.litros_tarde) : "",
            terceira:
              linha.litros_terceira !== null && linha.litros_terceira !== undefined ? String(linha.litros_terceira) : "",
            total: linha.litros_total !== null && linha.litros_total !== undefined ? String(linha.litros_total) : "",
          };
        });

        setMedicoesPorDia((prev) => ({
          ...prev,
          [dataTabela]: mapaPorNumero,
        }));
      } catch (e) {
        console.error("Erro inesperado ao carregar medições de leite:", e);
      }
    }

    carregarMedicoesDiaTabela();
  }, [dataTabela, vacas]);

  // ✅ navegação (setas) muda tabela E calendário juntos
  const irParaAnterior = () => {
    const base = dataTabela || dataAtual || ymdHoje();
    const nova = addDaysISO(base, -1);
    setDataTabela(nova);
    setDataAtual(nova);
  };

  const irParaProxima = () => {
    const base = dataTabela || dataAtual || ymdHoje();
    const nova = addDaysISO(base, +1);
    setDataTabela(nova);
    setDataAtual(nova);
  };

  const abrirMedicaoColetiva = () => {
    setVacaSelecionada(null);
    setModalAberto(true);
  };

  const abrirMedicaoDaVaca = (vaca) => {
    setVacaSelecionada(vaca);
    setModalAberto(true);
  };

  const fecharModal = () => {
    setModalAberto(false);
    setVacaSelecionada(null);
  };

  // ✅ SALVAR medições: tabela vai para o dia salvo; calendário volta para HOJE
  const handleSalvarMedicoes = async ({ data, medicoes }) => {
    setMedicoesPorDia((prev) => {
      const existentes = prev[data] || {};
      const mescladas = mergeMedicoesDia(existentes, medicoes);
      return { ...prev, [data]: mescladas };
    });

    setDataTabela(data);
    setDataAtual(ymdHoje());
    await carregarVacas();
  };

  // Abre a ficha leiteira
  const handleClickFicha = (vaca) => {
    setVacaFicha(vaca);
    setFichaAberta(true);
  };

  const fecharFicha = () => {
    setFichaAberta(false);
    setVacaFicha(null);
  };

  // ✅ editar lote na tabela (não salva ainda)
  const onChangeLote = (numeroStr, loteId) => {
    if (!podeEditarLote) return;
    setLoteEditPorNumero((prev) => ({ ...prev, [String(numeroStr)]: loteId }));
  };

  // ✅ salvar lote(s) do dia
  const salvarLotes = async () => {
    try {
      if (!podeEditarLote) return;
      if (!dataTabela) return;

      setSalvandoLotes(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) {
        setSalvandoLotes(false);
        return;
      }

      const alteradas = Object.entries(loteEditPorNumero).filter(([_, loteId]) => loteId !== undefined);
      if (alteradas.length === 0) {
        setSalvandoLotes(false);
        return;
      }

      const updatesAnimais = [];

      alteradas.forEach(([numeroStr, loteId]) => {
        const vaca = vacasLactacao.find((v) => String(v.numero ?? "") === String(numeroStr));
        if (!vaca?.id) return;

        if (String(vaca.lote_id ?? "") !== String(loteId ?? "")) {
          updatesAnimais.push({ animal_id: vaca.id, lote_id: loteId ?? null });
        }
      });

      if (updatesAnimais.length > 0) {
        const results = await Promise.all(
          updatesAnimais.map((u) => supabase.from("animais").update({ lote_id: u.lote_id }).eq("id", u.animal_id))
        );
        const algumErro = results.find((r) => r.error);
        if (algumErro?.error) {
          console.error("Erro ao atualizar lote_id em animais:", algumErro.error);
          alert("O lote do dia foi salvo, mas houve erro ao atualizar lote atual do animal (veja console).");
        }
      }

      setVacas((prev) =>
        (prev || []).map((v) => {
          const numeroStr = String(v.numero ?? "");
          if (!(numeroStr in loteEditPorNumero)) return v;
          return { ...v, lote_id: loteEditPorNumero[numeroStr] ?? null };
        })
      );
      setLoteEditPorNumero({});

      await carregarVacas();
      setSalvandoLotes(false);
    } catch (e) {
      console.error("Erro inesperado ao salvar lotes:", e);
      alert("Erro inesperado ao salvar lotes.");
      setSalvandoLotes(false);
    }
  };

  return (
    <div className="w-full px-6 py-4 font-sans">
      {/* Toolbar superior */}
      <div style={toolbar}>
        <button type="button" onClick={abrirMedicaoColetiva} className="botao-acao">
          ➕ Nova Medição
        </button>

        <div style={toolbarRight}>
          <button type="button" onClick={irParaAnterior} title="Dia anterior" className="botao-editar" style={navBtnRound}>
            ‹
          </button>

          <input
            type="date"
            value={dataAtual}
            onChange={(e) => setDataAtual(e.target.value)}
            className="border border-gray-300 text-base font-medium shadow-sm"
            style={inputToolbar}
          />

          <button type="button" onClick={irParaProxima} title="Próximo dia" className="botao-editar" style={navBtnRound}>
            ›
          </button>
        </div>
      </div>

      <ResumoLeiteDia resumoDia={resumoDia} qtdLactacao={vacasLactacao.length} />

      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
        {loadingLotes
          ? "Carregando lotes de Lactação..."
          : `Lotes disponíveis: ${(lotesLeite || []).length} (Alta/Média/Baixa Produção)`}
      </div>

      <TabelaResumoDia
        vacas={vacasLactacao}
        medicoes={medicoesDoDiaTabela}
        dataTabela={dataTabela || ymdHoje()}
        onClickFicha={handleClickFicha}
        onClickRegistrar={abrirMedicaoDaVaca}
        lotesOptions={lotesOptions}
        loteEfetivoPorNumero={loteEfetivoPorNumero}
        loteEditPorNumero={loteEditPorNumero}
        onChangeLote={onChangeLote}
        salvarLotes={salvarLotes}
        salvandoLotes={salvandoLotes}
        podeEditarLote={podeEditarLote}
        dataEhPassada={dataEhPassada}
        modoEdicaoPassado={modoEdicaoPassado}
        toggleModoEdicaoPassado={() => setModoEdicaoPassado((v) => !v)}
      />

      {modalAberto && (
        <ModalMedicaoLeite
          aberto={modalAberto}
          dataInicial={dataAtual}
          vacas={vacaSelecionada ? [vacaSelecionada] : vacasLactacao}
          medicoesIniciais={medicoesPorDia[dataAtual] || {}}
          onFechar={fecharModal}
          onSalvar={handleSalvarMedicoes}
        />
      )}

      {fichaAberta && vacaFicha && <FichaLeiteira vaca={vacaFicha} onFechar={fecharFicha} />}
    </div>
  );
}

/* ===== estilos comuns locais (para toolbar) ===== */
const toolbar = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const toolbarRight = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const inputToolbar = {
  width: 180,
  height: 36,
  padding: "0 10px",
  borderRadius: 8,
};

const navBtnRound = {
  width: 38,
  height: 36,
  padding: 0,
  borderRadius: "9999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  fontSize: 18,
};
