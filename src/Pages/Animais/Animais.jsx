// CODEX: Ajustar ESTE arquivo Animais.jsx para integrar corretamente saídas e reativação:
//
// 1. MANTER a lógica atual de carregar animais ativos e inativos separadamente:
//    - Ativos: select em "animais" com campos (id, numero, brinco) e filtro .eq("ativo", true).
//    - Inativos: select em "animais" com campos (id, numero, brinco) e filtro .eq("ativo", false).
//
// 2. PARA os inativos ("inativosRaw"):
//    - Montar um array com todos os ids: const idsInativos = inativosRaw.map(a => a.id).filter(Boolean);
//    - Buscar as saídas em "saidas_animais" usando:
//        supabase
//          .from("saidas_animais")
//          .select("id, animal_id, tipo_saida, motivo_saida, data_saida, valor_venda, observacao")
//          .in("animal_id", idsInativos)
//          .order("data_saida", { ascending: true });
//
// 3. Montar um dicionário "ultimaPorAnimal" onde a chave é animal_id e o valor é um array de saídas,
//    depois pegar SEMPRE a última saída de cada animal (historico[historico.length - 1]).
//
// 4. No map que monta o array final "formatado", incluir obrigatoriamente as seguintes propriedades:
//      {
//        id: a.id,
//        numero: a.numero,
//        brinco: a.brinco,
//        saida_id: ultima?.id ?? null,          // ID real da linha em saidas_animais
//        tipo_saida: ultima?.tipo_saida || "",
//        motivo_saida: ultima?.motivo_saida || "",
//        data_saida: dataFormatada,             // dd/mm/aaaa se houver data
//        observacao_saida: ultima?.observacao || "",
//        valor_saida: ultima?.valor_venda ?? null,
//      }
//
// 5. NÃO alterar o layout nem o switch das abas. Apenas garantir que "animaisInativos" receba esse
//    objeto formatado (com saida_id e observacao_saida) e seja passado para <Inativas animais={animaisInativos} />.
//
// 6. Garantir que "carregarAnimais" continue sendo chamado em:
//    - useEffect inicial,
//    - handleAtualizar,
//    - e no onAtualizar passado para <SaidaAnimal onAtualizar={handleAtualizar} />.
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

// Páginas internas (apenas layout)
import SubAbasAnimais from "./SubAbasAnimais";
import SaidaAnimal from "./SaidaAnimal";
import Inativas from "./Inativas";
import CadastroAnimal from "./CadastroAnimal";
import FichaAnimal from "./FichaAnimal/FichaAnimal";

// =========================
//   CONSTANTES DE LAYOUT
// =========================

// largura da barra lateral
const LARGURA_BARRA = 80;

// altura aproximada do cabeçalho com ícones (ANIMAIS, BEZERRAS, etc.)
const ALTURA_CABECALHO = 150;

// 👉 AJUSTE AQUI O TAMANHO DOS ÍCONES DA BARRA LATERAL
//    Se quiser maior, por ex. 32. Se quiser menor, 24.
const TAMANHO_ICONE_LATERAL = 28;

// espaço interno superior do conteúdo (entre cabeçalho e card branco)
const PADDING_TOPO_CONTEUDO = 24;

const botoesBarra = [
  { id: "todos", label: "Todos os Animais", icon: <ListChecks /> },
  { id: "entrada", label: "Entrada de Animais", icon: <PlusCircle /> },
  { id: "saida", label: "Saída de Animais", icon: <ArrowRightCircle /> },
  { id: "inativas", label: "Inativas", icon: <Ban /> },
  { id: "relatorio", label: "Relatórios", icon: <FileText /> },
  { id: "importar", label: "Importar Dados", icon: <UploadCloud /> },
  { id: "exportar", label: "Exportar Dados", icon: <DownloadCloud /> },
];

// =========================
//   BARRA LATERAL FIXA
// =========================
function BarraLateral({ abaAtiva, setAbaAtiva }) {
  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        top: 0,          // ocupa desde o topo
        bottom: 0,       // até o rodapé
        width: `${LARGURA_BARRA}px`,
        backgroundColor: "#17398d",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        // ícones começam só depois do cabeçalho
        paddingTop: ALTURA_CABECALHO + 24,
        paddingBottom: 20,
        gap: 16, // ~0,5 cm entre ícones
        zIndex: 1, // fica por baixo do cabeçalho azul
      }}
    >
      {botoesBarra.map((btn) => {
        const ativo = abaAtiva === btn.id;
        return (
          <button
            key={btn.id}
            onClick={() => setAbaAtiva(btn.id)}
            title={btn.label}
            style={{
              width: 58,
              height: 58,
              borderRadius: "9999px",
              border: "2px solid #ffffff",
              backgroundColor: ativo ? "#ffffff" : "transparent",
              color: ativo ? "#17398d" : "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: ativo
                ? "0 0 0 4px rgba(255,255,255,0.32)"
                : "0 4px 10px rgba(0,0,0,0.20)",
              cursor: "pointer",
              transition: "all 0.18s ease-out",
              transform: ativo ? "translateX(2px)" : "translateX(0)",
            }}
          >
            {React.cloneElement(btn.icon, {
              size: TAMANHO_ICONE_LATERAL, // 👈 mexe só nessa constante
              strokeWidth: 2.4,
            })}
          </button>
        );
      })}
    </div>
  );
}

