// src/pages/Leite/Leite.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Select from "react-select";
import { supabase } from "../../lib/supabaseClient";
import ModalMedicaoLeite from "./ModalMedicaoLeite";
import FichaLeiteira from "./FichaLeiteira";
import ResumoLeiteDia from "./ResumoLeiteDia";

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

  // ↓↓↓ ajustes finos de densidade/armonia
  const thStyle = { padding: "10px 10px", whiteSpace: "nowrap" };
  const tdStyle = { padding: "10px 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

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

      {/* ✅ tabela com colgroup para “redistribuir espaço” e não cortar lote */}
      <table className="tabela-padrao" style={{ width: "100%", tableLayout: "fixed" }}>
        <colgroup>
  <col style={{ width: 70 }} />   {/* Número */}
  <col style={{ width: 80 }} />   {/* Brinco */}
  <col style={{ width: 60 }} />   {/* DEL */}
  <col style={{ width: 70 }} />   {/* Manhã */}
  <col style={{ width: 70 }} />   {/* Tarde */}
  <col style={{ width: 55 }} />   {/* 3ª */}
  <col style={{ width: 75 }} />   {/* Total */}
  <col style={{ width: 130 }} />  {/* Última Medição (um pouco maior) */}
  <col style={{ width: 220 }} />  {/* ✅ Lote (bem mais curto) */}
  <col style={{ width: 170 }} />  {/* ✅ Ações (um pouco maior) */}
</colgroup>

        <thead>
          <tr>
            {titulos.map((titulo, index) => (
              <th
                key={titulo}
                onMouseEnter={() => setColunaHover(index)}
                onMouseLeave={() => setColunaHover(null)}
                className={colunaHover === index ? "coluna-hover" : ""}
                style={thStyle}
              >
                {titulo}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {vacas.length === 0 ? (
            <tr>
              <td colSpan={titulos.length} style={{ textAlign: "center", padding: "1rem" }}>
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
                vaca.numero ?? "—",
                vaca.brinco ?? "—",
                String(del),
                dados.manha ?? "—",
                dados.tarde ?? "—",
                dados.terceira ?? "—",
                dados.total ?? totalCalc ?? "—",
                ultimaMed,
              ];

              return (
                <tr key={vaca.id ?? vaca.numero ?? rowIndex}>
                  {colunas.map((conteudo, colIndex) => (
                    <td
                      key={colIndex}
                      className={colunaHover === colIndex ? "coluna-hover" : ""}
                      title={colIndex <= 1 ? String(conteudo) : undefined}
                      style={tdStyle}
                    >
                      {conteudo}
                    </td>
                  ))}

                  {/* Lote (vigente) — editável só quando permitido */}
                  <td className={colunaHover === 8 ? "coluna-hover" : ""} style={{ ...tdStyle, padding: "6px 8px" }}>
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
                  <td className={`coluna-acoes ${colunaHover === 9 ? "coluna-hover" : ""}`} style={{ ...tdStyle }}>
                    <div className="botoes-tabela" style={{ gap: 8 }}>
                      <button type="button" className="botao-editar" onClick={() => onClickFicha?.(vaca)}>
                        Ficha
                      </button>

                      <button type="button" className="btn-registrar" onClick={() => onClickRegistrar?.(vaca)}>
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

  const nomeDoLote = useCallback(
    (loteId) => {
      if (!loteId) return "";
      const l = (lotesLeite || []).find((x) => x.id === loteId);
      return l?.nome || "";
    },
    [lotesLeite]
  );

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

  const [loteEfetivoPorNumero, setLoteEfetivoPorNumero] = useState({});
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

  /* ===== Carregar vacas do plantel (Supabase) ===== */
  useEffect(() => {
    async function carregarVacas() {
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
    }

    carregarVacas();
  }, []);

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
          .select("id, animal_id, data_medicao, tipo_lancamento, litros_manha, litros_tarde, litros_terceira, litros_total, lote")
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
            lote: linha.lote || "",
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

  /* ===== ✅ LOTE VIGENTE NA DATA DA TABELA (persiste ao avançar) ===== */
  useEffect(() => {
    async function carregarLoteVigenteDaTabela() {
      try {
        if (!dataTabela) return;
        if (vacasLactacao.length === 0) {
          setLoteEfetivoPorNumero({});
          setLoteEditPorNumero({});
          return;
        }

        const { data: authData, error: authError } = await supabase.auth.getUser();
        const user = authData?.user;
        if (authError || !user) return;

        const ids = vacasLactacao.map((v) => v.id).filter(Boolean);
        if (ids.length === 0) return;

        const desde = addDaysISO(dataTabela, -400);

        const { data: rows, error } = await supabase
          .from("medicoes_leite")
          .select("animal_id,data_medicao,lote")
          .eq("user_id", user.id)
          .in("animal_id", ids)
          .lte("data_medicao", dataTabela)
          .gte("data_medicao", desde)
          .not("lote", "is", null)
          .order("data_medicao", { ascending: false });

        if (error) {
          console.error("Erro ao buscar lote vigente até a data:", error);
          return;
        }

        const mapAnimalIdToNome = {};
        for (const r of rows || []) {
          if (!mapAnimalIdToNome[r.animal_id]) {
            const nome = String(r.lote || "").trim();
            if (nome) mapAnimalIdToNome[r.animal_id] = nome;
          }
        }

        const mapNumeroToLoteId = {};
        vacasLactacao.forEach((v) => {
          const numeroStr = String(v.numero ?? "");
          const nome = mapAnimalIdToNome[v.id];

          if (nome) {
            const match = (lotesLeite || []).find((l) => String(l.nome || "").trim() === String(nome).trim());
            if (match?.id) {
              mapNumeroToLoteId[numeroStr] = match.id;
              return;
            }
          }

          if (v?.lote_id) {
            mapNumeroToLoteId[numeroStr] = v.lote_id;
          }
        });

        setLoteEfetivoPorNumero(mapNumeroToLoteId);
        setLoteEditPorNumero({});
      } catch (e) {
        console.error("Erro inesperado ao carregar lote vigente:", e);
      }
    }

    carregarLoteVigenteDaTabela();
  }, [dataTabela, vacasLactacao, lotesLeite]);

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
  const handleSalvarMedicoes = ({ data, medicoes }) => {
    setMedicoesPorDia((prev) => {
      const existentes = prev[data] || {};
      const mescladas = mergeMedicoesDia(existentes, medicoes);
      return { ...prev, [data]: mescladas };
    });

    setDataTabela(data);
    setDataAtual(ymdHoje());
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
      const user = authData?.user;
      if (authError || !user) {
        setSalvandoLotes(false);
        return;
      }

      const alteradas = Object.entries(loteEditPorNumero).filter(([_, loteId]) => loteId !== undefined);
      if (alteradas.length === 0) {
        setSalvandoLotes(false);
        return;
      }

      const updatesAnimais = [];
      const payloadMedicoes = [];

      alteradas.forEach(([numeroStr, loteId]) => {
        const vaca = vacasLactacao.find((v) => String(v.numero ?? "") === String(numeroStr));
        if (!vaca?.id) return;

        if (loteId && String(vaca.lote_id || "") !== String(loteId || "")) {
          updatesAnimais.push({ animal_id: vaca.id, lote_id: loteId });
        }

        const nome = loteId ? nomeDoLote(loteId) : "";

        payloadMedicoes.push({
          user_id: user.id,
          animal_id: vaca.id,
          data_medicao: dataTabela,
          tipo_lancamento: "2",
          lote: nome || null,
        });
      });

      if (payloadMedicoes.length > 0) {
        const { error } = await supabase
          .from("medicoes_leite")
          .upsert(payloadMedicoes, { onConflict: "user_id,animal_id,data_medicao" });

        if (error) {
          console.error("Erro ao salvar lote do dia em medicoes_leite:", error);
          alert("Erro ao salvar lote do dia. Veja o console.");
          setSalvandoLotes(false);
          return;
        }
      }

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

      setLoteEfetivoPorNumero((prev) => {
        const novo = { ...prev };
        alteradas.forEach(([numeroStr, loteId]) => {
          novo[String(numeroStr)] = loteId || null;
        });
        return novo;
      });
      setLoteEditPorNumero({});

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
