// src/pages/Animais/Plantel.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Select from "react-select";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/tabelaModerna.css";
import FichaAnimal from "./FichaAnimal/FichaAnimal";

/* ========= helpers de data ========= */
// aceita "2023-01-01" ou "dd/mm/aaaa"
function parseDateFlexible(s) {
  if (!s) return null;
  if (typeof s !== "string") s = String(s);

  // ISO: yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = +m[1];
    const mo = +m[2];
    const d = +m[3];
    const dt = new Date(y, mo - 1, d);
    return Number.isFinite(+dt) ? dt : null;
  }

  // BR: dd/mm/aaaa
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const d = +m[1];
    const mo = +m[2];
    const y = +m[3];
    const dt = new Date(y, mo - 1, d);
    return Number.isFinite(+dt) ? dt : null;
  }

  return null;
}

function idadeTexto(nascimento) {
  const dt = parseDateFlexible(nascimento);
  if (!dt) return "—";

  const hoje = new Date();
  let meses =
    (hoje.getFullYear() - dt.getFullYear()) * 12 +
    (hoje.getMonth() - dt.getMonth());

  if (hoje.getDate() < dt.getDate()) meses -= 1;
  if (meses < 0) meses = 0;

  const anos = Math.floor(meses / 12);
  const rem = meses % 12;
  return `${anos}a ${rem}m`;
}

/**
 * DEL (Dias em Lactação)
 * - Se não houver secagem -> dias entre parto e hoje
 */
function delFromParto(partoStr, secagemOpcional) {
  const parto = parseDateFlexible(partoStr);
  if (!parto) return "—";

  if (secagemOpcional) {
    const sec = parseDateFlexible(secagemOpcional);
    if (sec && sec > parto) {
      const dias = Math.floor((sec.getTime() - parto.getTime()) / 86400000);
      if (!Number.isFinite(dias)) return "—";
      return String(Math.max(0, dias));
    }
  }

  const hoje = new Date();
  const dias = Math.floor((hoje.getTime() - parto.getTime()) / 86400000);
  if (!Number.isFinite(dias)) return "—";
  return String(Math.max(0, dias));
}

function delNumeroFromParto(partoStr, secagemOpcional) {
  const parto = parseDateFlexible(partoStr);
  if (!parto) return null;

  if (secagemOpcional) {
    const sec = parseDateFlexible(secagemOpcional);
    if (sec && sec > parto) {
      const dias = Math.floor((sec.getTime() - parto.getTime()) / 86400000);
      return Number.isFinite(dias) ? Math.max(0, dias) : null;
    }
  }

  const hoje = new Date();
  const dias = Math.floor((hoje.getTime() - parto.getTime()) / 86400000);
  return Number.isFinite(dias) ? Math.max(0, dias) : null;
}

function formatProducao(valor) {
  if (!Number.isFinite(valor)) return "—";
  return valor.toFixed(1).replace(".", ",");
}

