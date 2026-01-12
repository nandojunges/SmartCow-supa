// src/pages/Leite/ModalMedicaoLeite.jsx
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Select from "react-select";
import { supabase } from "../../lib/supabaseClient";

/* ===== helpers ===== */
const toNum = (v) => parseFloat(String(v ?? "0").replace(",", ".")) || 0;

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

// usa ultimo_parto (DATE do Supabase) e converte para BR
function getUltimoPartoBR(animal) {
  const iso = animal?.ultimo_parto;
  if (!iso) return "";
  const dt = new Date(iso);
  return Number.isNaN(dt.getTime()) ? "" : toBR(dt);
}

// ✅ soma/subtrai dias em string ISO yyyy-mm-dd
function addDaysISO(iso, delta) {
  if (!iso) return iso;
  const dt = new Date(iso + "T00:00:00");
  dt.setDate(dt.getDate() + delta);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/* ===== opções de tipo de lançamento (react-select) ===== */
const opcoesTipoLancamento = [
  { value: "total", label: "Somente total (litros/dia)" },
  { value: "2", label: "2 ordenhas (manhã + tarde)" },
  { value: "3", label: "3 ordenhas (manhã + tarde + 3ª)" },
];

/* estilos do react-select para ficar no padrão dos inputs */
const selectTipoStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: "40px",
    borderRadius: "0.75rem",
    borderColor: state.isFocused ? "#60a5fa" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 1px #60a5fa" : "none",
    "&:hover": { borderColor: "#60a5fa" },
    backgroundColor: "#f9fafb",
    fontSize: "0.95rem",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 0.75rem" }),
  menu: (base) => ({ ...base, borderRadius: "0.75rem", overflow: "hidden" }),
  menuPortal: (base) => ({ ...base, zIndex: 9999999 }),
  option: (base, state) => ({
    ...base,
    fontSize: "0.95rem",
    backgroundColor: state.isSelected ? "#2563eb" : state.isFocused ? "#e5edff" : "#fff",
    color: state.isSelected ? "#fff" : "#111827",
    cursor: "pointer",
  }),
  singleValue: (base) => ({ ...base, color: "#111827" }),
};

/* ===== estilo base para inputs de litragem ===== */
const inputMedirBase = {
  width: "90px",
  minWidth: "80px",
  padding: "0.35rem 0.55rem",
  borderRadius: "999px",
  border: "1px solid #cbd5e1",
  backgroundColor: "#f9fafb",
  fontSize: "0.9rem",
  textAlign: "center",
  outline: "none",
  boxSizing: "border-box",
};

/* ===== react-select do Lote na tabela (compacto) ===== */
const selectLoteStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 36,
    height: 36,
    borderRadius: 999,
    borderColor: state.isFocused ? "#60a5fa" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 1px #60a5fa" : "none",
    backgroundColor: "#f9fafb",
    fontSize: 13,
    cursor: "pointer",
  }),
  valueContainer: (base) => ({ ...base, padding: "0 10px" }),
  indicatorsContainer: (base) => ({ ...base, height: 36 }),
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

