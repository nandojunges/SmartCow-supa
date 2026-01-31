// src/pages/Animais/Plantel.jsx
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Select from "react-select";
import { supabase } from "../../lib/supabaseClient";
import { withFazendaId } from "../../lib/fazendaScope";
import { useFazenda } from "../../context/FazendaContext";
import { kvGet, kvSet } from "../../offline/localDB";
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

export default function Plantel({ isOnline = navigator.onLine }) {
  const CACHE_KEY = "cache:animais:list";
  const CACHE_FALLBACK_KEY = "cache:animais:plantel:v1";
  const { fazendaAtualId } = useFazenda();
  const [animais, setAnimais] = useState([]);
  const [racaMap, setRacaMap] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [offlineAviso, setOfflineAviso] = useState("");
  const [lotes, setLotes] = useState([]);
  const [loteAviso, setLoteAviso] = useState("");
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);
  const [ultProducao, setUltProducao] = useState({});
  const [editingLoteId, setEditingLoteId] = useState(null);
  const [openPopoverKey, setOpenPopoverKey] = useState(null);
  const popoverRef = useRef(null);
  const triggerRefs = useRef({});
  const [popoverStyle, setPopoverStyle] = useState({
    left: "50%",
    transform: "translateX(-50%)",
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filtros, setFiltros] = useState({
    lote: "__ALL__",
    situacaoProdutiva: "__ALL__",
    situacaoReprodutiva: "__ALL__",
    origem: "__ALL__",
    animalRaca: "__ALL__",
    animalSexo: "__ALL__",
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

  const carregarAnimais = useCallback(async () => {
    const { data, error } = await withFazendaId(
      supabase.from("animais").select("*"),
      fazendaAtualId
    )
      .eq("ativo", true)
      .order("numero", { ascending: true });

    if (error) throw error;
    const lista = Array.isArray(data) ? data : [];
    setAnimais(lista);
    return lista;
  }, [fazendaAtualId]);

  const carregarLotes = useCallback(async () => {
    const { data, error } = await withFazendaId(
      supabase.from(LOTE_TABLE).select("*"),
      fazendaAtualId
    ).order("id", { ascending: true });

    if (error) {
      console.error("Erro ao carregar lotes:", error);
      return [];
    }

    const lista = Array.isArray(data) ? data : [];
    setLotes(lista);
    return lista;
  }, [LOTE_TABLE, fazendaAtualId]);

  const carregarRacas = useCallback(async () => {
    const { data, error } = await withFazendaId(
      supabase.from("racas").select("id, nome"),
      fazendaAtualId
    );

    if (error) throw error;

    const map = {};
    (data || []).forEach((r) => {
      map[r.id] = r.nome;
    });
    setRacaMap(map);
    return map;
  }, [fazendaAtualId]);

  const carregarDoCache = useCallback(async () => {
    const cachePrimario = await kvGet(CACHE_KEY);
    const cacheFallback = cachePrimario ? null : await kvGet(CACHE_FALLBACK_KEY);
    const cache = cachePrimario ?? cacheFallback;
    if (!cache) return false;
    if (Array.isArray(cache)) {
      setAnimais(cache.filter((animal) => animal?.ativo !== false));
      return true;
    }
    if (Array.isArray(cache.animais)) {
      setAnimais(cache.animais.filter((animal) => animal?.ativo !== false));
      return true;
    }
    return false;
  }, [CACHE_FALLBACK_KEY, CACHE_KEY]);

  useEffect(() => {
    if (!fazendaAtualId) {
      setCarregando(false);
      return undefined;
    }

    let ativo = true;

    async function carregarDados() {
      setCarregando(true);
      setErro("");
      setLoteAviso("");
      setOfflineAviso("");

      try {
        if (!isOnline) {
          const cacheOk = await carregarDoCache();
          if (!cacheOk) {
            setOfflineAviso(
              "Sem dados offline ainda. Conecte na internet uma vez para baixar os animais."
            );
          }
          return;
        }

        if (!ativo) return;

        const [animaisData, lotesData, racasData] = await Promise.all([
          carregarAnimais(),
          carregarLotes(),
          carregarRacas(),
        ]);

        await kvSet(CACHE_KEY, animaisData);
      } catch (e) {
        console.error("Erro ao carregar plantel:", e);
        if (!ativo) return;
        const cacheOk = await carregarDoCache();
        if (!cacheOk) {
          setErro(
            "Não foi possível carregar os animais. Sem dados offline ainda. Conecte na internet uma vez para baixar os animais."
          );
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarDados();
    return () => {
      ativo = false;
    };
  }, [
    carregarAnimais,
    carregarDoCache,
    carregarLotes,
    carregarRacas,
    fazendaAtualId,
    isOnline,
  ]);

  useEffect(() => {
    let ativo = true;

    async function carregarUltimaProducao() {
      if (!isOnline) {
        if (ativo) setUltProducao({});
        return;
      }
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

      try {
        const { data, error } = await withFazendaId(
          supabase.from("medicoes_leite").select("*"),
          fazendaAtualId
        )
          .in("animal_id", ids)
          .order("data_medicao", { ascending: false })
          .limit(800);

        if (error) {
          console.error("Erro ao carregar medicoes_leite:", error);
          if (ativo) setUltProducao({});
          return;
        }

        const registros = Array.isArray(data) ? data : [];
        if (!registros.length) {
          if (ativo) setUltProducao({});
          return;
        }

        const mapa = {};
        registros.forEach((registro) => {
          const animalId = registro?.animal_id;
          if (!animalId || Object.prototype.hasOwnProperty.call(mapa, animalId)) return;
          const valor = extrairValor(registro);
          if (Number.isFinite(valor)) {
            mapa[animalId] = valor;
          }
        });
        if (ativo) setUltProducao(mapa);
      } catch (error) {
        console.error("Erro ao carregar ultima produção de leite:", error);
        if (ativo) setUltProducao({});
      }
    }

    carregarUltimaProducao();

    return () => {
      ativo = false;
    };
  }, [animais, fazendaAtualId, isOnline]);

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

  const allValue = "__ALL__";
  const semLoteValue = "__SEM_LOTE__";

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

  const situacaoProdutivaOptions = useMemo(
    () => [
      { value: allValue, label: "Todos" },
      { value: "lac", label: "LAC" },
      { value: "nao_lactante", label: "Não lactante" },
      ...situacoesProdutivas
        .filter((valor) => !/lact|lac/i.test(valor))
        .map((valor) => ({ value: valor, label: valor })),
    ],
    [allValue, situacoesProdutivas]
  );

  const situacaoReprodutivaOptions = useMemo(
    () => [
      { value: allValue, label: "Todos" },
      ...situacoesReprodutivas.map((valor) => ({
        value: valor,
        label: valor,
      })),
    ],
    [allValue, situacoesReprodutivas]
  );

  const origemOptions = useMemo(
    () => [
      { value: allValue, label: "Todos" },
      ...origensDisponiveis.map((valor) => ({
        value: valor,
        label: valor,
      })),
    ],
    [allValue, origensDisponiveis]
  );

  const racaOptions = useMemo(
    () => [
      { value: allValue, label: "Todas" },
      ...racasDisponiveis.map((raca) => ({
        value: raca.id,
        label: raca.nome,
      })),
    ],
    [allValue, racasDisponiveis]
  );

  const sexoOptions = useMemo(
    () => [
      { value: allValue, label: "Todos" },
      ...sexosDisponiveis.map((sexo) => ({
        value: sexo,
        label:
          sexo === "macho" ? "Macho" : sexo === "femea" ? "Fêmea" : sexo,
      })),
    ],
    [allValue, sexosDisponiveis]
  );

  const loteOptionsFiltro = useMemo(
    () => [
      { value: allValue, label: "Todos" },
      { value: semLoteValue, label: "Sem lote" },
      ...(lotes || []).map((lote) => {
        const label =
          lote.nome ??
          lote.descricao ??
          lote.titulo ??
          lote.label ??
          String(lote.id ?? "—");
        return {
          value: lote.id,
          label,
        };
      }),
    ],
    [allValue, lotes, semLoteValue]
  );

  const resolveOption = useCallback((options, value) => {
    const found = options.find(
      (option) => String(option.value) === String(value)
    );
    return found || options[0] || null;
  }, []);

  const selectStylesCompact = useMemo(
    () => ({
      container: (base) => ({
        ...base,
        width: "100%",
        fontSize: 13,
      }),
      control: (base, state) => ({
        ...base,
        minHeight: 34,
        height: "auto",
        borderRadius: 10,
        fontWeight: 700,
        fontSize: 13,
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
        padding: "0 8px",
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
        fontSize: 13,
      }),
      placeholder: (base) => ({
        ...base,
        fontSize: 13,
      }),
      indicatorsContainer: (base) => ({
        ...base,
        height: 34,
      }),
      option: (base) => ({
        ...base,
        fontSize: 13,
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

  const portalTarget = typeof document !== "undefined" ? document.body : null;

  useEffect(() => {
    if (!openPopoverKey) return;
    setPopoverStyle({ left: "50%", transform: "translateX(-50%)" });

    const updatePosition = () => {
      const triggerEl = triggerRefs.current?.[openPopoverKey];
      const popoverEl = popoverRef.current;
      if (!triggerEl || !popoverEl) return;

      const thRect = triggerEl.getBoundingClientRect();
      const popRect = popoverEl.getBoundingClientRect();
      let left = (thRect.width - popRect.width) / 2;
      const desiredLeft = thRect.left + left;
      const desiredRight = desiredLeft + popRect.width;

      if (desiredRight > window.innerWidth - 8) {
        left = window.innerWidth - 8 - popRect.width - thRect.left;
      }
      if (desiredLeft < 8) {
        left = 8 - thRect.left;
      }

      setPopoverStyle({ left: `${left}px`, transform: "translateX(0)" });
    };

    const raf = requestAnimationFrame(updatePosition);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [openPopoverKey]);

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
    if (filtros.lote !== allValue) {
      const label =
        filtros.lote === semLoteValue
          ? "Sem lote"
          : lotesById[filtros.lote] || "Lote";
      chips.push({ key: "lote", label: `Lote: ${label}` });
    }
    if (filtros.situacaoProdutiva !== allValue) {
      const label =
        filtros.situacaoProdutiva === "lac"
          ? "LAC"
          : filtros.situacaoProdutiva === "nao_lactante"
            ? "Não lactante"
            : filtros.situacaoProdutiva;
      chips.push({ key: "situacaoProdutiva", label: `Produtiva: ${label}` });
    }
    if (filtros.situacaoReprodutiva !== allValue) {
      chips.push({
        key: "situacaoReprodutiva",
        label: `Reprodutiva: ${filtros.situacaoReprodutiva}`,
      });
    }
    if (filtros.origem !== allValue) {
      chips.push({ key: "origem", label: `Origem: ${filtros.origem}` });
    }
    if (filtros.animalRaca !== allValue) {
      const racaLabel =
        racaMap[filtros.animalRaca] || "Raça";
      chips.push({ key: "animalRaca", label: `Raça: ${racaLabel}` });
    }
    if (filtros.animalSexo !== allValue) {
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
  }, [allValue, filtros, lotesById, racaMap, semLoteValue]);

  const limparFiltro = useCallback((key) => {
    setFiltros((prev) => {
      if (key === "animalBusca") return { ...prev, animalBusca: "" };
      if (key === "animalRaca") return { ...prev, animalRaca: allValue };
      if (key === "animalSexo") return { ...prev, animalSexo: allValue };
      if (key === "lote") return { ...prev, lote: allValue };
      if (key === "situacaoProdutiva") return { ...prev, situacaoProdutiva: allValue };
      if (key === "situacaoReprodutiva") return { ...prev, situacaoReprodutiva: allValue };
      if (key === "origem") return { ...prev, origem: allValue };
      return prev;
    });
  }, [allValue]);

  const limparFiltros = useCallback(() => {
    setFiltros({
      lote: allValue,
      situacaoProdutiva: allValue,
      situacaoReprodutiva: allValue,
      origem: allValue,
      animalRaca: allValue,
      animalSexo: allValue,
      animalBusca: "",
    });
  }, [allValue]);

  const linhasFiltradas = useMemo(() => {
    const busca = filtros.animalBusca.trim().toLowerCase();
    return linhas.filter((animal) => {
      if (filtros.lote !== allValue) {
        if (filtros.lote === semLoteValue) {
          if (animal?.[LOTE_FIELD] != null && animal?.[LOTE_FIELD] !== "") return false;
        } else if (String(animal?.[LOTE_FIELD]) !== String(filtros.lote)) {
          return false;
        }
      }

      if (filtros.situacaoProdutiva !== allValue) {
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

      if (filtros.situacaoReprodutiva !== allValue) {
        const sitReprod = String(animal?.situacao_reprodutiva || "");
        if (sitReprod !== filtros.situacaoReprodutiva) return false;
      }

      if (filtros.origem !== allValue) {
        const origem = String(animal?.origem || "");
        if (origem !== filtros.origem) return false;
      }

      if (filtros.animalRaca !== allValue) {
        if (String(animal?.raca_id) !== String(filtros.animalRaca)) return false;
      }

      if (filtros.animalSexo !== allValue) {
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
  }, [allValue, filtros, linhas, LOTE_FIELD, semLoteValue]);

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
    const delSomas = linhasOrdenadas.reduce(
      (acc, animal) => {
        const sitProd = String(animal?.situacao_produtiva || "");
        const isLact = /lact|lac/i.test(sitProd);
        if (!isLact) return acc;
        const delValor = delNumeroFromParto(animal?.ultimo_parto);
        if (!Number.isFinite(delValor)) return acc;
        return {
          soma: acc.soma + delValor,
          qtd: acc.qtd + 1,
        };
      },
      { soma: 0, qtd: 0 }
    );
    const mediaDel = delSomas.qtd > 0 ? delSomas.soma / delSomas.qtd : null;
    return { total, media, mediaDel };
  }, [linhasOrdenadas, ultProducao]);

  const hasAnimais = linhasOrdenadas.length > 0;

  return (
    <section className="w-full">
      {erro && <div className="st-alert st-alert--danger">{erro}</div>}
      {loteAviso && <div className="st-alert st-alert--warning">{loteAviso}</div>}
      {offlineAviso && <div className="st-filter-hint">{offlineAviso}</div>}

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

      <div className="st-filter-hint">
        Dica: clique no título da coluna para filtrar. Clique novamente para fechar.
      </div>
      {carregando && hasAnimais && (
        <div className="text-xs text-slate-500 mb-2">Atualizando animais...</div>
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
            <colgroup><col style={{ width: "19%" }} /><col style={{ width: "14%" }} /><col style={{ width: "14%" }} /><col style={{ width: "14%" }} /><col style={{ width: "12%" }} /><col style={{ width: "6%" }} /><col style={{ width: "11%" }} /><col style={{ width: "10%" }} /></colgroup>
            <thead>
              <tr>
                <th
                  className="col-animal st-col-animal"
                  onMouseEnter={() => handleColEnter("animal")}
                  ref={(el) => {
                    triggerRefs.current.animal = el;
                  }}
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
                    <span className="st-th-label">Animal</span>
                    {sortConfig.key === "animal" && sortConfig.direction && (
                      <span style={{ fontSize: 12, opacity: 0.7 }}>
                        {sortConfig.direction === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </button>
                  {openPopoverKey === "animal" && (
                    <div
                      ref={popoverRef}
                      className="st-filter-popover"
                      style={popoverStyle}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="st-filter">
                        <label className="st-filter__label">
                          Raça
                          <Select
                            className="st-select--compact"
                            classNamePrefix="st-select"
                            menuPortalTarget={portalTarget}
                            menuPosition="fixed"
                            menuShouldBlockScroll
                            styles={selectStylesCompact}
                            options={racaOptions}
                            value={resolveOption(racaOptions, filtros.animalRaca)}
                            onChange={(option) =>
                              setFiltros((prev) => ({
                                ...prev,
                                animalRaca: option?.value ?? allValue,
                              }))
                            }
                          />
                        </label>

                        <label className="st-filter__label">
                          Sexo
                          <Select
                            className="st-select--compact"
                            classNamePrefix="st-select"
                            menuPortalTarget={portalTarget}
                            menuPosition="fixed"
                            menuShouldBlockScroll
                            styles={selectStylesCompact}
                            options={sexoOptions}
                            value={resolveOption(sexoOptions, filtros.animalSexo)}
                            onChange={(option) =>
                              setFiltros((prev) => ({
                                ...prev,
                                animalSexo: option?.value ?? allValue,
                              }))
                            }
                          />
                        </label>

                        <label className="st-filter__label">
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
                            className="st-filter-input"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </th>
                <th
                  className="col-lote"
                  onMouseEnter={() => handleColEnter("lote")}
                  ref={(el) => {
                    triggerRefs.current.lote = el;
                  }}
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
                    <span className="st-th-label">Lote</span>
                  </button>
                  {openPopoverKey === "lote" && (
                    <div
                      ref={popoverRef}
                      className="st-filter-popover"
                      style={popoverStyle}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <label className="st-filter__label">
                        Lote
                        <Select
                          className="st-select--compact"
                          classNamePrefix="st-select"
                          menuPortalTarget={portalTarget}
                          menuPosition="fixed"
                          menuShouldBlockScroll
                          styles={selectStylesCompact}
                          options={loteOptionsFiltro}
                          value={resolveOption(loteOptionsFiltro, filtros.lote)}
                          onChange={(option) =>
                            setFiltros((prev) => ({
                              ...prev,
                              lote: option?.value ?? allValue,
                            }))
                          }
                        />
                      </label>
                    </div>
                  )}
                </th>
                <th
                  className="st-td-center col-sitprod"
                  onMouseEnter={() => handleColEnter("sitprod")}
                  ref={(el) => {
                    triggerRefs.current.sitprod = el;
                  }}
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
                    <span className="st-th-label">Situação produtiva</span>
                  </button>
                  {openPopoverKey === "sitprod" && (
                    <div
                      ref={popoverRef}
                      className="st-filter-popover"
                      style={popoverStyle}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <label className="st-filter__label">
                        Situação produtiva
                        <Select
                          className="st-select--compact"
                          classNamePrefix="st-select"
                          menuPortalTarget={portalTarget}
                          menuPosition="fixed"
                          menuShouldBlockScroll
                          styles={selectStylesCompact}
                          options={situacaoProdutivaOptions}
                          value={resolveOption(
                            situacaoProdutivaOptions,
                            filtros.situacaoProdutiva
                          )}
                          onChange={(option) =>
                            setFiltros((prev) => ({
                              ...prev,
                              situacaoProdutiva: option?.value ?? allValue,
                            }))
                          }
                        />
                      </label>
                    </div>
                  )}
                </th>
                <th
                  className="st-td-center col-sitreprod"
                  onMouseEnter={() => handleColEnter("sitreprod")}
                  ref={(el) => {
                    triggerRefs.current.sitreprod = el;
                  }}
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
                    <span className="st-th-label">Situação reprodutiva</span>
                  </button>
                  {openPopoverKey === "sitreprod" && (
                    <div
                      ref={popoverRef}
                      className="st-filter-popover"
                      style={popoverStyle}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <label className="st-filter__label">
                        Situação reprodutiva
                        <Select
                          className="st-select--compact"
                          classNamePrefix="st-select"
                          menuPortalTarget={portalTarget}
                          menuPosition="fixed"
                          menuShouldBlockScroll
                          styles={selectStylesCompact}
                          options={situacaoReprodutivaOptions}
                          value={resolveOption(
                            situacaoReprodutivaOptions,
                            filtros.situacaoReprodutiva
                          )}
                          onChange={(option) =>
                            setFiltros((prev) => ({
                              ...prev,
                              situacaoReprodutiva: option?.value ?? allValue,
                            }))
                          }
                        />
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
                    <span className="st-th-label">Última produção</span>
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
                    <span className="st-th-label">DEL</span>
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
                  ref={(el) => {
                    triggerRefs.current.origem = el;
                  }}
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
                    <span className="st-th-label">Origem</span>
                  </button>
                  {openPopoverKey === "origem" && (
                    <div
                      ref={popoverRef}
                      className="st-filter-popover"
                      style={popoverStyle}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <label className="st-filter__label">
                        Origem
                        <Select
                          className="st-select--compact"
                          classNamePrefix="st-select"
                          menuPortalTarget={portalTarget}
                          menuPosition="fixed"
                          menuShouldBlockScroll
                          styles={selectStylesCompact}
                          options={origemOptions}
                          value={resolveOption(origemOptions, filtros.origem)}
                          onChange={(option) =>
                            setFiltros((prev) => ({
                              ...prev,
                              origem: option?.value ?? allValue,
                            }))
                          }
                        />
                      </label>
                    </div>
                  )}
                </th>
                <th
                  className="st-td-center col-acoes"
                  onMouseEnter={() => handleColEnter("acoes")}
                >
                  <span className="st-th-label">Ações</span>
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
              <tr className="st-summary-row">
                <td colSpan={8}>
                  <div className="st-summary-row__content">
                    <span>Total de animais exibidos: {resumo.total}</span>
                    <span>
                      Média Última produção (LAC):{" "}
                      {Number.isFinite(resumo.media) ? formatProducao(resumo.media) : "—"}
                    </span>
                    <span>
                      Média DEL (LAC):{" "}
                      {Number.isFinite(resumo.mediaDel)
                        ? Math.round(resumo.mediaDel)
                        : "—"}
                    </span>
                  </div>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {carregando && !hasAnimais && <div className="st-loading">Carregando...</div>}

      {animalSelecionado && (
        <FichaAnimal animal={animalSelecionado} onClose={fecharFichaAnimal} />
      )}
    </section>
  );
}