export default function Plantel() {
  const [animais, setAnimais] = useState([]);
  const [racaMap, setRacaMap] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [lotes, setLotes] = useState([]);
  const [loteAviso, setLoteAviso] = useState("");
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);
  const [ultProducao, setUltProducao] = useState({});
  const [editingLoteId, setEditingLoteId] = useState(null);
  const [openPopoverKey, setOpenPopoverKey] = useState(null);
  const popoverRef = useRef(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filtros, setFiltros] = useState({
    lote: "all",
    situacaoProdutiva: "all",
    situacaoReprodutiva: "all",
    origem: "all",
    animalRaca: "all",
    animalSexo: "all",
    animalBusca: "",
  });

  const LOTE_FIELD = "lote_id";
  const LOTE_TABLE = "lotes";

  // ficha
  const [animalSelecionado, setAnimalSelecionado] = useState(null);
  const abrirFichaAnimal = (animal) => setAnimalSelecionado(animal);
  const fecharFichaAnimal = () => setAnimalSelecionado(null);

  const loteOptions = useMemo(() => {
    const baseOptions = (lotes || []).map((lote) => {
      const label =
        lote.nome ??
        lote.nome ??
        lote.descricao ??
        lote.titulo ??
        lote.label ??
        String(lote.id ?? "—");
      return {
        value: lote.id,
        label,
      };
    });
    return [{ value: null, label: "Sem lote" }, ...baseOptions];
  }, [lotes]);

  const lotesById = useMemo(() => {
    const map = {};
    (lotes || []).forEach((lote) => {
      if (lote?.id == null) return;
      map[lote.id] = lote.nome ?? lote.descricao ?? lote.titulo ?? lote.label ?? String(lote.id);
    });
    return map;
  }, [lotes]);

  const carregarAnimais = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("animais")
      .select("*")
      .eq("user_id", userId)
      .eq("ativo", true)
      .order("numero", { ascending: true });

    if (error) throw error;
    setAnimais(Array.isArray(data) ? data : []);
  }, []);

  const carregarLotes = useCallback(async (userId) => {
    let { data, error } = await supabase
      .from(LOTE_TABLE)
      .select("*")
      .order("id", { ascending: true })
      .eq("user_id", userId);

    if (error && /column .*user_id.* does not exist/i.test(error.message || "")) {
      const retry = await supabase.from(LOTE_TABLE).select("*").order("id", { ascending: true });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("Erro ao carregar lotes:", error);
      setLotes([]);
      return;
    }

    setLotes(Array.isArray(data) ? data : []);
  }, []);

  const carregarRacas = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("racas")
      .select("id, nome")
      .eq("user_id", userId);

    if (error) throw error;

    const map = {};
    (data || []).forEach((r) => {
      map[r.id] = r.nome;
    });
    setRacaMap(map);
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      setCarregando(true);
      setErro("");
      setLoteAviso("");

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) throw new Error("Usuário não autenticado.");
        if (!ativo) return;

        await Promise.all([
          carregarAnimais(user.id),
          carregarLotes(user.id),
          carregarRacas(user.id),
        ]);
      } catch (e) {
        console.error("Erro ao carregar plantel:", e);
        if (!ativo) return;
        setErro("Não foi possível carregar a lista de animais.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarDados();
    return () => {
      ativo = false;
    };
  }, [carregarAnimais, carregarLotes, carregarRacas]);

  useEffect(() => {
    let ativo = true;

    async function carregarUltimaProducao() {
      if (!Array.isArray(animais) || animais.length === 0) {
        if (ativo) setUltProducao({});
        return;
      }

      const ids = animais
        .filter((animal) => /lact|lac/i.test(String(animal?.situacao_produtiva || "")))
        .map((animal) => animal.id)
        .filter(Boolean);
      if (ids.length === 0) {
        if (ativo) setUltProducao({});
        return;
      }

      const tabelasLeite = ["medicoes_leite", "leite_registros", "producoes_leite", "leite"];
      const camposData = ["data", "data_registro", "created_at"];

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const extrairValor = (registro) => {
        const totalRaw =
          registro?.total ??
          registro?.total_litros ??
          registro?.litros_total;
        if (Number.isFinite(Number(totalRaw))) return Number(totalRaw);

        const somaCampos = ["manha", "tarde", "terceira", "noite"];
        const soma = somaCampos.reduce((acc, campo) => {
          const valor = Number(registro?.[campo] ?? 0);
          return Number.isFinite(valor) ? acc + valor : acc;
        }, 0);
        if (soma > 0) return soma;

        const valorRaw = [registro?.litros, registro?.volume, registro?.producao].find(
          (valor) => valor != null && valor !== ""
        );
        const valor = Number(valorRaw);
        return Number.isFinite(valor) ? valor : null;
      };

      for (const tabela of tabelasLeite) {
        for (const campoData of camposData) {
          let consulta = supabase
            .from(tabela)
            .select("*")
            .in("animal_id", ids)
            .order(campoData, { ascending: false })
            .limit(800);

          if (user?.id) {
            consulta = consulta.eq("user_id", user.id);
          }

          let { data, error } = await consulta;

          if (error && /column .*user_id.* does not exist/i.test(error.message || "")) {
            const retry = await supabase
              .from(tabela)
              .select("*")
              .in("animal_id", ids)
              .order(campoData, { ascending: false })
              .limit(800);
            data = retry.data;
            error = retry.error;
          }

          if (error) {
            if (/column .* does not exist/i.test(error.message || "")) {
              continue;
            }
            if (/relation .* does not exist/i.test(error.message || "")) {
              break;
            }
          }

          if (Array.isArray(data)) {
            const mapa = {};
            data.forEach((registro) => {
              const animalId = registro?.animal_id;
              if (!animalId || Object.prototype.hasOwnProperty.call(mapa, animalId)) return;
              const valor = extrairValor(registro);
              if (Number.isFinite(valor)) {
                mapa[animalId] = valor;
              }
            });
            if (ativo) setUltProducao(mapa);
            return;
          }
        }
      }

      if (ativo) setUltProducao({});
    }

    carregarUltimaProducao();

    return () => {
      ativo = false;
    };
  }, [animais]);

  const linhas = useMemo(() => (Array.isArray(animais) ? animais : []), [animais]);
  const situacoesProdutivas = useMemo(() => {
    const valores = new Set();
    linhas.forEach((animal) => {
      const valor = String(animal?.situacao_produtiva || "").trim();
      if (valor) valores.add(valor);
    });
    return Array.from(valores).sort((a, b) => a.localeCompare(b));
  }, [linhas]);

  const situacoesReprodutivas = useMemo(() => {
    const valores = new Set();
    linhas.forEach((animal) => {
      const valor = String(animal?.situacao_reprodutiva || "").trim();
      if (valor) valores.add(valor);
    });
    return Array.from(valores).sort((a, b) => a.localeCompare(b));
  }, [linhas]);

  const origensDisponiveis = useMemo(() => {
    const valores = new Set();
    linhas.forEach((animal) => {
      const valor = String(animal?.origem || "").trim();
      if (valor) valores.add(valor);
    });
    return Array.from(valores).sort((a, b) => a.localeCompare(b));
  }, [linhas]);

  const racasDisponiveis = useMemo(() => {
    const valores = new Map();
    linhas.forEach((animal) => {
      const id = animal?.raca_id;
      if (id == null) return;
      const nome = racaMap[id];
      if (nome) valores.set(id, nome);
    });
    return Array.from(valores.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [linhas, racaMap]);

  const sexosDisponiveis = useMemo(() => {
    const valores = new Set();
    linhas.forEach((animal) => {
      const valor = String(animal?.sexo || "").trim();
      if (valor) valores.add(valor);
    });
    return Array.from(valores).sort((a, b) => a.localeCompare(b));
  }, [linhas]);

  const selectStylesCompact = useMemo(
    () => ({
      container: (base) => ({
        ...base,
        width: "100%",
      }),
      control: (base, state) => ({
        ...base,
        minHeight: 34,
        height: "auto",
        borderRadius: 10,
        fontWeight: 800,
        borderColor: state.isFocused
          ? "rgba(37,99,235,0.55)"
          : "rgba(37,99,235,0.25)",
        boxShadow: "none",
        backgroundColor: "#fff",
        cursor: "pointer",
        ":hover": {
          borderColor: "rgba(37,99,235,0.55)",
        },
      }),
      valueContainer: (base) => ({
        ...base,
        padding: "0 10px",
      }),
      input: (base) => ({
        ...base,
        margin: 0,
        padding: 0,
      }),
      singleValue: (base) => ({
        ...base,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }),
      indicatorsContainer: (base) => ({
        ...base,
        height: 34,
      }),
      menu: (base) => ({
        ...base,
        zIndex: 20,
      }),
      menuPortal: (base) => ({
        ...base,
        zIndex: 9999,
      }),
    }),
    []
  );

  const closeLoteEdit = useCallback(() => {
    setEditingLoteId(null);
  }, []);

  const handleLoteBlur = useCallback(() => {
    setTimeout(() => {
      setEditingLoteId(null);
    }, 150);
  }, []);

  const resolveSelectedLote = useCallback(
    (animal) => {
      const valorAtual = animal?.[LOTE_FIELD];
      if (valorAtual == null) {
        return loteOptions.find((opt) => opt.value === null) || null;
      }
      return loteOptions.find((opt) => opt.value === valorAtual) || null;
    },
    [LOTE_FIELD, loteOptions]
  );

  const resolveLoteLabel = useCallback(
    (animal) => {
      if (!animal) return "Sem lote";
      const valorAtual = animal[LOTE_FIELD];
      if (valorAtual == null || valorAtual === "") return "Sem lote";
      return lotesById[valorAtual] || "Sem lote";
    },
    [LOTE_FIELD, lotesById]
  );

  const handleSetLote = useCallback(
    async (animal, option) => {
      if (!animal?.id) return;
      const loteId = option?.value ?? null;
      const valorNovo = loteId;
      const valorAnterior = animal[LOTE_FIELD] ?? null;

      setAnimais((prev) =>
        prev.map((item) =>
          item.id === animal.id
            ? { ...item, [LOTE_FIELD]: valorNovo }
            : item
        )
      );
      setLoteAviso("");

      const { error: updateErr } = await supabase
        .from("animais")
        .update({ [LOTE_FIELD]: valorNovo })
        .eq("id", animal.id);

      if (updateErr) {
        setAnimais((prev) =>
          prev.map((item) =>
            item.id === animal.id
              ? { ...item, [LOTE_FIELD]: valorAnterior }
              : item
          )
        );
        setLoteAviso("Não foi possível atualizar o lote. Tente novamente.");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        await carregarAnimais(user.id);
      }
      closeLoteEdit();
    },
    [LOTE_FIELD, carregarAnimais, closeLoteEdit]
  );

  useEffect(() => {
    if (!openPopoverKey) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      if (popoverRef.current?.contains(target)) return;
      if (target?.closest?.("[data-filter-trigger='true']")) return;
      setOpenPopoverKey(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpenPopoverKey(null);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openPopoverKey]);

  const handleColEnter = useCallback((colKey) => {
    setHoveredColKey(colKey);
    setHoveredRowId(null);
  }, []);

  const handleCellEnter = useCallback((rowId, colKey) => {
    setHoveredRowId(rowId);
    setHoveredColKey(colKey);
  }, []);

  const toggleSort = useCallback((key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      if (prev.direction === "desc") return { key: null, direction: null };
      return { key, direction: "asc" };
    });
  }, []);

  const handleTogglePopover = useCallback((key) => {
    setOpenPopoverKey((prev) => (prev === key ? null : key));
  }, []);

  const filtrosAtivos = useMemo(() => {
    const chips = [];
    if (filtros.lote !== "all") {
      const label =
        filtros.lote === "sem"
          ? "Sem lote"
          : lotesById[filtros.lote] || "Lote";
      chips.push({ key: "lote", label: `Lote: ${label}` });
    }
    if (filtros.situacaoProdutiva !== "all") {
      const label =
        filtros.situacaoProdutiva === "lac"
          ? "LAC"
          : filtros.situacaoProdutiva === "nao_lactante"
            ? "Não lactante"
            : filtros.situacaoProdutiva;
      chips.push({ key: "situacaoProdutiva", label: `Produtiva: ${label}` });
    }
    if (filtros.situacaoReprodutiva !== "all") {
      chips.push({
        key: "situacaoReprodutiva",
        label: `Reprodutiva: ${filtros.situacaoReprodutiva}`,
      });
    }
    if (filtros.origem !== "all") {
      chips.push({ key: "origem", label: `Origem: ${filtros.origem}` });
    }
    if (filtros.animalRaca !== "all") {
      const racaLabel =
        racaMap[filtros.animalRaca] || "Raça";
      chips.push({ key: "animalRaca", label: `Raça: ${racaLabel}` });
    }
    if (filtros.animalSexo !== "all") {
      const sexoLabel =
        filtros.animalSexo === "macho"
          ? "Macho"
          : filtros.animalSexo === "femea"
            ? "Fêmea"
            : filtros.animalSexo;
      chips.push({ key: "animalSexo", label: `Sexo: ${sexoLabel}` });
    }
    if (filtros.animalBusca.trim()) {
      chips.push({ key: "animalBusca", label: `Busca: ${filtros.animalBusca.trim()}` });
    }
    return chips;
  }, [filtros, lotesById, racaMap]);

  const limparFiltro = useCallback((key) => {
    setFiltros((prev) => {
      if (key === "animalBusca") return { ...prev, animalBusca: "" };
      if (key === "animalRaca") return { ...prev, animalRaca: "all" };
      if (key === "animalSexo") return { ...prev, animalSexo: "all" };
      if (key === "lote") return { ...prev, lote: "all" };
      if (key === "situacaoProdutiva") return { ...prev, situacaoProdutiva: "all" };
      if (key === "situacaoReprodutiva") return { ...prev, situacaoReprodutiva: "all" };
      if (key === "origem") return { ...prev, origem: "all" };
      return prev;
    });
  }, []);

  const limparFiltros = useCallback(() => {
    setFiltros({
      lote: "all",
      situacaoProdutiva: "all",
      situacaoReprodutiva: "all",
      origem: "all",
      animalRaca: "all",
      animalSexo: "all",
      animalBusca: "",
    });
  }, []);

  const linhasFiltradas = useMemo(() => {
    const busca = filtros.animalBusca.trim().toLowerCase();
    return linhas.filter((animal) => {
      if (filtros.lote !== "all") {
        if (filtros.lote === "sem") {
          if (animal?.[LOTE_FIELD] != null && animal?.[LOTE_FIELD] !== "") return false;
        } else if (String(animal?.[LOTE_FIELD]) !== String(filtros.lote)) {
          return false;
        }
      }

      if (filtros.situacaoProdutiva !== "all") {
        const sitProd = String(animal?.situacao_produtiva || "");
        const isLact = /lact|lac/i.test(sitProd);
        if (filtros.situacaoProdutiva === "lac" && !isLact) return false;
        if (filtros.situacaoProdutiva === "nao_lactante" && isLact) return false;
        if (
          filtros.situacaoProdutiva !== "lac" &&
          filtros.situacaoProdutiva !== "nao_lactante" &&
          sitProd !== filtros.situacaoProdutiva
        ) {
          return false;
        }
      }

      if (filtros.situacaoReprodutiva !== "all") {
        const sitReprod = String(animal?.situacao_reprodutiva || "");
        if (sitReprod !== filtros.situacaoReprodutiva) return false;
      }

      if (filtros.origem !== "all") {
        const origem = String(animal?.origem || "");
        if (origem !== filtros.origem) return false;
      }

      if (filtros.animalRaca !== "all") {
        if (String(animal?.raca_id) !== String(filtros.animalRaca)) return false;
      }

      if (filtros.animalSexo !== "all") {
        const sexo = String(animal?.sexo || "");
        if (sexo !== filtros.animalSexo) return false;
      }

      if (busca) {
        const numero = String(animal?.numero || "").toLowerCase();
        const brinco = String(animal?.brinco || "").toLowerCase();
        const nome = String(animal?.nome || "").toLowerCase();
        if (!numero.includes(busca) && !brinco.includes(busca) && !nome.includes(busca)) {
          return false;
        }
      }

      return true;
    });
  }, [filtros, linhas, LOTE_FIELD]);

  const linhasOrdenadas = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return linhasFiltradas;
    const sorted = [...linhasFiltradas];
    const factor = sortConfig.direction === "asc" ? 1 : -1;

    const compareNumber = (a, b) => {
      if (!Number.isFinite(a) && !Number.isFinite(b)) return 0;
      if (!Number.isFinite(a)) return 1;
      if (!Number.isFinite(b)) return -1;
      return a - b;
    };

    sorted.sort((a, b) => {
      if (sortConfig.key === "producao") {
        const aSit = String(a?.situacao_produtiva || "");
        const bSit = String(b?.situacao_produtiva || "");
        const aIsLact = /lact|lac/i.test(aSit);
        const bIsLact = /lact|lac/i.test(bSit);
        const aVal = aIsLact ? Number(ultProducao[a.id]) : null;
        const bVal = bIsLact ? Number(ultProducao[b.id]) : null;
        return compareNumber(aVal, bVal) * factor;
      }
      if (sortConfig.key === "del") {
        const aVal = delNumeroFromParto(a?.ultimo_parto);
        const bVal = delNumeroFromParto(b?.ultimo_parto);
        return compareNumber(aVal, bVal) * factor;
      }
      if (sortConfig.key === "animal") {
        const aNum = Number(a?.numero);
        const bNum = Number(b?.numero);
        if (Number.isFinite(aNum) && Number.isFinite(bNum)) {
          return (aNum - bNum) * factor;
        }
        const aStr = String(a?.numero || "");
        const bStr = String(b?.numero || "");
        return aStr.localeCompare(bStr) * factor;
      }
      return 0;
    });
    return sorted;
  }, [linhasFiltradas, sortConfig, ultProducao]);

  const resumo = useMemo(() => {
    const total = linhasOrdenadas.length;
    const somas = linhasOrdenadas.reduce(
      (acc, animal) => {
        const sitProd = String(animal?.situacao_produtiva || "");
        const isLact = /lact|lac/i.test(sitProd);
        if (!isLact) return acc;
        const valor = Number(ultProducao[animal?.id]);
        if (!Number.isFinite(valor)) return acc;
        return {
          soma: acc.soma + valor,
          qtd: acc.qtd + 1,
        };
      },
      { soma: 0, qtd: 0 }
    );
    const media = somas.qtd > 0 ? somas.soma / somas.qtd : null;
    return { total, media };
  }, [linhasOrdenadas, ultProducao]);

  return (
    <section className="w-full">
      {erro && <div className="st-alert st-alert--danger">{erro}</div>}
      {loteAviso && <div className="st-alert st-alert--warning">{loteAviso}</div>}

      {filtrosAtivos.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          {filtrosAtivos.map((chip) => (
            <span key={chip.key} className="st-chip st-chip--muted">
              {chip.label}
              <button
                type="button"
                onClick={() => limparFiltro(chip.key)}
                aria-label={`Remover filtro ${chip.label}`}
                style={{
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            className="st-btn"
            onClick={limparFiltros}
            style={{ height: 26, padding: "0 10px", fontSize: 12 }}
          >
            Limpar tudo
          </button>
        </div>
      )}

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
              <col style={{ width: "20%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "14%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "6%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "10%" }} />
            </colgroup>
            <thead>
              <tr>
                <th
                  className="col-animal st-col-animal"
                  onMouseEnter={() => handleColEnter("animal")}
                  style={{ position: "relative" }}
                >
                  <button
                    type="button"
                    data-filter-trigger="true"
                    onClick={() => {
                      toggleSort("animal");
                      handleTogglePopover("animal");
                    }}
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
                    Animal
                    {sortConfig.key === "animal" && sortConfig.direction && (
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        {sortConfig.direction === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                  {openPopoverKey === "animal" && (
                    <div
                      ref={popoverRef}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        zIndex: 50,
                        background: "#fff",
                        border: "1px solid rgba(15, 23, 42, 0.12)",
                        borderRadius: 12,
                        padding: 12,
                        minWidth: 240,
                        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div style={{ display: "grid", gap: 10 }}>
                        <label style={{ fontSize: 12, fontWeight: 800 }}>
                          Raça
                          <select
                            value={filtros.animalRaca}
                            onChange={(event) =>
                              setFiltros((prev) => ({
                                ...prev,
                                animalRaca: event.target.value,
                              }))
                            }
                            style={{
                              width: "100%",
                              marginTop: 6,
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid rgba(15,23,42,0.2)",
                              fontWeight: 700,
                            }}
                          >
                            <option value="all">Todas</option>
                            {racasDisponiveis.map((raca) => (
                              <option key={raca.id} value={raca.id}>
                                {raca.nome}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label style={{ fontSize: 12, fontWeight: 800 }}>
                          Sexo
                          <select
                            value={filtros.animalSexo}
                            onChange={(event) =>
                              setFiltros((prev) => ({
                                ...prev,
                                animalSexo: event.target.value,
                              }))
                            }
                            style={{
                              width: "100%",
                              marginTop: 6,
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid rgba(15,23,42,0.2)",
                              fontWeight: 700,
                            }}
                          >
                            <option value="all">Todos</option>
                            {sexosDisponiveis.map((sexo) => (
                              <option key={sexo} value={sexo}>
                                {sexo === "macho"
                                  ? "Macho"
                                  : sexo === "femea"
                                    ? "Fêmea"
                                    : sexo}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label style={{ fontSize: 12, fontWeight: 800 }}>
                          Buscar (nº, brinco, nome)
                          <input
                            type="text"
                            value={filtros.animalBusca}
                            onChange={(event) =>
                              setFiltros((prev) => ({
                                ...prev,
                                animalBusca: event.target.value,
                              }))
                            }
                            placeholder="Digite para filtrar"
                            style={{
                              width: "100%",
                              marginTop: 6,
                              padding: "6px 10px",
                              borderRadius: 10,
                              border: "1px solid rgba(15,23,42,0.2)",
                              fontWeight: 700,
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </th>
                <th
                  className="col-lote"
                  onMouseEnter={() => handleColEnter("lote")}
                  style={{ position: "relative" }}
                >
                  <button
                    type="button"
                    data-filter-trigger="true"
                    onClick={() => handleTogglePopover("lote")}
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
                    Lote
                  </button>
                  {openPopoverKey === "lote" && (
                    <div
                      ref={popoverRef}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        zIndex: 50,
                        background: "#fff",
                        border: "1px solid rgba(15, 23, 42, 0.12)",
                        borderRadius: 12,
                        padding: 12,
                        minWidth: 200,
                        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <label style={{ fontSize: 12, fontWeight: 800 }}>
                        Lote
                        <select
                          value={filtros.lote}
                          onChange={(event) =>
                            setFiltros((prev) => ({
                              ...prev,
                              lote: event.target.value,
                            }))
                          }
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(15,23,42,0.2)",
                            fontWeight: 700,
                          }}
                        >
                          <option value="all">Todos</option>
                          <option value="sem">Sem lote</option>
                          {(lotes || []).map((lote) => {
                            const label =
                              lote.nome ??
                              lote.descricao ??
                              lote.titulo ??
                              lote.label ??
                              String(lote.id ?? "—");
                            return (
                              <option key={lote.id ?? label} value={lote.id}>
                                {label}
                              </option>
                            );
                          })}
                        </select>
                      </label>
                    </div>
                  )}
                </th>
                <th
                  className="st-td-center col-sitprod"
                  onMouseEnter={() => handleColEnter("sitprod")}
                  style={{ position: "relative" }}
                >
                  <button
                    type="button"
                    data-filter-trigger="true"
                    onClick={() => handleTogglePopover("sitprod")}
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
                    Situação produtiva
                  </button>
                  {openPopoverKey === "sitprod" && (
                    <div
                      ref={popoverRef}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        zIndex: 50,
                        background: "#fff",
                        border: "1px solid rgba(15, 23, 42, 0.12)",
                        borderRadius: 12,
                        padding: 12,
                        minWidth: 220,
                        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <label style={{ fontSize: 12, fontWeight: 800 }}>
                        Situação produtiva
                        <select
                          value={filtros.situacaoProdutiva}
                          onChange={(event) =>
                            setFiltros((prev) => ({
                              ...prev,
                              situacaoProdutiva: event.target.value,
                            }))
                          }
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(15,23,42,0.2)",
                            fontWeight: 700,
                          }}
                        >
                          <option value="all">Todos</option>
                          <option value="lac">LAC</option>
                          <option value="nao_lactante">Não lactante</option>
                          {situacoesProdutivas
                            .filter((valor) => !/lact|lac/i.test(valor))
                            .map((valor) => (
                              <option key={valor} value={valor}>
                                {valor}
                              </option>
                            ))}
                        </select>
                      </label>
                    </div>
                  )}
                </th>
                <th
                  className="st-td-center col-sitreprod"
                  onMouseEnter={() => handleColEnter("sitreprod")}
                  style={{ position: "relative" }}
                >
                  <button
                    type="button"
                    data-filter-trigger="true"
                    onClick={() => handleTogglePopover("sitreprod")}
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
                    Situação reprodutiva
                  </button>
                  {openPopoverKey === "sitreprod" && (
                    <div
                      ref={popoverRef}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        zIndex: 50,
                        background: "#fff",
                        border: "1px solid rgba(15, 23, 42, 0.12)",
                        borderRadius: 12,
                        padding: 12,
                        minWidth: 220,
                        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <label style={{ fontSize: 12, fontWeight: 800 }}>
                        Situação reprodutiva
                        <select
                          value={filtros.situacaoReprodutiva}
                          onChange={(event) =>
                            setFiltros((prev) => ({
                              ...prev,
                              situacaoReprodutiva: event.target.value,
                            }))
                          }
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(15,23,42,0.2)",
                            fontWeight: 700,
                          }}
                        >
                          <option value="all">Todos</option>
                          {situacoesReprodutivas.map((valor) => (
                            <option key={valor} value={valor}>
                              {valor}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                </th>
                <th
                  className="st-td-right col-producao"
                  onMouseEnter={() => handleColEnter("producao")}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort("producao")}
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
                    Última produção
                    {sortConfig.key === "producao" && sortConfig.direction && (
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        {sortConfig.direction === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
                <th
                  className="st-td-right col-del"
                  onMouseEnter={() => handleColEnter("del")}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort("del")}
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
                    DEL
                    {sortConfig.key === "del" && sortConfig.direction && (
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        {sortConfig.direction === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                </th>
                <th
                  className="col-origem"
                  onMouseEnter={() => handleColEnter("origem")}
                  style={{ position: "relative" }}
                >
                  <button
                    type="button"
                    data-filter-trigger="true"
                    onClick={() => handleTogglePopover("origem")}
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
                    Origem
                  </button>
                  {openPopoverKey === "origem" && (
                    <div
                      ref={popoverRef}
                      style={{
                        position: "absolute",
                        top: "calc(100% + 8px)",
                        left: 0,
                        zIndex: 50,
                        background: "#fff",
                        border: "1px solid rgba(15, 23, 42, 0.12)",
                        borderRadius: 12,
                        padding: 12,
                        minWidth: 200,
                        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <label style={{ fontSize: 12, fontWeight: 800 }}>
                        Origem
                        <select
                          value={filtros.origem}
                          onChange={(event) =>
                            setFiltros((prev) => ({
                              ...prev,
                              origem: event.target.value,
                            }))
                          }
                          style={{
                            width: "100%",
                            marginTop: 6,
                            padding: "6px 10px",
                            borderRadius: 10,
                            border: "1px solid rgba(15,23,42,0.2)",
                            fontWeight: 700,
                          }}
                        >
                          <option value="all">Todos</option>
                          {origensDisponiveis.map((valor) => (
                            <option key={valor} value={valor}>
                              {valor}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  )}
                </th>
                <th
                  className="st-td-center col-acoes"
                  onMouseEnter={() => handleColEnter("acoes")}
                >
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {linhasOrdenadas.length === 0 && !carregando && (
                <tr>
                  <td colSpan={8} style={{ padding: 18, color: "#64748b", fontWeight: 700 }}>
                    Nenhum animal cadastrado ainda.
                  </td>
                </tr>
              )}

              {linhasOrdenadas.map((a, idx) => {
                const idade = a.idade || idadeTexto(a.nascimento);
                const racaNome = racaMap[a.raca_id] || "—";
                const sexoLabel =
                  a.sexo === "macho" ? "Macho" : a.sexo === "femea" ? "Fêmea" : a.sexo || "—";

                const sitProd = a.situacao_produtiva || "—";
                const sitReprod = a.situacao_reprodutiva || "—";
                const del = delFromParto(a.ultimo_parto);
                const isLact = /lact|lac/i.test(String(sitProd || ""));
                const litros = isLact ? ultProducao[a.id] : null;
                const producaoTexto =
                  isLact && Number.isFinite(litros) ? formatProducao(litros) : "—";
                const loteSelecionado = resolveSelectedLote(a);
                const isSemLote = !loteSelecionado || loteSelecionado.value == null;
                const loteLabel = resolveLoteLabel(a);

                const prodClass =
                  String(sitProd).toLowerCase().includes("lact") ? "st-pill st-pill--ok" :
                  String(sitProd).toLowerCase().includes("seca") ? "st-pill st-pill--mute" :
                  "st-pill st-pill--info";

                const reprClass =
                  String(sitReprod).toLowerCase().includes("pev") ? "st-pill st-pill--info" :
                  String(sitReprod).toLowerCase().includes("vaz") ? "st-pill st-pill--mute" :
                  "st-pill st-pill--info";

                const rowId = a.id ?? a.numero ?? a.brinco ?? idx;
                const rowHover = hoveredRowId === rowId;

                return (
                  <tr key={rowId} className={rowHover ? "st-row-hover" : ""}>
                    {/* ANIMAL (duas linhas, mas com respiro) */}
                    <td
                      className={`col-animal st-col-animal ${
                        hoveredColKey === "animal" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "animal" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => handleCellEnter(rowId, "animal")}
                    >
                      <div className="st-animal">
                        <span
                          className="st-animal-num"
                          title={`Nº do animal: ${a.numero ?? "—"}`}
                        >
                          {a.numero ?? "—"}
                        </span>

                        <div className="st-animal-main">
                          <div className="st-animal-title">
                            {racaNome} <span className="st-dot">•</span> {sexoLabel}
                          </div>
                          <div className="st-animal-sub">
                            <span>{idade}</span>
                            <span className="st-dot">•</span>
                            <span>Brinco {a.brinco || "—"}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* LOTE */}
                    <td
                      className={`col-lote ${
                        hoveredColKey === "lote" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "lote" ? "st-cell-hover" : ""
                      }`}
                      style={{ overflow: "visible", paddingLeft: 12, paddingRight: 12 }}
                      onMouseEnter={() => handleCellEnter(rowId, "lote")}
                    >
                      {editingLoteId === a.id ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            width: "100%",
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") closeLoteEdit();
                          }}
                        >
                          <Select
                            autoFocus
                            menuIsOpen
                            menuPortalTarget={
                              typeof document !== "undefined" ? document.body : null
                            }
                            menuPosition="fixed"
                            menuShouldBlockScroll
                            styles={selectStylesCompact}
                            options={loteOptions}
                            value={resolveSelectedLote(a)}
                            placeholder="Selecionar lote…"
                            onChange={(option) => handleSetLote(a, option)}
                            onBlur={handleLoteBlur}
                            isClearable
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingLoteId(a.id)}
                          title="Clique para alterar o lote"
                          className={`st-pill ${
                            isSemLote ? "st-pill--mute" : "st-pill--info"
                          }`}
                          style={{
                            width: "100%",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            height: 30,
                            padding: "0 12px",
                            cursor: "pointer",
                            overflow: "hidden",
                            whiteSpace: "nowrap",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {loteLabel}
                        </button>
                      )}
                    </td>

                    {/* PROD */}
                    <td
                      className={`st-td-center col-sitprod ${
                        hoveredColKey === "sitprod" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "sitprod" ? "st-cell-hover" : ""
                      }`}
                      style={{ paddingLeft: 12, paddingRight: 12 }}
                      onMouseEnter={() => handleCellEnter(rowId, "sitprod")}
                    >
                      {sitProd === "—" ? "—" : (
                        <span className={prodClass}>
                          {sitProd === "lactante" ? "LAC" : sitProd}
                        </span>
                      )}
                    </td>

                    {/* REPROD */}
                    <td
                      className={`st-td-center col-sitreprod ${
                        hoveredColKey === "sitreprod" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "sitreprod" ? "st-cell-hover" : ""
                      }`}
                      style={{ paddingLeft: 12, paddingRight: 12 }}
                      onMouseEnter={() => handleCellEnter(rowId, "sitreprod")}
                    >
                      {sitReprod === "—" ? "—" : (
                        <span className={reprClass}>
                          {String(sitReprod).toUpperCase().slice(0, 3)}
                        </span>
                      )}
                    </td>

                    {/* PRODUÇÃO */}
                    <td
                      className={`st-td-right st-num col-producao ${
                        hoveredColKey === "producao" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "producao" ? "st-cell-hover" : ""
                      }`}
                      style={{ textOverflow: "clip" }}
                      onMouseEnter={() => handleCellEnter(rowId, "producao")}
                    >
                      {producaoTexto}
                    </td>

                    {/* DEL */}
                    <td
                      className={`st-td-right col-del ${
                        hoveredColKey === "del" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "del" ? "st-cell-hover" : ""
                      }`}
                      style={{ fontWeight: 900 }}
                      onMouseEnter={() => handleCellEnter(rowId, "del")}
                    >
                      {del}
                    </td>

                    {/* ORIGEM */}
                    <td
                      className={`col-origem st-td-wrap ${
                        hoveredColKey === "origem" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "origem" ? "st-cell-hover" : ""
                      }`}
                      style={{ fontWeight: 700 }}
                      onMouseEnter={() => handleCellEnter(rowId, "origem")}
                    >
                      {a.origem || "—"}
                    </td>

                    {/* AÇÕES */}
                    <td
                      className={`st-td-center col-acoes ${
                        hoveredColKey === "acoes" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "acoes" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => handleCellEnter(rowId, "acoes")}
                    >
                      <button onClick={() => abrirFichaAnimal(a)} className="st-btn">
                        Ficha
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={8} style={{ padding: "12px 18px", fontWeight: 800 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <span>Total de animais exibidos: {resumo.total}</span>
                    <span>
                      Média Última produção (LAC):{" "}
                      {Number.isFinite(resumo.media) ? formatProducao(resumo.media) : "—"}
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {carregando && (
        <div className="st-loading">Carregando...</div>
      )}

      {animalSelecionado && (
        <FichaAnimal animal={animalSelecionado} onClose={fecharFichaAnimal} />
      )}
    </section>
  );
}
