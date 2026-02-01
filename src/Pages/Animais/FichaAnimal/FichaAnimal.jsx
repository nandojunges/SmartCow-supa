// src/pages/Animais/FichaAnimal/FichaAnimal.jsx
import React, { useEffect, useState } from "react";

import FichaAnimalResumo from "./FichaAnimalResumo";
import FichaAnimalLeite from "./FichaAnimalLeite";
import FichaAnimalPesagens from "./FichaAnimalPesagens";
import FichaAnimalEventos from "./FichaAnimalEventos";
import FichaAnimalReproducao from "./FichaAnimalReproducao";

// >>> IMPORT NOVO: supabase
import { supabase } from "../../../lib/supabaseClient";

/* ========= helper de data para lactações ========= */

function calcularDias(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) return "—";
  const inicio = new Date(dataInicio.split("/").reverse().join("-"));
  const fim = new Date(dataFim.split("/").reverse().join("-"));
  const diff = (fim - inicio) / 86400000;
  return Math.round(diff);
}

/** Modal principal da Ficha do Animal (com abas) */
export default function FichaAnimal({ animal, onClose }) {
  // >>> NOVO: estado com o animal completo vindo do banco
  const [animalDetalhado, setAnimalDetalhado] = useState(animal);

  const [pesagens, setPesagens] = useState([]);
  const [ocorrencias, setOcorrencias] = useState([]);
  const [tratamentos, setTratamentos] = useState([]);
  const [producaoLeite, setProducaoLeite] = useState([]);
  const [lactacoes, setLactacoes] = useState([]);
  const [lactacaoSelecionada, setLactacaoSelecionada] = useState(0);
  const [inseminacoes, setInseminacoes] = useState([]);
  const [diagnosticos, setDiagnosticos] = useState([]);
  const [partos, setPartos] = useState([]);
  const [secagens, setSecagens] = useState([]);
  const [eventos, setEventos] = useState([]);

  const [abaAtiva, setAbaAtiva] = useState("resumo");

  // ================== NOVO USEEFFECT ==================
  // Busca no Supabase todos os campos de identificação / genealogia / status
  useEffect(() => {
    async function carregarAnimal() {
      if (!animal?.id) return;

      const { data, error } = await supabase
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
          categoria,
          categoria_atual,
          situacao_produtiva,
          situacao_reprodutiva,
          ultimo_parto,
          ultima_ia
        `
        )
        .eq("id", animal.id)
        .maybeSingle();

      if (error || !data) {
        console.error("Erro ao carregar animal detalhado:", error || "sem dados");
        return;
      }

      // buscar nome da raça
      let racaNome = null;
      if (data.raca_id) {
        const { data: racaRow, error: errorRaca } = await supabase
          .from("racas")
          .select("nome")
          .eq("id", data.raca_id)
          .maybeSingle();

        if (!errorRaca && racaRow) {
          racaNome = racaRow.nome;
        }
      }

      const completo = {
        ...data,
        raca_nome: racaNome,
      };

      console.log("DEBUG FichaAnimal - completo:", completo);
      setAnimalDetalhado(completo);
    }

    carregarAnimal();
  }, [animal?.id]);
  // ================== FIM BLOCO NOVO ==================

  // ====== Carrega histórico exclusivamente do objeto "animal" ======
  useEffect(() => {
    if (!animal) return;

    const hist = animal.historico || {};

    const _pesagens = Array.isArray(hist.pesagens) ? hist.pesagens : [];
    const _ocorrencias = Array.isArray(hist.ocorrencias) ? hist.ocorrencias : [];
    const _tratamentos = Array.isArray(hist.tratamentos) ? hist.tratamentos : [];
    const _leite = Array.isArray(hist.producoesLeite)
      ? hist.producoesLeite
      : Array.isArray(hist.leite)
      ? hist.leite
      : [];
    const _partos = Array.isArray(hist.partos) ? hist.partos : [];
    const _inseminacoes = Array.isArray(hist.inseminacoes)
      ? hist.inseminacoes
      : [];
    const _diagnosticos = Array.isArray(hist.diagnosticosGestacao)
      ? hist.diagnosticosGestacao
      : Array.isArray(hist.diagnosticos)
      ? hist.diagnosticos
      : [];
    const _secagens = Array.isArray(hist.secagens) ? hist.secagens : [];

    setPesagens(_pesagens);
    setOcorrencias(_ocorrencias);
    setTratamentos(_tratamentos);
    setInseminacoes(_inseminacoes);
    setDiagnosticos(_diagnosticos);
    setPartos(_partos);
    setSecagens(_secagens);
    setEventos([
      ..._ocorrencias.map((o) => ({
        tipo: o.tipo || "Ocorrência",
        data: o.data,
        obs: o.obs,
      })),
      ..._tratamentos.map((t) => ({
        tipo: "Tratamento",
        data: t.data,
        obs: t.obs,
      })),
    ]);

    setProducaoLeite(_leite);

    const partosOrdenados = _partos
      .filter((p) => p?.data)
      .sort(
        (a, b) =>
          new Date(a.data.split("/").reverse().join("-")) -
          new Date(b.data.split("/").reverse().join("-"))
      );

    const grupos = partosOrdenados.map((p, index) => {
      const inicio = p.data;
      const proximo = partosOrdenados[index + 1];
      const fim = proximo ? proximo.data : null;

      const producoes = _leite.filter((l) => {
        if (!l?.data) return false;
        const d = new Date(l.data.split("/").reverse().join("-"));
        const ini = new Date(inicio.split("/").reverse().join("-"));
        const fimDate = fim
          ? new Date(fim.split("/").reverse().join("-"))
          : null;
        return d >= ini && (!fimDate || d < fimDate);
      });

      const total = producoes.reduce(
        (acc, cur) => acc + Number(cur.litros || cur.volume || 0),
        0
      );

      return {
        parto: inicio,
        secagem: fim || "—",
        dias: fim ? calcularDias(inicio, fim) : "—",
        volume: total,
        producoes,
      };
    });

    setLactacoes(grupos);
    setLactacaoSelecionada(0);
    setAbaAtiva("resumo");
  }, [animal]);

  // Fecha no ESC
  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  if (!animal) return null;

  const animalParaHeader = animalDetalhado || animal;

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div style={header}>
          <span>
            📋 Ficha do animal:{" "}
            {animalParaHeader?.nome ||
              animalParaHeader?.numero ||
              "sem número"}
          </span>
          <button onClick={onClose} style={botaoFechar}>
            ×
          </button>
        </div>

        {/* Abas */}
        <div style={abas}>
          {[
            { id: "resumo", label: "📌 Resumo" },
            { id: "reproducao", label: "🔬 Reprodução" },
            { id: "leite", label: "🧀 Leite" },
            { id: "pesagens", label: "⚖️ Pesagens" },
            { id: "eventos", label: "🚨 Ocorrências" },
          ].map((aba) => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              style={{
                padding: "0.6rem 1.4rem",
                fontWeight: "500",
                fontSize: "0.95rem",
                borderRadius: "0.75rem 0.75rem 0 0",
                background: abaAtiva === aba.id ? "#ffffff" : "#f1f5f9",
                border: "1px solid #dbeafe",
                borderBottom:
                  abaAtiva === aba.id ? "none" : "1px solid #d1d5db",
                color: abaAtiva === aba.id ? "#1e40af" : "#6b7280",
                boxShadow:
                  abaAtiva === aba.id ? "inset 0 2px 0 #2563eb" : "none",
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
              }}
            >
              {aba.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
            background: "#f9fafb",
          }}
        >
          {abaAtiva === "resumo" && (
            // >>> AQUI USAMOS O OBJETO COMPLETO
            <FichaAnimalResumo animal={animalDetalhado || animal} />
          )}

          {abaAtiva === "leite" && (
            <FichaAnimalLeite
              animal={animal}
              lactacoes={lactacoes}
              lactacaoSelecionada={lactacaoSelecionada}
              setLactacaoSelecionada={setLactacaoSelecionada}
              producaoLeite={producaoLeite}
            />
          )}

          {abaAtiva === "pesagens" && (
            <FichaAnimalPesagens animal={animal} pesagens={pesagens} />
          )}

          {abaAtiva === "eventos" && <FichaAnimalEventos eventos={eventos} />}

          {abaAtiva === "reproducao" && (
            <FichaAnimalReproducao
              animal={animal}
              partos={partos}
              inseminacoes={inseminacoes}
              diagnosticos={diagnosticos}
              secagens={secagens}
              tratamentos={tratamentos}
              ocorrencias={ocorrencias}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ===== estilos base do modal ===== */

const overlay = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modal = {
  background: "#fff",
  borderRadius: "1rem",
  width: "96vw",
  height: "92vh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  fontFamily: "Poppins, sans-serif",
  boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
};

const header = {
  background: "#1e40af",
  color: "white",
  padding: "1rem 1.5rem",
  fontWeight: "bold",
  fontSize: "1.1rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const botaoFechar = {
  background: "none",
  border: "none",
  color: "white",
  fontSize: "1.5rem",
  cursor: "pointer",
};

const abas = {
  display: "flex",
  background: "#e0e7ff",
  paddingLeft: "1.5rem",
  paddingTop: "0.5rem",
  gap: "0.5rem",
  borderBottom: "1px solid #cbd5e1",
};