/* ===================== TABELA DE MEDIÇÃO ===================== */
function TabelaMedicaoLeite({
  vacas = [],
  tipoLancamento,
  medicoes,
  onChange,
  onKeyDownCampo,
  lotesOptions = [],
  inputRefs,
  bloquearLote = false,
}) {
  const [colunaHover, setColunaHover] = useState(null);

  const titulos = [
    "Número",
    "Brinco",
    "DEL",
    ...(tipoLancamento !== "total" ? ["Manhã", "Tarde"] : []),
    ...(tipoLancamento === "3" ? ["3ª"] : []),
    "Total",
    "Lote",
  ];

  const getLoteValue = (dados) => {
    const id = dados?.lote_id || null;
    if (!id) return null;
    return lotesOptions.find((o) => o.value === id) || null;
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table className="tabela-padrao">
        <thead>
          <tr>
            {titulos.map((titulo, index) => (
              <th
                key={titulo}
                onMouseEnter={() => setColunaHover(index)}
                onMouseLeave={() => setColunaHover(null)}
                className={colunaHover === index ? "coluna-hover" : ""}
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
              const del = calcularDEL(getUltimoPartoBR(vaca));

              const inputs = [];

              if (tipoLancamento !== "total") {
                inputs.push(
                  <input
                    key="manha"
                    ref={(el) => (inputRefs.current[`${rowIndex}-manha`] = el)}
                    type="number"
                    inputMode="decimal"
                    className="input-medir"
                    style={inputMedirBase}
                    value={dados.manha ?? ""}
                    onChange={(e) => onChange(numeroStr, "manha", e.target.value)}
                    onKeyDown={(e) => onKeyDownCampo(e, rowIndex, "manha")}
                  />,
                  <input
                    key="tarde"
                    ref={(el) => (inputRefs.current[`${rowIndex}-tarde`] = el)}
                    type="number"
                    inputMode="decimal"
                    className="input-medir"
                    style={inputMedirBase}
                    value={dados.tarde ?? ""}
                    onChange={(e) => onChange(numeroStr, "tarde", e.target.value)}
                    onKeyDown={(e) => onKeyDownCampo(e, rowIndex, "tarde")}
                  />
                );
              }

              if (tipoLancamento === "3") {
                inputs.push(
                  <input
                    key="terceira"
                    ref={(el) => (inputRefs.current[`${rowIndex}-terceira`] = el)}
                    type="number"
                    inputMode="decimal"
                    className="input-medir"
                    style={inputMedirBase}
                    value={dados.terceira ?? ""}
                    onChange={(e) => onChange(numeroStr, "terceira", e.target.value)}
                    onKeyDown={(e) => onKeyDownCampo(e, rowIndex, "terceira")}
                  />
                );
              }

              const totalReadOnly = tipoLancamento !== "total";
              inputs.push(
                <input
                  key="total"
                  ref={(el) => (inputRefs.current[`${rowIndex}-total`] = el)}
                  type="number"
                  inputMode="decimal"
                  className="input-medir"
                  style={{
                    ...inputMedirBase,
                    backgroundColor: totalReadOnly ? "#e5edff" : "#ffffff",
                    cursor: totalReadOnly ? "not-allowed" : "auto",
                    fontWeight: totalReadOnly ? 600 : 500,
                  }}
                  value={dados.total ?? ""}
                  readOnly={totalReadOnly}
                  onChange={(e) => !totalReadOnly && onChange(numeroStr, "total", e.target.value)}
                />
              );

              return (
                <tr key={vaca.id ?? vaca.numero ?? rowIndex}>
                  <td className={colunaHover === 0 ? "coluna-hover" : ""}>{vaca.numero ?? "—"}</td>
                  <td className={colunaHover === 1 ? "coluna-hover" : ""}>{vaca.brinco ?? "—"}</td>
                  <td className={colunaHover === 2 ? "coluna-hover" : ""}>{String(del)}</td>

                  {inputs.map((inputEl, idx) => (
                    <td key={idx} className={colunaHover === 3 + idx ? "coluna-hover" : ""}>
                      {inputEl}
                    </td>
                  ))}

                  <td className={colunaHover === titulos.length - 1 ? "coluna-hover" : ""}>
                    <div style={{ minWidth: 210 }}>
                      <Select
                        value={getLoteValue(dados)}
                        onChange={(opt) => {
                          const loteId = opt?.value || "";
                          const loteNome = opt?.meta?.nome || "";
                          onChange(numeroStr, "lote_id", loteId);
                          onChange(numeroStr, "lote", loteNome);
                        }}
                        options={lotesOptions}
                        styles={selectLoteStyles}
                        isClearable
                        placeholder="—"
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        isDisabled={bloquearLote}
                      />
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

/* ===================== MODAL MEDIÇÃO ===================== */

export default function ModalMedicaoLeite({
  aberto,
  dataInicial,
  vacas = [],
  medicoesIniciais = {},
  onFechar,
  onSalvar,
}) {
  const [dataMedicao, setDataMedicao] = useState(dataInicial);
  const [tipoLancamento, setTipoLancamento] = useState("2"); // padrão: 2 ordenhas

  const [medicoes, setMedicoes] = useState({});
  const [salvando, setSalvando] = useState(false);
  const inputRefs = useRef({});

  const [userId, setUserId] = useState(null);

  // ✅ lotes de Lactação (Alta/Média/Baixa) do banco
  const [lotesLeite, setLotesLeite] = useState([]);
  const [loadingLotes, setLoadingLotes] = useState(false);

  // ✅ persistência de lote dentro do modal (não “limpar” ao trocar datas)
  const loteCacheRef = useRef({}); // numeroStr -> lote_id (última seleção conhecida no modal)

  // ✅ bloquear lote no passado, a menos que habilite “Editar esta data”
  const [modoEdicaoPassado, setModoEdicaoPassado] = useState(false);

  const hojeISO = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${dd}`;
  }, []);

  const dataEhPassada = useMemo(() => {
    if (!dataMedicao) return false;
    return dataMedicao < hojeISO; // ISO yyyy-mm-dd: comparação por string funciona
  }, [dataMedicao, hojeISO]);

  const bloquearLote = dataEhPassada && !modoEdicaoPassado;

  const lotesOptions = useMemo(() => {
    return (lotesLeite || []).map((l) => ({
      value: l.id,
      label: `${l.nome} — ${l.nivel_produtivo}`,
      meta: { nome: l.nome, nivel: l.nivel_produtivo },
    }));
  }, [lotesLeite]);

  const calcularTotal = useCallback(
    ({ manha, tarde, terceira }) => {
      const m = toNum(manha);
      const t = toNum(tarde);
      const c = toNum(terceira);
      if (tipoLancamento === "3") return (m + t + c).toFixed(1);
      if (tipoLancamento === "2") return (m + t).toFixed(1);
      return ""; // no modo "total" quem digita é o usuário
    },
    [tipoLancamento]
  );

  // ✅ cria base vazia para TODAS as vacas (com cache de lote)
  const criarMapaVazio = useCallback(() => {
    const base = {};
    (vacas || []).forEach((v) => {
      const numeroStr = String(v.numero ?? "");
      const loteIdCache = loteCacheRef.current[numeroStr];
      base[numeroStr] = {
        lote_id: loteIdCache || v?.lote_id || "",
        lote: "",
      };
    });
    return base;
  }, [vacas]);

  // ✅ listener global ESC para fechar
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => {
      if (e.key === "Escape") onFechar?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto, onFechar]);

  // ✅ pega userId ao abrir
  useEffect(() => {
    if (!aberto) return;
    let ativo = true;

    (async () => {
      const { data: authData, error } = await supabase.auth.getUser();
      if (!ativo) return;

      if (error || !authData?.user) {
        console.error("Erro ao obter usuário:", error);
        setUserId(null);
        return;
      }
      setUserId(authData.user.id);
    })();

    return () => {
      ativo = false;
    };
  }, [aberto]);

  // ✅ carrega lotes do banco ao abrir (apenas Lactação com nível e ativo)
  useEffect(() => {
    if (!aberto) return;
    if (!userId) return;

    let ativo = true;
    setLoadingLotes(true);

    (async () => {
      const { data, error } = await supabase
        .from("lotes")
        .select("id,nome,funcao,nivel_produtivo,ativo")
        .eq("funcao", "Lactação")
        .eq("ativo", true)
        .not("nivel_produtivo", "is", null)
        .order("nome", { ascending: true });

      if (!ativo) return;

      if (error) {
        console.error("Erro ao carregar lotes (Lactação):", error);
        setLotesLeite([]);
        setLoadingLotes(false);
        return;
      }

      setLotesLeite(Array.isArray(data) ? data : []);
      setLoadingLotes(false);
    })();

    return () => {
      ativo = false;
    };
  }, [aberto, userId]);

  // ✅ ao abrir: define data e carrega medições iniciais (se vierem)
  useEffect(() => {
    if (!aberto) return;

    setDataMedicao(dataInicial);

    const base = criarMapaVazio();
    Object.keys(base).forEach((numeroStr) => {
      base[numeroStr] = { ...base[numeroStr], ...(medicoesIniciais[numeroStr] || {}) };
    });

    // se já existe lote_id mas não existe lote (nome), tenta preencher pelo cache de lotes
    setMedicoes(base);
  }, [aberto, dataInicial, medicoesIniciais, criarMapaVazio]);

  // ✅ reseta modo edição ao trocar a data (evita “ficar editando passado sem querer”)
  useEffect(() => {
    if (!aberto) return;
    setModoEdicaoPassado(false);
  }, [aberto, dataMedicao]);

  // ✅ helper: traduz lote_id -> nome (para salvar em medicoes_leite.lote)
  const nomeDoLote = useCallback(
    (loteId) => {
      if (!loteId) return "";
      const l = (lotesLeite || []).find((x) => x.id === loteId);
      return l?.nome || "";
    },
    [lotesLeite]
  );

  // ✅ busca o ÚLTIMO lote conhecido ATÉ a data (para preencher dias sem medição)
  const carregarUltimoLoteAteData = useCallback(
    async (dataISO) => {
      if (!aberto) return {};
      if (!userId) return {};

      const ids = (vacas || []).map((v) => v.id).filter(Boolean);
      if (ids.length === 0) return {};

      // janela (ajuste se quiser mais/menos histórico)
      const desde = addDaysISO(dataISO, -400);

      const { data: rows, error } = await supabase
        .from("medicoes_leite")
        .select("animal_id,data_medicao,lote")
        .eq("user_id", userId)
        .in("animal_id", ids)
        .lte("data_medicao", dataISO)
        .gte("data_medicao", desde)
        .not("lote", "is", null)
        .order("data_medicao", { ascending: false });

      if (error) {
        console.error("Erro ao buscar último lote até a data:", error);
        return {};
      }

      const mapAnimalIdToNome = {};
      for (const r of rows || []) {
        if (!mapAnimalIdToNome[r.animal_id]) {
          const nome = String(r.lote || "").trim();
          if (nome) mapAnimalIdToNome[r.animal_id] = nome;
        }
      }

      const mapNumeroToNome = {};
      (vacas || []).forEach((v) => {
        const nome = mapAnimalIdToNome[v.id];
        if (nome) mapNumeroToNome[String(v.numero ?? "")] = nome;
      });

      return mapNumeroToNome;
    },
    [aberto, userId, vacas]
  );

  // ✅ CARREGAR DO BANCO SEMPRE QUE TROCAR A DATA
  const carregarMedicoesDaData = useCallback(
    async (dataISO) => {
      if (!aberto) return;
      if (!userId) return;

      const ids = (vacas || []).map((v) => v.id).filter(Boolean);
      const baseVazio = criarMapaVazio();

      if (ids.length === 0) {
        setMedicoes(baseVazio);
        return;
      }

      const { data: rows, error } = await supabase
        .from("medicoes_leite")
        .select("animal_id, litros_manha, litros_tarde, litros_terceira, litros_total, lote, tipo_lancamento")
        .eq("user_id", userId)
        .eq("data_medicao", dataISO)
        .in("animal_id", ids);

      if (error) {
        console.error("Erro ao buscar medições do dia:", error);
        setMedicoes(baseVazio);
        return;
      }

      // se existir pelo menos 1 registro, usa o tipo do primeiro (modo edição)
      if (rows && rows.length > 0) {
        const tipoBanco = rows[0]?.tipo_lancamento;
        if (tipoBanco === "total" || tipoBanco === "2" || tipoBanco === "3") setTipoLancamento(tipoBanco);
      }

      // ✅ lote histórico (último conhecido até a data) para dias sem medição
      const ultimoLoteNomePorNumero = await carregarUltimoLoteAteData(dataISO);

      const mapa = { ...baseVazio };

      rows?.forEach((r) => {
        const vaca = (vacas || []).find((v) => v.id === r.animal_id);
        if (!vaca) return;

        const numeroStr = String(vaca.numero ?? "");

        // r.lote é texto (nome) no seu modelo atual → tenta mapear para lote_id
        let loteId = mapa[numeroStr]?.lote_id || vaca?.lote_id || "";
        const nome = String(r.lote || "").trim();

        if (nome && !loteId) {
          const match = (lotesLeite || []).find((l) => (l.nome || "").trim() === nome);
          if (match?.id) loteId = match.id;
        }

        mapa[numeroStr] = {
          ...mapa[numeroStr],
          lote_id: loteId || "",
          lote: nome || (loteId ? nomeDoLote(loteId) : ""),
          manha: r.litros_manha ?? "",
          tarde: r.litros_tarde ?? "",
          terceira: r.litros_terceira ?? "",
          total: r.litros_total ?? "",
        };

        // cache local (não perder ao navegar)
        if (mapa[numeroStr]?.lote_id) {
          loteCacheRef.current[numeroStr] = mapa[numeroStr].lote_id;
        }
      });

      // ✅ aplica lote histórico quando o DIA não tem lote
      Object.keys(mapa).forEach((numeroStr) => {
        const temLoteNoDia = String(mapa[numeroStr]?.lote || "").trim();
        const temLoteId = String(mapa[numeroStr]?.lote_id || "").trim();

        if (!temLoteNoDia) {
          const nomeHist = String(ultimoLoteNomePorNumero[numeroStr] || "").trim();

          if (nomeHist) {
            const match = (lotesLeite || []).find((l) => (l.nome || "").trim() === nomeHist);

            if (match?.id) {
              mapa[numeroStr].lote_id = match.id;
              mapa[numeroStr].lote = match.nome;
              loteCacheRef.current[numeroStr] = match.id;
            } else {
              // compatibilidade: ao menos exibe o nome (sem id)
              mapa[numeroStr].lote = nomeHist;
            }
          } else if (temLoteId && !mapa[numeroStr].lote) {
            // se só existe lote_id, garante o nome
            mapa[numeroStr].lote = nomeDoLote(mapa[numeroStr].lote_id);
          }
        } else {
          // se tem nome no dia, garante nome quando só existe id
          if (temLoteId && !mapa[numeroStr].lote) {
            mapa[numeroStr].lote = nomeDoLote(mapa[numeroStr].lote_id);
          }
          // garante cache
          if (temLoteId) loteCacheRef.current[numeroStr] = mapa[numeroStr].lote_id;
        }
      });

      setMedicoes(mapa);
    },
    [aberto, userId, vacas, criarMapaVazio, lotesLeite, nomeDoLote, carregarUltimoLoteAteData]
  );

  // ✅ dispara o carregamento quando a data mudar
  useEffect(() => {
    if (!aberto) return;
    if (!dataMedicao) return;
    carregarMedicoesDaData(dataMedicao);
  }, [aberto, dataMedicao, carregarMedicoesDaData]);

  // ✅ quando trocar tipo, recalcula "total"
  useEffect(() => {
    if (!aberto) return;
    if (tipoLancamento === "total") return;

    setMedicoes((prev) => {
      const novo = { ...prev };
      Object.keys(novo).forEach((numeroStr) => {
        const d = novo[numeroStr] || {};
        const manha = d.manha ?? "";
        const tarde = d.tarde ?? "";
        const terceira = d.terceira ?? "";
        novo[numeroStr] = { ...d, total: calcularTotal({ manha, tarde, terceira }) };
      });
      return novo;
    });
  }, [tipoLancamento, aberto, calcularTotal]);

  const handleChange = (numero, campo, valor) => {
    const numeroStr = String(numero);

    setMedicoes((prev) => {
      const antigo = prev[numeroStr] || {};
      const atualizado = { ...antigo, [campo]: valor };

      // se mudou lote_id, atualiza também lote (nome) + cache local
      if (campo === "lote_id") {
        const nome = valor ? nomeDoLote(valor) : "";
        atualizado.lote = nome;
        if (valor) loteCacheRef.current[numeroStr] = valor;
      }

      if (tipoLancamento !== "total") {
        const manha = campo === "manha" ? valor : antigo.manha || "0";
        const tarde = campo === "tarde" ? valor : antigo.tarde || "0";
        const terceira = campo === "terceira" ? valor : antigo.terceira || "0";
        atualizado.total = calcularTotal({ manha, tarde, terceira });
      }

      return { ...prev, [numeroStr]: atualizado };
    });
  };

  const handleKeyDownCampo = (e, rowIndex, campo) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onFechar?.();
      return;
    }
    if (e.key !== "Enter" && e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

    let proxRow = rowIndex;
    if (e.key === "Enter" || e.key === "ArrowDown") proxRow = rowIndex + 1;
    if (e.key === "ArrowUp") proxRow = rowIndex - 1;
    if (proxRow < 0 || proxRow >= vacas.length) return;

    const el = inputRefs.current[`${proxRow}-${campo}`];
    if (el) {
      e.preventDefault();
      el.focus();
    }
  };

  // ✅ helper: monta payload SEM mandar null desnecessário
  const montarPayloadLinha = ({ userId, vaca, dados }) => {
    const base = {
      user_id: userId,
      animal_id: vaca.id,
      data_medicao: dataMedicao,
      tipo_lancamento: tipoLancamento,
      // compatibilidade: salva o NOME do lote no histórico da medição
      lote: (dados.lote || "").trim() || null,
    };

    if (dados.total !== undefined && dados.total !== "") base.litros_total = toNum(dados.total);

    if (tipoLancamento !== "total") {
      if (dados.manha !== undefined && dados.manha !== "") base.litros_manha = toNum(dados.manha);
      if (dados.tarde !== undefined && dados.tarde !== "") base.litros_tarde = toNum(dados.tarde);

      if (tipoLancamento === "3") {
        if (dados.terceira !== undefined && dados.terceira !== "") base.litros_terceira = toNum(dados.terceira);
      }
    }

    return base;
  };

  const salvar = async () => {
    try {
      setSalvando(true);

      const { data: authData, error: userError } = await supabase.auth.getUser();
      const user = authData?.user;

      if (userError || !user) {
        console.error("Erro ao obter usuário:", userError);
        alert("Não foi possível identificar o usuário logado.");
        setSalvando(false);
        return;
      }

      const payload = [];
      const updatesAnimais = []; // { animal_id, lote_id }

      Object.entries(medicoes).forEach(([numeroStr, dados]) => {
        const temAlgumValor = dados.total || dados.manha || dados.tarde || dados.terceira;
        const temLote = !!dados.lote_id;

        // se não tem nada preenchido e não definiu lote, ignora
        if (!temAlgumValor && !temLote) return;

        const vaca = vacas.find((v) => String(v.numero ?? "") === String(numeroStr));
        if (!vaca || !vaca.id) {
          console.warn("Vaca sem id ou não encontrada para numero", numeroStr);
          return;
        }

        // sempre que tiver valor (medição), salva registro
        if (temAlgumValor) {
          payload.push(montarPayloadLinha({ userId: user.id, vaca, dados }));
        }

        // se mudou o lote_id, atualiza animal.lote_id (para contar nos Lotes)
        if (temLote && String(vaca.lote_id || "") !== String(dados.lote_id || "")) {
          updatesAnimais.push({ animal_id: vaca.id, lote_id: dados.lote_id });
        }
      });

      // 1) salva medições (se houver)
      if (payload.length > 0) {
        const { error } = await supabase
          .from("medicoes_leite")
          .upsert(payload, { onConflict: "user_id,animal_id,data_medicao" });

        if (error) {
          console.error("Erro ao salvar medições:", error);
          alert("Erro ao salvar medições no banco. Veja o console para detalhes.");
          setSalvando(false);
          return;
        }
      }

      // 2) atualiza lotes dos animais (para refletir contagem)
      if (updatesAnimais.length > 0) {
        const results = await Promise.all(
          updatesAnimais.map((u) => supabase.from("animais").update({ lote_id: u.lote_id }).eq("id", u.animal_id))
        );

        const algumErro = results.find((r) => r.error);
        if (algumErro?.error) {
          console.error("Erro ao atualizar lote_id em animais:", algumErro.error);
          alert("As medições salvaram, mas houve erro ao atualizar o lote das vacas (veja o console).");
        }
      }

      onSalvar?.({ data: dataMedicao, tipoLancamento, medicoes });

      // recarrega do banco para garantir consistência
      await carregarMedicoesDaData(dataMedicao);

      setSalvando(false);
      onFechar?.();
    } catch (err) {
      console.error("Erro inesperado ao salvar medições:", err);
      alert("Ocorreu um erro inesperado ao salvar as medições.");
      setSalvando(false);
    }
  };

  if (!aberto) return null;

  return (
    <div style={overlay}>
      <div style={modalBig}>
        <div style={header}>
          <span>🥛 Registro da coleta de leite — {new Date(dataMedicao).toLocaleDateString("pt-BR")}</span>
          <button type="button" onClick={onFechar} style={botaoFecharHeader} disabled={salvando}>
            Fechar
          </button>
        </div>

        <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={gridCompacto}>
            <div>
              <label style={labelEstilo}>Data da medição</label>

              <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                <button
                  type="button"
                  className="botao-editar"
                  style={botaoSetaDiaRound}
                  onClick={() => setDataMedicao((d) => addDaysISO(d, -1))}
                  disabled={salvando}
                  title="Dia anterior"
                >
                  ◀
                </button>

                <input
                  type="date"
                  value={dataMedicao}
                  onChange={(e) => setDataMedicao(e.target.value)}
                  onKeyDown={(e) => e.key === "Escape" && onFechar?.()}
                  style={inputBase}
                  disabled={salvando}
                />

                <button
                  type="button"
                  className="botao-editar"
                  style={botaoSetaDiaRound}
                  onClick={() => setDataMedicao((d) => addDaysISO(d, +1))}
                  disabled={salvando}
                  title="Próximo dia"
                >
                  ▶
                </button>
              </div>

              {dataEhPassada && (
                <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>
                    Data passada: o lote fica bloqueado para evitar mudança retroativa.
                  </span>
                  <button
                    type="button"
                    className="botao-editar"
                    style={{ ...botaoSetaDiaRound, width: "auto", padding: "0 14px", borderRadius: 999 }}
                    onClick={() => setModoEdicaoPassado((v) => !v)}
                    disabled={salvando}
                    title="Habilitar edição retroativa"
                  >
                    {modoEdicaoPassado ? "Bloquear edição" : "Editar esta data"}
                  </button>
                </div>
              )}
            </div>

            <div>
              <label style={labelEstilo}>Tipo de lançamento</label>
              <Select
                value={opcoesTipoLancamento.find((opt) => opt.value === tipoLancamento)}
                onChange={(opt) => setTipoLancamento(opt?.value ?? "2")}
                options={opcoesTipoLancamento}
                styles={selectTipoStyles}
                isDisabled={salvando}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#64748b", marginTop: -6 }}>
            {loadingLotes ? "Carregando lotes de Lactação…" : `Lotes disponíveis: ${(lotesLeite || []).length} (Alta/Média/Baixa Produção)`}
          </div>

          <TabelaMedicaoLeite
            vacas={vacas}
            tipoLancamento={tipoLancamento}
            medicoes={medicoes}
            onChange={handleChange}
            onKeyDownCampo={handleKeyDownCampo}
            lotesOptions={lotesOptions}
            inputRefs={inputRefs}
            bloquearLote={bloquearLote}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.9rem", marginTop: "1.25rem" }}>
            <button type="button" onClick={onFechar} style={botaoCancelar} disabled={salvando}>
              Cancelar
            </button>
            <button type="button" onClick={salvar} style={botaoConfirmar} disabled={salvando}>
              {salvando ? "Salvando..." : "📂 Salvar medições"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== estilos inline do modal ===== */

const overlay = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalBig = {
  background: "#fff",
  borderRadius: "1rem",
  width: "1100px",
  maxWidth: "95vw",
  maxHeight: "95vh",
  overflowY: "auto",
  fontFamily: "Poppins, sans-serif",
  boxShadow: "0 0 24px rgba(15,23,42,0.35)",
};

const header = {
  background: "#1e3a8a",
  color: "white",
  padding: "1rem 1.5rem",
  fontWeight: "bold",
  fontSize: "1.05rem",
  borderTopLeftRadius: "1rem",
  borderTopRightRadius: "1rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const gridCompacto = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 320px) minmax(220px, 260px)",
  gap: "1.5rem",
};

const inputBase = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  fontSize: "0.95rem",
  borderRadius: "0.75rem",
  border: "1px solid #cbd5e1",
  backgroundColor: "#f9fafb",
  outline: "none",
  boxSizing: "border-box",
};

const labelEstilo = {
  marginBottom: "0.25rem",
  display: "inline-block",
  fontWeight: 600,
  fontSize: "0.9rem",
};

const botaoSetaDiaRound = {
  width: "42px",
  height: "42px",
  padding: 0,
  borderRadius: "9999px",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  lineHeight: 1,
  fontWeight: 700,
};

const botaoFecharHeader = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  padding: "0.45rem 1.1rem",
  borderRadius: "999px",
  cursor: "pointer",
  fontSize: "0.9rem",
  fontWeight: 600,
};

const botaoCancelar = {
  background: "#fee2e2",
  border: "1px solid #fecaca",
  color: "#991b1b",
  padding: "0.55rem 1.3rem",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "0.9rem",
};

const botaoConfirmar = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  padding: "0.6rem 1.6rem",
  borderRadius: "999px",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: "0.95rem",
};
