import React, { useState, useEffect, useCallback } from "react";
import {
  ListChecks,
  PlusCircle,
  ArrowRightCircle,
  Ban,
  FileText,
  UploadCloud,
  DownloadCloud,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import { withFazendaId } from "../../lib/fazendaScope";
import { useFazenda } from "../../context/FazendaContext";
import { kvGet, kvSet } from "../../offline/localDB";

// Páginas internas
import SubAbasAnimais from "./SubAbasAnimais";
import SaidaAnimal from "./SaidaAnimal";
import Inativas from "./Inativas";
import CadastroAnimal from "./CadastroAnimal";
import FichaAnimal from "./FichaAnimal/FichaAnimal";
import Relatorios from "../../pages/Animais/Relatorios/Relatorios";

let MEMO_ANIMAIS = {
  data: null,
  lastAt: 0,
};

// =========================
//   CONSTANTES DE LAYOUT
// =========================
const LARGURA_BARRA = 80;
const ALTURA_CABECALHO = 150; // (mantido) — mas a lateral agora não depende disso visualmente
const TAMANHO_ICONE_LATERAL = 22; // um pouco menor para ficar “enterprise”
const PADDING_TOPO_CONTEUDO = 24;

const botoesBarra = [
  { id: "todos", label: "Todos os Animais", icon: ListChecks },
  { id: "entrada", label: "Entrada de Animais", icon: PlusCircle },
  { id: "saida", label: "Saída de Animais", icon: ArrowRightCircle },
  { id: "inativas", label: "Inativas", icon: Ban },
  { id: "relatorio", label: "Relatórios", icon: FileText },
  { id: "importar", label: "Importar Dados", icon: UploadCloud },
  { id: "exportar", label: "Exportar Dados", icon: DownloadCloud },
];

// =========================
//   BARRA LATERAL FIXA (PRO)
// =========================
function BarraLateral({ abaAtiva, setAbaAtiva }) {
  // Paleta alinhada ao TopBar novo
  const NAVY = "#0B1F3A";
  const NAVY_2 = "#0A1A33";
  const ACCENT = "#19B6A4";
  const TXT = "rgba(255,255,255,0.86)";
  const MUTED = "rgba(255,255,255,0.62)";

  return (
    <aside
      style={{
        position: "fixed",
        left: 0,
        top: 72, // 👈 altura real do TopBar (ajuste fino se precisar)
        bottom: 0,
        width: `${LARGURA_BARRA}px`,
        background: `linear-gradient(180deg, ${NAVY} 0%, ${NAVY_2} 100%)`,
        borderRight: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 20, // 👈 espaço interno uniforme
        paddingBottom: 20,
        gap: 14, // 👈 mais respiro entre botões
        zIndex: 20,
      }}
    >
      {botoesBarra.map((btn) => {
        const ativo = abaAtiva === btn.id;
        const Icon = btn.icon;

        return (
          <button
            key={btn.id}
            onClick={() => setAbaAtiva(btn.id)}
            title={btn.label}
            style={{
              width: 56,
              height: 46,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.10)",
              background: ativo ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
              color: ativo ? TXT : MUTED,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              position: "relative",
              transition: "background 0.12s ease, transform 0.12s ease, border-color 0.12s ease",
              boxShadow: ativo ? "0 10px 18px rgba(0,0,0,0.22)" : "none",
              outline: "none",
            }}
            onMouseEnter={(e) => {
              if (!ativo) {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
              }
            }}
            onMouseLeave={(e) => {
              if (!ativo) {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.transform = "translateY(0px)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
              }
            }}
          >
            {/* Indicador ativo (barra teal à esquerda) */}
            {ativo && (
              <span
                style={{
                  position: "absolute",
                  left: 6,
                  top: 10,
                  bottom: 10,
                  width: 4,
                  borderRadius: 999,
                  background: ACCENT,
                  boxShadow: "0 0 0 4px rgba(25,182,164,0.12)",
                }}
              />
            )}

            <Icon
              size={TAMANHO_ICONE_LATERAL}
              strokeWidth={2.2}
              color={ativo ? ACCENT : "rgba(255,255,255,0.72)"}
            />
          </button>
        );
      })}
    </aside>
  );
}