// =========================
//   COMPONENTE PRINCIPAL
// =========================
export default function Animais() {
  const [abaAtiva, setAbaAtiva] = useState("todos");

  // 👇 Agora separamos ativos e inativos
  const [animaisAtivos, setAnimaisAtivos] = useState([]);
  const [animaisInativos, setAnimaisInativos] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const [fichaOpen, setFichaOpen] = useState(false);
  const [animalFicha, setAnimalFicha] = useState(null);

  // 🔄 Carrega ativos + inativos do Supabase
  const carregarAnimais = useCallback(async () => {
    setCarregando(true);
    try {
      // 1) ATIVOS
      const { data: ativos, error: erroAtivos } = await supabase
        .from("animais")
        .select("id, numero, brinco")
        .eq("ativo", true)
        .order("numero", { ascending: true });

      setAnimaisAtivos(!erroAtivos && ativos ? ativos : []);

      // 2) INATIVOS (sem relação)
      const { data: inativosRaw, error: erroInativos } = await supabase
        .from("animais")
        .select("id, numero, brinco")
        .eq("ativo", false)
        .order("numero", { ascending: true });

      if (erroInativos || !inativosRaw) {
        setAnimaisInativos([]);
        return;
      }

      const idsInativos = inativosRaw.map((a) => a.id).filter(Boolean);

      const { data: saidas, error: erroSaidas } = idsInativos.length
        ? await supabase
            .from("saidas_animais")
            .select(
              "id, animal_id, tipo_saida, motivo_saida, data_saida, valor_venda, observacao"
            )
            .in("animal_id", idsInativos)
            .order("data_saida", { ascending: true })
        : { data: [], error: null };

      if (erroSaidas) {
        setAnimaisInativos([]);
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
          motivo_saida: ultima?.motivo_saida || "",
          data_saida: dataFormatada,
          observacao_saida: ultima?.observacao || "",
          valor_saida: ultima?.valor_venda ?? null,
        };
      });

      setAnimaisInativos(formatado);
    } finally {
      setCarregando(false);
    }
  }, []);

  // Carrega ao entrar na página
  useEffect(() => {
    carregarAnimais();
  }, [carregarAnimais]);

  // 🔒 Desliga o scroll da página e deixa só o da tabela
  useEffect(() => {
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      // volta ao normal quando sair da página
      document.body.style.overflow = overflowOriginal || "";
    };
  }, []);

  const handleAtualizar = () => {
    // chamada única para recarregar tudo que depende de animais
    carregarAnimais();
  };

  const handleVerFicha = (animal) => {
    setAnimalFicha(animal);
    setFichaOpen(true);
  };

  const renderizarPrincipal = () => {
    switch (abaAtiva) {
      case "todos":
        return (
          <SubAbasAnimais
            animais={animaisAtivos}      // ✅ só ativos
            onRefresh={handleAtualizar}
          />
        );

      case "entrada":
        return (
          <CadastroAnimal
            animais={animaisAtivos}      // se precisar listar, só ativos
            onAtualizar={handleAtualizar}
          />
        );

      case "saida":
        return (
          <SaidaAnimal
            animais={animaisAtivos}      // opcional, mas coerente
            onAtualizar={handleAtualizar}
          />
        );

      case "inativas":
        return (
          <Inativas
            animais={animaisInativos}    // ✅ aqui vão só inativos
            onAtualizar={handleAtualizar}
            onVerFicha={handleVerFicha}
          />
        );

      case "relatorio":
        return <div className="p-4">Relatórios — em construção.</div>;

      case "importar":
        return <div className="p-4">Importar Dados — em construção.</div>;

      case "exportar":
        return <div className="p-4">Exportar Dados — em construção.</div>;

      default:
        return <div className="p-4">Em breve…</div>;
    }
  };

  // altura máxima da “caixa branca” (sem depender do cabeçalho)
  const cardMaxHeight = "calc(100vh - 2 * 24px)"; // 24px top + 24px bottom

  return (
    <div
      style={{
        minHeight: "100vh",
        overflow: "hidden", // garante que só a área interna role
      }}
    >
      {/* Barra lateral fixa, passando por trás do cabeçalho */}
      <BarraLateral abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />

      {/* Conteúdo principal, deslocado para a direita da barra */}
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
          {/* Área que rola (sub-abas + tabelas) */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
            }}
          >
            {carregando ? (
              <div className="p-4 text-sm text-gray-500">
                Carregando animais...
              </div>
            ) : (
              renderizarPrincipal()
            )}
          </div>
        </div>
      </div>

      {/* Modal de ficha reutilizável */}
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
