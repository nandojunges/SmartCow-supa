// CODEX: Ajustar este arquivo Animais.jsx para:
// 1. Remover a relação saidas_animais do select (está dando erro 400).
// 2. Criar duas consultas separadas no Supabase:
//    - animais ativos (ativo = true)
//    - animais inativos (ativo = false)
// 3. Fazer uma consulta separada em saidas_animais usando .in("animal_id", idsInativos)
// 4. Montar em JS o objeto do inativo contendo motivo_saida e data_saida.
// 5. Preencher SubAbasAnimais com animaisAtivos e Inativas com animaisInativos.
// 6. Após registrar saída em SaidaAnimal, chamar carregarAnimais() no onAtualizar.
// 7. Não alterar layout, só a lógica de carregar dados.
//
// CODEX: Corrigir os erros 400 do Supabase:
// 1) Em todas as queries na tabela saidas_animais, trocar data_saida -> data e valor_venda -> valor, inclusive no .order.
// 2) Remover qualquer select relacional saidas_animais(...) dentro de from("animais") e usar apenas select("id, numero, brinco") com ativo=false.
// 3) Manter a lógica de buscar saidas_animais em uma query separada com .in("animal_id", idsInativos) e montar ultimaSaidaPorAnimal em JavaScript.
// src/Pages/Animais/Animais.jsx
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

      // 3) SAÍDAS separadas
      let saidasPorAnimal = {};
      if (idsInativos.length > 0) {
        const { data: saidas } = await supabase
          .from("saidas_animais")
          .select("id, animal_id, tipo, motivo, data_saida, valor_venda, observacao")
          .in("animal_id", idsInativos)
          .order("data_saida", { ascending: true });

        if (Array.isArray(saidas)) {
          saidasPorAnimal = saidas.reduce((acc, item) => {
            const list = acc[item.animal_id] || [];
            list.push(item);
            acc[item.animal_id] = list;
            return acc;
          }, {});
        }
      }

      // 4) Monta objeto final com última saída
      const formatado = inativosRaw.map((a) => {
        const historico = saidasPorAnimal[a.id] || [];
        const ultima = historico.length > 0 ? historico[historico.length - 1] : null;

        let dataFormatada = "—";
        if (ultima?.data_saida) {
          const [ano, mes, dia] = ultima.data_saida.split("-");
          if (ano && mes && dia) dataFormatada = `${dia}/${mes}/${ano}`;
        }

        return {
          id: a.id,
          numero: a.numero,
          brinco: a.brinco,
          tipo_saida: ultima?.tipo || "",
          motivo_saida: ultima?.motivo || "",
          data_saida: dataFormatada,
          observacao_saida: ultima?.observacao || "",
          valor_saida: ultima?.valor_venda || null,
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
