// src/Pages/Animais/SaidaAnimal.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import Select from "react-select";
import { supabase } from "../../lib/supabaseClient";
import { withFazendaId } from "../../lib/fazendaScope";
import { useFazenda } from "../../context/FazendaContext";
import { enqueue, kvGet, kvSet } from "../../offline/localDB";

const CACHE_ANIMAIS_KEY = "cache:animais:list";
const CACHE_SAIDAS_KEY = "cache:saidas_animais:list";

function gerarUUID() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (error) {
    console.warn("Falha ao gerar UUID nativo:", error);
  }
  const randomPart = () => Math.random().toString(16).slice(2, 10);
  return `${Date.now().toString(16)}-${randomPart()}-${randomPart()}`;
}

function extrairListaCache(cache) {
  if (Array.isArray(cache)) return [...cache];
  if (Array.isArray(cache?.animais)) return [...cache.animais];
  return [];
}

export default function SaidaAnimal({ onAtualizar }) {
  const { fazendaAtualId } = useFazenda();
  const [animalSelecionado, setAnimalSelecionado] = useState(null);
  const [tipo, setTipo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [data, setData] = useState("");
  const [observacao, setObservacao] = useState("");
  const [valor, setValor] = useState(""); // valor em string formatada (R$ 100,00)
  const [erros, setErros] = useState({});
  const [ok, setOk] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [animais, setAnimais] = useState([]);

  const motivosVenda = [
    "Baixa produção",
    "Problemas reprodutivos",
    "Problemas de casco",
    "Excesso de animais",
    "Venda para outro produtor",
    "Renovação genética",
    "Problemas de temperamento",
    "Troca de categoria",
  ];
  const motivosMorte = [
    "Doença grave",
    "Acidente",
    "Problemas no parto",
    "Mastite grave",
    "Senilidade",
    "Infecção generalizada",
    "Problema respiratório",
    "Morte súbita",
    "Outras causas",
  ];

  const opcoesTipo = [
    { value: "venda", label: "💰 Venda" },
    { value: "morte", label: "☠️ Morte" },
    { value: "doacao", label: "🎁 Doação" },
  ];
  const opcoesMotivo = (t) =>
    (t === "venda" ? motivosVenda : t === "morte" ? motivosMorte : []).map(
      (x) => ({ value: x, label: x })
    );

  const formatarData = (v) => {
    const s = (v || "").replace(/\D/g, "").slice(0, 8);
    const d = s.slice(0, 2);
    const m = s.slice(2, 4);
    const y = s.slice(4, 8);
    return [d, m, y].filter(Boolean).join("/");
  };

  // Mantém a máscara "R$ 100,00" no input
  const formatarMoeda = (v) => {
    const soDigitos = (v || "").replace(/\D/g, "");
    const n = parseFloat(soDigitos || "0") / 100;
    return n.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  // Converte string "R$ 100,00" em número 100.00 para salvar no Supabase
  const parseMoedaToNumber = (v) => {
    if (!v) return null;
    const soDigitos = String(v).replace(/\D/g, "");
    if (!soDigitos) return null;
    return parseFloat(soDigitos) / 100;
  };

  const validar = () => {
    const e = {};
    if (!animalSelecionado) e.animal = "Selecione um animal válido.";
    if (!tipo) e.tipo = "Obrigatório.";
    if (!motivo) e.motivo = "Obrigatório.";
    if ((data || "").length !== 10) e.data = "Data inválida.";

    if (tipo === "venda") {
      const num = parseMoedaToNumber(valor);
      if (num === null || Number.isNaN(num) || num <= 0) {
        e.valor = "Informe o valor da venda.";
      }
    }

    setErros(e);
    return Object.keys(e).length === 0;
  };

  const carregarAnimais = useCallback(async () => {
    try {
      if (!navigator.onLine) {
        const cache = await kvGet(CACHE_ANIMAIS_KEY);
        const lista = extrairListaCache(cache).filter(
          (animal) => animal?.ativo !== false
        );
        setAnimais(lista);
        return;
      }

      if (!fazendaAtualId) {
        throw new Error("Selecione uma fazenda para carregar os animais.");
      }

      const { data, error } = await withFazendaId(
        supabase.from("animais").select("id, numero, brinco"),
        fazendaAtualId
      )
        .eq("ativo", true)
        .order("numero", { ascending: true });

      if (error) throw error;
      setAnimais(data || []);
    } catch (err) {
      console.error("Falha ao carregar animais:", err);
      const msg = err?.message || "Erro ao carregar animais";
      setOk(`❌ ${msg}`);
      setTimeout(() => setOk(""), 5000);
    }
  }, [fazendaAtualId]);

  useEffect(() => {
    carregarAnimais();
  }, [carregarAnimais]);

  const submit = async () => {
    if (!validar() || salvando) return;
    setSalvando(true);
    try {
      if (!fazendaAtualId) {
        throw new Error("Selecione uma fazenda antes de registrar a saída.");
      }

      const [dia, mes, ano] = data.split("/");
      const dataISO = `${ano}-${mes}-${dia}`;

      const valorNumerico =
        tipo === "venda" ? parseMoedaToNumber(valor) : null;

      if (!navigator.onLine) {
        const saidaId = gerarUUID();
        const payload = {
          id: saidaId,
          fazenda_id: fazendaAtualId,
          animal_id: animalSelecionado.value,
          tipo_saida: tipo,
          motivo_saida: motivo,
          data_saida: dataISO,
          valor_venda: valorNumerico,
          observacao: observacao,
        };

        const cacheSaidas = await kvGet(CACHE_SAIDAS_KEY);
        const saidasAtualizadas = Array.isArray(cacheSaidas)
          ? [...cacheSaidas, payload]
          : [payload];
        await kvSet(CACHE_SAIDAS_KEY, saidasAtualizadas);

        const cacheAnimais = await kvGet(CACHE_ANIMAIS_KEY);
        const animaisAtualizados = extrairListaCache(cacheAnimais).map(
          (animal) =>
            animal?.id === animalSelecionado.value
              ? { ...animal, ativo: false }
              : animal
        );
        await kvSet(CACHE_ANIMAIS_KEY, animaisAtualizados);

        await enqueue("saidas_animais.insert", payload);
        await enqueue("animais.setAtivoFalse", {
          animal_id: animalSelecionado.value,
        });

        onAtualizar?.();
        setOk("✅ Saída registrada offline. Será sincronizada ao reconectar.");
        setTimeout(() => setOk(""), 3000);

        setAnimalSelecionado(null);
        setTipo("");
        setMotivo("");
        setData("");
        setObservacao("");
        setValor("");
        setErros({});
        return;
      }

      const { error: insertError } = await supabase
        .from("saidas_animais")
        .insert({
          fazenda_id: fazendaAtualId,
          animal_id: animalSelecionado.value,
          tipo_saida: tipo,
          motivo_saida: motivo,
          data_saida: dataISO,
          valor_venda: valorNumerico,
          observacao: observacao,
        });

      if (insertError) throw insertError;

      const { error: updateError } = await withFazendaId(
        supabase.from("animais").update({ ativo: false }),
        fazendaAtualId
      ).eq("id", animalSelecionado.value);

      if (updateError) throw updateError;

      await carregarAnimais();
      onAtualizar?.();
      setOk("✅ Saída registrada com sucesso!");
      setTimeout(() => setOk(""), 3000);

      // reset
      setAnimalSelecionado(null);
      setTipo("");
      setMotivo("");
      setData("");
      setObservacao("");
      setValor("");
      setErros({});
    } catch (err) {
      console.error("Falha ao registrar saída:", err);
      const msg = err?.message || "Erro ao registrar saída";
      setOk(`❌ ${msg}`);
      setTimeout(() => setOk(""), 5000);
    } finally {
      setSalvando(false);
    }
  };

  const opcoesAnimais = useMemo(
    () =>
      (Array.isArray(animais) ? animais : []).map((a) => ({
        value: a.id,
        label: `${a.numero || "—"} • Brinco ${a.brinco || "—"}`,
      })),
    [animais]
  );

  // ====== RENDER ======
  return (
    <div style={wrapper}>
      {/* Feedback topo */}
      {ok && (
        <div style={ok.startsWith("✅") ? alertSucesso : alertErro}>
          {ok}
        </div>
      )}

      {/* 2 colunas: esquerda (form) / direita (resumo + espaço futuro) */}
      <div style={gridPrincipal}>
        {/* COLUNA ESQUERDA */}
        <div>
          <div style={scrollColEsq}>
            {/* Título */}
            <div style={{ marginBottom: 12 }}>
              <h1 style={tituloPagina}>Registro de saída de animal</h1>
              <p style={subtituloPagina}>
                Informe os dados da saída para atualizar automaticamente o
                histórico e os relatórios de descarte/venda.
              </p>
            </div>

            {/* Bloco: info geral / “Plantel → Inativos” */}
            <div style={{ ...card, marginBottom: 24, padding: "16px 20px" }}>
              <div style={cardHeader}>
                <span style={cardTitle}>Fluxo</span>
                <span style={pill}>
                  Plantel <span style={{ opacity: 0.6 }}>→</span> Inativos
                </span>
              </div>
              <p style={textoMenor}>
                Ao confirmar a saída, o animal é removido da lista de ativos e
                passa a compor os relatórios de inativos.
              </p>
            </div>

            {/* 1. Identificação */}
            <div style={{ ...card, marginBottom: 24 }}>
              <div style={cardHeader}>
                <span style={cardTitle}>
                  1. Identificação do animal e tipo de saída
                </span>
              </div>

              <div style={grid2}>
                <div>
                  <label style={lbl}>Animal</label>
                  <Select
                    options={opcoesAnimais}
                    value={animalSelecionado}
                    onChange={setAnimalSelecionado}
                    placeholder="Digite o número ou brinco"
                    styles={selectEstilo}
                  />
                  {erros.animal && (
                    <div style={erroCampo}>{erros.animal}</div>
                  )}
                </div>

                <div>
                  <label style={lbl}>Tipo de saída</label>
                  <Select
                    options={opcoesTipo}
                    value={
                      opcoesTipo.find((x) => x.value === tipo) || null
                    }
                    onChange={(e) => {
                      setTipo(e.value);
                      setMotivo("");
                    }}
                    placeholder="Selecione o tipo"
                    styles={selectEstilo}
                  />
                  {erros.tipo && (
                    <div style={erroCampo}>{erros.tipo}</div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Motivo e data */}
            <div style={{ ...card, marginBottom: 24 }}>
              <div style={cardHeader}>
                <span style={cardTitle}>2. Motivo e data da saída</span>
              </div>

              <div style={grid2}>
                <div>
                  <label style={lbl}>Motivo</label>
                  <Select
                    options={opcoesMotivo(tipo)}
                    value={
                      motivo ? { value: motivo, label: motivo } : null
                    }
                    onChange={(e) => setMotivo(e.value)}
                    placeholder={
                      tipo ? "Selecione o motivo" : "Escolha o tipo primeiro"
                    }
                    isDisabled={!tipo}
                    styles={selectEstilo}
                  />
                  {erros.motivo && (
                    <div style={erroCampo}>{erros.motivo}</div>
                  )}
                </div>

                <div>
                  <label style={lbl}>Data da saída</label>
                  <input
                    type="text"
                    value={data}
                    onChange={(e) =>
                      setData(formatarData(e.target.value))
                    }
                    placeholder="dd/mm/aaaa"
                    style={inputBase}
                  />
                  {erros.data && (
                    <div style={erroCampo}>{erros.data}</div>
                  )}
                  <p style={textoAux}>
                    Use a data real da venda, morte ou doação para manter os
                    relatórios consistentes.
                  </p>
                </div>
              </div>
            </div>

            {/* 3. Valor da venda (apenas venda) */}
            {tipo === "venda" && (
              <div style={{ ...card, marginBottom: 24 }}>
                <div style={cardHeader}>
                  <span style={cardTitle}>3. Detalhes financeiros</span>
                  <span style={pillVerde}>
                    Integração com Financeiro
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(0,1.3fr) minmax(0,1fr)",
                    columnGap: 16,
                    rowGap: 14,
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <label style={lbl}>Valor da venda (R$)</label>
                    <input
                      type="text"
                      value={valor}
                      onChange={(e) =>
                        setValor(formatarMoeda(e.target.value))
                      }
                      placeholder="Informe o valor total"
                      style={inputBase}
                    />
                    {erros.valor && (
                      <div style={erroCampo}>{erros.valor}</div>
                    )}
                  </div>
                  <div style={textoFinanceiro}>
                    Esse valor será considerado nos relatórios de receita e
                    pode ser conciliado com o módulo Financeiro do sistema.
                  </div>
                </div>
              </div>
            )}

            {/* 4. Observações */}
            <div style={{ ...card, marginBottom: 24 }}>
              <div style={cardHeader}>
                <span style={cardTitle}>4. Observações gerais</span>
              </div>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex.: informações complementares, lote, comprador, condições de saúde no momento da saída (opcional)."
                style={textareaBase}
              />
            </div>

            {/* Botão salvar */}
            <div
              style={{
                ...card,
                padding: "16px 24px",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={submit}
                disabled={salvando}
                style={{
                  ...btnPrimario,
                  opacity: salvando ? 0.7 : 1,
                  cursor: salvando ? "default" : "pointer",
                }}
              >
                {salvando ? "⏳ Gravando..." : "💾 Registrar saída do animal"}
              </button>
            </div>

            <div style={{ height: 32 }} />
          </div>
        </div>

        {/* COLUNA DIREITA: resumo + espaço futuro para gráficos */}
        <div>
          <div style={colunaDireitaSticky}>
            {/* Resumo da saída */}
            <div style={cardResumo}>
              <div style={cardHeader}>
                <span style={cardTitle}>Resumo da saída</span>
              </div>

              <div style={{ display: "grid", rowGap: 8 }}>
                <div style={rowKV}>
                  <span style={k}>Animal</span>
                  <span style={v}>
                    {animalSelecionado?.label || "—"}
                  </span>
                </div>
                <div style={rowKV}>
                  <span style={k}>Tipo</span>
                  <span style={v}>
                    {
                      opcoesTipo.find((x) => x.value === tipo)
                        ?.label || "—"
                    }
                  </span>
                </div>
                <div style={rowKV}>
                  <span style={k}>Motivo</span>
                  <span style={v}>{motivo || "—"}</span>
                </div>
                <div style={rowKV}>
                  <span style={k}>Data</span>
                  <span style={v}>{data || "—"}</span>
                </div>
                {tipo === "venda" && (
                  <div style={rowKV}>
                    <span style={k}>Valor</span>
                    <span style={{ ...v, color: "#047857" }}>
                      {valor || "—"}
                    </span>
                  </div>
                )}
              </div>

              <div style={separador} />

              <div style={textoResumoBottom}>
                Após salvar, o animal será automaticamente marcado como
                inativo e aparecerá na aba de inativos/relatórios.
              </div>
            </div>

            {/* Espaço reservado para gráfico futuro */}
            <div style={{ ...card, marginTop: 16, minHeight: 180 }}>
              <div style={cardHeader}>
                <span style={cardTitle}>
                  Saídas ao longo do tempo
                </span>
              </div>
              <p style={textoMenor}>
                Espaço reservado para futuros gráficos de saídas por
                mês/motivo. Por enquanto, serve apenas como equilíbrio
                visual para os campos do formulário.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========= Estilos compartilhados (mesmo “jeito” do CadastroAnimal) ========= */

const wrapper = {
  maxWidth: 1300,
  margin: "0 auto",
  padding: "16px 20px 32px",
  fontFamily: "Poppins, system-ui, sans-serif",
  boxSizing: "border-box",
  overflow: "hidden",
};

const gridPrincipal = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)",
  columnGap: 56,
  alignItems: "flex-start",
};

const scrollColEsq = {
  display: "flex",
  flexDirection: "column",
  maxHeight: "calc(100vh - 220px)",
  overflowY: "auto",
  paddingRight: 8,
  paddingBottom: 40,
};

const tituloPagina = {
  fontSize: 26,
  fontWeight: 900,
  margin: 0,
  marginBottom: 4,
};

const subtituloPagina = {
  fontSize: 13,
  color: "#6b7280",
  margin: 0,
};

const card = {
  background: "#ffffff",
  borderRadius: 18,
  border: "1px solid #e5e7eb",
  padding: 24,
  boxShadow: "0 1px 6px rgba(15, 23, 42, 0.04)",
  boxSizing: "border-box",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
};

const cardTitle = {
  fontSize: 15,
  fontWeight: 900,
};

const pill = {
  background: "#eef2ff",
  color: "#3730a3",
  borderRadius: 999,
  padding: "4px 10px",
  border: "1px solid #c7d2fe",
  fontSize: 11,
  fontWeight: 700,
};

const pillVerde = {
  background: "#ecfdf5",
  color: "#047857",
  borderRadius: 999,
  padding: "4px 10px",
  border: "1px solid #bbf7d0",
  fontSize: 11,
  fontWeight: 700,
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
  columnGap: 16,
  rowGap: 18,
};

const lbl = {
  fontWeight: 700,
  fontSize: 13,
  color: "#334155",
  marginBottom: 6,
  display: "block",
};

const inputBase = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #d1d5db",
  padding: "10px 12px",
  fontSize: 14,
  background: "#ffffff",
  boxSizing: "border-box",
};

const textareaBase = {
  ...inputBase,
  minHeight: 90,
  resize: "vertical",
};

const selectEstilo = {
  container: (base) => ({
    ...base,
    width: "100%",
  }),
  control: (base) => ({
    ...base,
    borderRadius: 14,
    borderColor: "#d1d5db",
    minHeight: 44,
    boxShadow: "none",
    "&:hover": {
      borderColor: "#94a3b8",
    },
  }),
  placeholder: (base) => ({
    ...base,
    fontSize: 13,
    color: "#9ca3af",
  }),
};

const btnPrimario = {
  background: "#2563eb",
  color: "#ffffff",
  border: "none",
  padding: "11px 26px",
  borderRadius: 14,
  fontWeight: 800,
  fontSize: 14,
};

const alertSucesso = {
  backgroundColor: "#ecfdf5",
  color: "#065f46",
  border: "1px solid #34d399",
  padding: "8px 12px",
  borderRadius: 12,
  marginBottom: 12,
  fontWeight: 700,
  fontSize: 13,
};

const alertErro = {
  backgroundColor: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fca5a5",
  padding: "8px 12px",
  borderRadius: 12,
  marginBottom: 12,
  fontWeight: 700,
  fontSize: 13,
};

const erroCampo = {
  color: "#b91c1c",
  fontSize: 11,
  marginTop: 4,
};

const textoAux = {
  fontSize: 11,
  color: "#9ca3af",
  marginTop: 4,
};

const textoMenor = {
  fontSize: 12,
  color: "#6b7280",
};

const textoFinanceiro = {
  fontSize: 11,
  color: "#065f46",
  background: "#ecfdf5",
  borderRadius: 12,
  border: "1px solid #bbf7d0",
  padding: "8px 10px",
  lineHeight: 1.4,
};

const colunaDireitaSticky = {
  position: "sticky",
  top: 12,
};

const cardResumo = {
  ...card,
  paddingTop: 20,
  paddingBottom: 18,
};

const rowKV = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  fontSize: 13,
};

const k = {
  color: "#64748b",
  fontWeight: 700,
};

const v = {
  color: "#111827",
  fontWeight: 900,
  textAlign: "right",
};

const separador = {
  height: 1,
  background: "#e5e7eb",
  margin: "10px 0",
};

const textoResumoBottom = {
  fontSize: 11,
  color: "#6b7280",
};