// =========================
//   COMPONENTE PRINCIPAL
// =========================
export default function Animais() {
  const { fazendaAtualId } = useFazenda();
  const memoData = MEMO_ANIMAIS.data || {};
  const [abaAtiva, setAbaAtiva] = useState(() => {
    try {
      const stored = localStorage.getItem("animais:abaAtiva");
      const valido = botoesBarra.some((btn) => btn.id === stored);
      return valido ? stored : "todos";
    } catch {
      return "todos";
    }
  });
  const [isOnline, setIsOnline] = useState(() =>
    typeof memoData.isOnline === "boolean" ? memoData.isOnline : navigator.onLine
  );

  const [animaisAtivos, setAnimaisAtivos] = useState(() => memoData.animaisAtivos ?? []);
  const [animaisInativos, setAnimaisInativos] = useState(() => memoData.animaisInativos ?? []);
  const [carregando, setCarregando] = useState(() => memoData.carregando ?? false);
  const [offlineAviso, setOfflineAviso] = useState(() => memoData.offlineAviso ?? "");

  const [fichaOpen, setFichaOpen] = useState(false);
  const [animalFicha, setAnimalFicha] = useState(null);

  useEffect(() => {
    MEMO_ANIMAIS.data = {
      animaisAtivos,
      animaisInativos,
      carregando,
      offlineAviso,
      isOnline,
      abaAtiva,
    };
  }, [animaisAtivos, animaisInativos, carregando, offlineAviso, isOnline, abaAtiva]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("animais:abaAtiva", abaAtiva);
    } catch {}
  }, [abaAtiva]);

  // =========================
  //   CARREGAR ANIMAL COMPLETO
  // =========================
  const carregarAnimalCompleto = useCallback(async (id) => {
    if (!id) return null;
    if (!isOnline) return null;
    if (!fazendaAtualId) return null;

    const { data, error } = await withFazendaId(
      supabase
        .from("animais")
        .select(
          `
        id,
        numero,
        brinco,
        nascimento,
        sexo,
        origem,
        raca_id,
        pai_nome,
        mae_nome,
        categoria
      `
        )
        .eq("id", id),
      fazendaAtualId
    ).maybeSingle();

    if (error || !data) {
      console.error("Erro ao carregar animal completo:", error || "sem dados");
      return null;
    }

    let racaNome = null;
    if (data.raca_id) {
      const { data: racaRow, error: errorRaca } = await withFazendaId(
        supabase.from("racas").select("nome").eq("id", data.raca_id),
        fazendaAtualId
      ).maybeSingle();

      if (!errorRaca && racaRow) {
        racaNome = racaRow.nome;
      }
    }

    let repro = null;
    try {
      const { data: reproData, error: reproError } = await supabase
        .from("v_repro_tabela")
        .select("*")
        .eq("animal_id", id)
        .maybeSingle();
      if (reproError) {
        console.warn("Erro ao carregar dados reprodutivos:", reproError);
      } else {
        repro = reproData || null;
      }
    } catch (err) {
      console.warn("Erro ao carregar dados reprodutivos:", err);
    }

    const { id: reproId, animal_id, ...reproRest } = repro || {};
    const animalCompleto = {
      ...data,
      ...reproRest,
      raca_nome: racaNome,
    };

    return animalCompleto;
  }, [fazendaAtualId, isOnline]);

  // =========================
  //   CARREGAR ATIVOS + INATIVOS
  // =========================
  const carregarAnimais = useCallback(async (force = false) => {
    const CACHE_LIST_KEY = "cache:animais:list";
    const CACHE_PLANTEL_KEY = "cache:animais:plantel:v1";
    const memo = MEMO_ANIMAIS.data;
    const memoFresh = memo && Date.now() - MEMO_ANIMAIS.lastAt < 30000;

    if (
      !force &&
      memoFresh &&
      Array.isArray(memo?.animaisAtivos) &&
      Array.isArray(memo?.animaisInativos) &&
      (memo.animaisAtivos.length > 0 || memo.animaisInativos.length > 0)
    ) {
      return;
    }

    setCarregando(true);
    setOfflineAviso("");

    if (!isOnline) {
      console.log("[animais] offline -> lendo cache:animais:list");
      const cachePrimario = await kvGet(CACHE_LIST_KEY);
      const cacheSecundario = cachePrimario ? null : await kvGet(CACHE_PLANTEL_KEY);
      const cache = cachePrimario ?? cacheSecundario;
      const lista = Array.isArray(cache) ? cache : Array.isArray(cache?.animais) ? cache.animais : [];
      console.log(`[animais] cache length: ${lista.length}`);

      if (lista.length === 0) {
        const aviso =
          "Sem dados offline ainda. Conecte na internet uma vez para baixar os animais.";
        setOfflineAviso(aviso);
        setCarregando(false);
        return;
      }

      const ativos = lista.filter((animal) => animal?.ativo !== false);
      const inativos = lista
        .filter((animal) => animal?.ativo === false)
        .map((animal) => ({
          ...animal,
          status: animal?.status ?? "inativo",
        }));

      const aviso = "";
      setAnimaisAtivos(ativos);
      setAnimaisInativos(inativos);
      setOfflineAviso(aviso);
      MEMO_ANIMAIS.lastAt = Date.now();
      MEMO_ANIMAIS.data = {
        ...(MEMO_ANIMAIS.data || {}),
        animaisAtivos: ativos,
        animaisInativos: inativos,
        offlineAviso: aviso,
        isOnline,
      };
      setCarregando(false);
      return;
    }

    console.log("[animais] online -> buscando supabase");
    try {
      if (!fazendaAtualId) {
        return;
      }

      const { data: ativos, error: erroAtivos } = await withFazendaId(
        supabase.from("animais").select("id, numero, brinco").eq("ativo", true),
        fazendaAtualId
      ).order("numero", { ascending: true });

      setAnimaisAtivos(!erroAtivos && ativos ? ativos : []);

      const { data: inativosRaw, error: erroInativos } = await withFazendaId(
        supabase.from("animais").select("id, numero, brinco").eq("ativo", false),
        fazendaAtualId
      ).order("numero", { ascending: true });

      if (erroInativos || !inativosRaw) {
        return;
      }

      if (!erroAtivos && ativos) {
        const cacheAtivos = ativos.map((animal) => ({ ...animal, ativo: true }));
        const cacheInativos = inativosRaw.map((animal) => ({
          ...animal,
          ativo: false,
        }));
        await kvSet(CACHE_LIST_KEY, [...cacheAtivos, ...cacheInativos]);
      }

      const idsInativos = inativosRaw.map((a) => a.id).filter(Boolean);

      const { data: saidas, error: erroSaidas } = idsInativos.length
          ? await withFazendaId(
            supabase
              .from("saidas_animais")
              .select("id, animal_id, tipo_saida, motivo, data_saida, valor, observacoes")
              .in("animal_id", idsInativos),
            fazendaAtualId
          ).order("data_saida", { ascending: true })
        : { data: [], error: null };

      if (erroSaidas) {
        return;
      }

      const ultimaPorAnimal = {};
      (saidas || []).forEach((s) => {
        const lista = ultimaPorAnimal[s.animal_id] || [];
        lista.push(s);
        ultimaPorAnimal[s.animal_id] = lista;
      });

      const formatado = inativosRaw.map((a) => {
        const historico = ultimaPorAnimal[a.id] || [];
        const ultima = historico[historico.length - 1];

        let dataFormatada = "";
        if (ultima?.data_saida) {
          const dataObj = new Date(ultima.data_saida);
          if (!Number.isNaN(dataObj.getTime())) {
            dataFormatada = dataObj.toLocaleDateString("pt-BR");
          }
        }

        return {
          id: a.id,
          numero: a.numero,
          brinco: a.brinco,
          saida_id: ultima?.id ?? null,
          tipo_saida: ultima?.tipo_saida || "",
          motivo: ultima?.motivo || "",
          data_saida: dataFormatada,
          observacao_saida: ultima?.observacoes || "",
          valor_saida: ultima?.valor ?? null,
        };
      });

      setAnimaisInativos(formatado);
      MEMO_ANIMAIS.lastAt = Date.now();
      MEMO_ANIMAIS.data = {
        ...(MEMO_ANIMAIS.data || {}),
        animaisAtivos: !erroAtivos && ativos ? ativos : [],
        animaisInativos: formatado,
        offlineAviso: "",
        isOnline,
      };
    } finally {
      setCarregando(false);
    }
  }, [fazendaAtualId, isOnline]);

  useEffect(() => {
    if (!fazendaAtualId) {
      return;
    }
    carregarAnimais();
  }, [carregarAnimais, fazendaAtualId]);

  useEffect(() => {
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowOriginal || "";
    };
  }, []);

  const handleAtualizar = () => {
    carregarAnimais(true);
  };

  const handleVerFicha = async (animalBasico) => {
    const completo = await carregarAnimalCompleto(animalBasico?.id);
    setAnimalFicha(completo || animalBasico || null);
    setFichaOpen(true);
  };

  const cardMaxHeight = "calc(100vh - 2 * 24px)";
  const hasAnimais = animaisAtivos.length > 0 || animaisInativos.length > 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      <BarraLateral abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />

      <div
        style={{
          marginLeft: `${LARGURA_BARRA}px`,
          paddingTop: PADDING_TOPO_CONTEUDO,
          paddingRight: 24,
          paddingLeft: 24,
          paddingBottom: 24,
        }}
      >
        <div
          style={{
            backgroundColor: "#f8fafc",
            borderRadius: 18,
            boxShadow: "0 12px 30px rgba(15,23,42,0.18)",
            padding: "16px 18px 18px",
            maxHeight: cardMaxHeight,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ flex: 1, overflowY: "auto" }}>
            {carregando && hasAnimais && (
              <div className="px-4 pb-2 text-xs font-medium text-gray-500">Atualizando animais...</div>
            )}
            {offlineAviso && hasAnimais && (
              <div className="px-4 pb-2 text-xs font-medium text-amber-600">{offlineAviso}</div>
            )}
            {!hasAnimais && carregando && (
              <div className="p-4 text-sm text-gray-500">Carregando animais...</div>
            )}
            {!hasAnimais && offlineAviso && (
              <div className="p-4 text-sm text-gray-500">{offlineAviso}</div>
            )}

            <div style={{ display: abaAtiva === "todos" ? "block" : "none" }} aria-hidden={abaAtiva !== "todos"}>
              <SubAbasAnimais
                animais={animaisAtivos}
                onRefresh={handleAtualizar}
                isOnline={isOnline}
                // onVerFicha={handleVerFicha}
              />
            </div>

            <div style={{ display: abaAtiva === "entrada" ? "block" : "none" }} aria-hidden={abaAtiva !== "entrada"}>
              <CadastroAnimal animais={animaisAtivos} onAtualizar={handleAtualizar} />
            </div>

            <div style={{ display: abaAtiva === "saida" ? "block" : "none" }} aria-hidden={abaAtiva !== "saida"}>
              <SaidaAnimal animais={animaisAtivos} onAtualizar={handleAtualizar} />
            </div>

            <div style={{ display: abaAtiva === "inativas" ? "block" : "none" }} aria-hidden={abaAtiva !== "inativas"}>
              <Inativas
                animais={animaisInativos}
                onAtualizar={handleAtualizar}
                onVerFicha={handleVerFicha}
              />
            </div>

            <div style={{ display: abaAtiva === "relatorio" ? "block" : "none" }} aria-hidden={abaAtiva !== "relatorio"}>
              <Relatorios />
            </div>

            <div style={{ display: abaAtiva === "importar" ? "block" : "none" }} aria-hidden={abaAtiva !== "importar"}>
              <div className="p-4">Importar Dados — em construção.</div>
            </div>

            <div style={{ display: abaAtiva === "exportar" ? "block" : "none" }} aria-hidden={abaAtiva !== "exportar"}>
              <div className="p-4">Exportar Dados — em construção.</div>
            </div>

          </div>
        </div>
      </div>

      {fichaOpen && animalFicha && (
        <FichaAnimal
          animal={animalFicha}
          onClose={() => {
            setFichaOpen(false);
            setAnimalFicha(null);
          }}
        />
      )}
    </div>
  );
}
