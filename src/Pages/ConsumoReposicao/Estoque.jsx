// src/pages/ConsumoReposicao/Estoque.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import Select from "react-select";
import { supabase } from "../../lib/supabaseClient";

import "../../styles/tabelamoderna.css";
import "../../styles/botoes.css";

import ModalAjustesEstoque from "./ModalAjustesEstoque";
import ModalNovoProduto from "./ModalNovoProduto";

const STICKY_OFFSET = 48;

/* ===================== MODAL BASE (somente para excluir) ===================== */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};

const modalCard = {
  background: "#fff",
  borderRadius: "1rem",
  width: "620px",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  fontFamily: "Poppins, sans-serif",
  overflow: "hidden",
};

const modalHeader = {
  background: "#1e40af",
  color: "#fff",
  padding: "1rem 1.2rem",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

/* ===================== REACT-SELECT (compacto) ===================== */
const rsStylesCompact = {
  container: (base) => ({ ...base, width: 240, minWidth: 240 }),
  control: (base, state) => ({
    ...base,
    minHeight: 38,
    height: 38,
    borderRadius: 10,
    borderColor: state.isFocused ? "#2563eb" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 1px #2563eb" : "none",
    ":hover": { borderColor: "#2563eb" },
    fontSize: 14,
  }),
  valueContainer: (base) => ({ ...base, padding: "0 10px" }),
  indicatorsContainer: (base) => ({ ...base, height: 38 }),
  menuPortal: (base) => ({ ...base, zIndex: 100000 }),
  menu: (base) => ({ ...base, zIndex: 100000 }),
};

export default function Estoque({ onCountChange }) {
  const categoriasFixas = useMemo(
    () => [
      { value: "Todos", label: "Todos" },
      { value: "Cozinha", label: "Cozinha" },
      { value: "Higiene e Limpeza", label: "Higiene e Limpeza" },
      { value: "Farmácia", label: "Farmácia" },
      { value: "Reprodução", label: "Reprodução" },
      { value: "Materiais Gerais", label: "Materiais Gerais" },
    ],
    []
  );

  const [minimos, setMinimos] = useState({
    Cozinha: 5,
    "Higiene e Limpeza": 2,
    Farmácia: 2,
    Reprodução: 1,
    "Materiais Gerais": 1,
  });

  const [tourosBase] = useState(() => []); // mock

  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");

  const [categoriaSelecionada, setCategoriaSelecionada] = useState(categoriasFixas[0]);
  const [hoverCol, setHoverCol] = useState(null);

  // modais
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [mostrarAjustes, setMostrarAjustes] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState(null);
  const [editar, setEditar] = useState({ abrir: false, item: null });

  /* ===================== HELPERS DE PAYLOAD DO MODAL ===================== */
  function splitPayload(payload) {
    // aceita:
    // 1) antigo: { nomeComercial, categoria, ... }
    // 2) novo: { produto: {...}, lote: {...} }
    if (payload && typeof payload === "object" && payload.produto) {
      // blindagem extra: às vezes vem {produto:{produto:{...}}}
      const produto = payload.produto?.produto ? payload.produto.produto : payload.produto;
      return { produto, lote: payload.lote || null };
    }
    return { produto: payload, lote: null };
  }

  function toDateOnly(v) {
    if (!v) return null;
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  async function getAuthUid() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data?.user?.id || null;
  }

  // ✅ Busca rápida do produto (nome + unidade) para descrever a compra no Financeiro
  async function getProdutoInfo(produtoId) {
    try {
      const { data, error } = await supabase
        .from("estoque_produtos")
        .select("id, nome_comercial, unidade, categoria")
        .eq("id", produtoId)
        .single();

      if (error) throw error;

      return {
        nome: data?.nome_comercial || null,
        unidade: data?.unidade || null,
        categoria: data?.categoria || null,
      };
    } catch (e) {
      console.warn("Não foi possível buscar info do produto (ok).", e);
      return { nome: null, unidade: null, categoria: null };
    }
  }

  // ✅ Registra a compra (entrada de lote) como SAÍDA de caixa no Financeiro
  async function registrarCompraNoFinanceiro({ produtoId, loteId, quantidade, valorTotal, validadeISO }) {
    const vTotal = Number(valorTotal || 0);
    const qtd = Number(quantidade || 0);
    if (!Number.isFinite(vTotal) || vTotal <= 0) return;
    if (!Number.isFinite(qtd) || qtd <= 0) return;

    const info = await getProdutoInfo(produtoId);
    const desc = info?.nome ? `Compra estoque: ${info.nome}` : `Compra estoque (produto)`;
    const unidade = info?.unidade || null;
    const unit = qtd > 0 ? vTotal / qtd : null;

    const payloadBase = {
      data: toDateOnly(new Date()),
      tipo: "SAIDA",
      categoria: "Estoque (Compra)",
      origem: "Estoque",
      descricao: desc,
      quantidade: qtd,
      unidade,
      valor_unitario: unit,
      valor_total: vTotal,
      observacao: validadeISO
        ? `Entrada de lote • Validade: ${new Date(`${validadeISO}T00:00:00`).toLocaleDateString("pt-BR")}`
        : `Entrada de lote`,
    };

    try {
      await supabase.from("financeiro_lancamentos").insert([
        {
          ...payloadBase,
          source_table: "estoque_lotes",
          source_id: loteId || null,
          impacta_caixa: true,
          detalhes: {
            produto_id: produtoId,
            lote_id: loteId || null,
            validade: validadeISO || null,
          },
        },
      ]);
      return;
    } catch (e) {
      console.warn("Financeiro: sem colunas extras de rastreio (ok).", e);
    }

    try {
      await supabase.from("financeiro_lancamentos").insert([payloadBase]);
    } catch (e2) {
      console.warn("Não foi possível registrar a compra no Financeiro.", e2);
    }
  }

  /* ===================== LOAD (Supabase) ===================== */
  const carregar = useCallback(
    async (categoriaOpt = categoriaSelecionada) => {
      try {
        setLoading(true);
        setErro("");

        const { data: produtosDb, error: errP } = await supabase
          .from("estoque_produtos")
          .select(
            `
            id,
            nome_comercial,
            categoria,
            unidade,
            apresentacao,
            tipo_farmacia,
            carencia_leite_dias,
            carencia_carne_dias,
            sem_carencia_leite,
            sem_carencia_carne,
            created_at,
            updated_at
          `
          )
          .order("nome_comercial", { ascending: true });

        if (errP) throw errP;

        const uiBase = (produtosDb || []).map(dbToUiProduto);

        // Lotes
        const ids = uiBase.map((p) => p.id).filter(Boolean);
        let lotes = [];

        if (ids.length > 0) {
          const { data: lotesDb, error: errL } = await supabase
            .from("estoque_lotes")
            .select(
              `
              id,
              produto_id,
              data_entrada,
              validade,
              quantidade_inicial,
              quantidade_atual,
              valor_total
            `
            )
            .in("produto_id", ids);

          if (errL) throw errL;
          lotes = Array.isArray(lotesDb) ? lotesDb : [];
        }

        const agregados = agregarLotesPorProduto(lotes);

        /* ========= Consumo/dia (previsão pela dieta mais recente por lote) =========
           - Aplica somente para categoria "Cozinha" e unidade "kg" (para não mentir em mL/doses).
           - Não baixa estoque aqui; é somente previsão.
        */
        let consumoDiaPorProduto = {}; // {produto_id: kg/dia}
        try {
          const { data: dietasDb, error: eD } = await supabase
            .from("dietas")
            .select("id, lote_id, dia, numvacas_snapshot")
            .order("dia", { ascending: false })
            .limit(200);

          if (!eD && Array.isArray(dietasDb) && dietasDb.length) {
            const lastByLote = new Map();
            for (const d of dietasDb) {
              if (!d?.lote_id) continue;
              if (!lastByLote.has(d.lote_id)) lastByLote.set(d.lote_id, d);
            }

            const dietaIds = Array.from(lastByLote.values()).map((d) => d.id).filter(Boolean);

            if (dietaIds.length) {
              const { data: itensDb, error: eI } = await supabase
                .from("dietas_itens")
                .select("dieta_id, produto_id, quantidade_kg_vaca")
                .in("dieta_id", dietaIds);

              if (!eI && Array.isArray(itensDb)) {
                const numVacasByDieta = {};
                for (const d of lastByLote.values()) {
                  numVacasByDieta[d.id] = Number(d.numvacas_snapshot || 0);
                }

                for (const it of itensDb) {
                  const pid = it?.produto_id;
                  const did = it?.dieta_id;
                  if (!pid || !did) continue;

                  const nv = Number(numVacasByDieta[did] || 0);
                  const kgVaca = Number(it.quantidade_kg_vaca || 0);
                  const consumoDia = nv * kgVaca;

                  if (consumoDia > 0) {
                    consumoDiaPorProduto[pid] = (consumoDiaPorProduto[pid] || 0) + consumoDia;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn("Não foi possível calcular consumo/dia (ok por enquanto).", e);
        }

        let lista = uiBase.map((p) => {
          const agg = agregados[p.id];

          const compradoTotal = agg ? Number(agg.compradoTotal || 0) : 0;
          const emEstoque = agg ? Number(agg.emEstoque || 0) : 0;
          const valorTotalRestante = agg ? Number(agg.valorTotalRestante || 0) : 0;
          const validadeMaisProxima = agg ? agg.validadeMaisProxima || null : null;

          const categoriaLower = String(p.categoria || "").trim().toLowerCase();
          const unidadeLower = String(p.unidade || "").trim().toLowerCase();

          const consumoDia = Number(consumoDiaPorProduto[p.id] || 0);

          const fazPrevisao = categoriaLower === "cozinha" && unidadeLower === "kg";
          const prevDias =
            fazPrevisao && consumoDia > 0 && emEstoque > 0 ? Math.floor(emEstoque / consumoDia) : null;

          return {
            ...p,
            compradoTotal,
            quantidade: emEstoque, // mantém o campo que sua UI já usa (saldo)
            valorTotal: valorTotalRestante,
            validade: validadeMaisProxima,

            consumoDiaKg: fazPrevisao ? consumoDia : null,
            prevTerminoDias: prevDias,
          };
        });

        const touros = normalizeTouros(tourosBase);
        lista = mesclarTourosNoEstoque(lista, touros);

        if (categoriaOpt?.value && categoriaOpt.value !== "Todos") {
          lista = lista.filter((p) => p.categoria === categoriaOpt.value);
        }

        setProdutos(lista);
      } catch (e) {
        console.error(e);
        setErro("Erro ao carregar estoque (Supabase).");
        setProdutos([]);
      } finally {
        setLoading(false);
      }
    },
    [categoriaSelecionada, tourosBase]
  );

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoriaSelecionada?.value]);

  useEffect(() => {
    onCountChange?.(produtos.length || 0);
  }, [produtos.length, onCountChange]);

  const produtosFiltrados = useMemo(() => {
    if (categoriaSelecionada?.value === "Todos") return produtos;
    return produtos.filter((p) => p.categoria === categoriaSelecionada.value);
  }, [produtos, categoriaSelecionada]);

  const colunas = useMemo(
    () => [
      "Nome Comercial",
      "Categoria",
      "Comprado",
      "Em estoque",
      "Unid.",
      "Validade",
      "Consumo/dia (dieta)",
      "Prev. término",
      "Alerta Estoque",
      "Alerta Validade",
      "Ação",
    ],
    []
  );

  /* ===================== CRUD PRODUTO ===================== */
  async function salvarNovoProduto(produtoUi) {
    const db = uiToDbProduto(produtoUi);

    const uid = await getAuthUid();

    let resp = await supabase
      .from("estoque_produtos")
      .insert({ ...db, user_id: uid })
      .select("id")
      .single();

    if (resp.error) {
      resp = await supabase
        .from("estoque_produtos")
        .insert({ ...db, eu_ia: uid })
        .select("id")
        .single();
    }

    if (resp.error) throw resp.error;
    return resp.data?.id;
  }

  async function salvarEdicaoProduto(id, produtoUi) {
    const db = uiToDbProduto(produtoUi);

    const { error } = await supabase.from("estoque_produtos").update(db).eq("id", id);
    if (error) throw error;
    return true;
  }

  async function excluirProduto(id) {
    const { error } = await supabase.from("estoque_produtos").delete().eq("id", id);
    if (error) throw error;
    return true;
  }

  /* ===================== LOTE (ENTRADA) ===================== */
  async function criarEntradaLote(produtoId, lote) {
    if (!lote) return;

    const quantidade = Number(lote.quantidade || 0);
    const valorTotal = Number(lote.valorTotal || 0);
    const validade = lote.validade ? toDateOnly(lote.validade) : null;

    if (!Number.isFinite(quantidade) || quantidade <= 0) return;

    const { data: loteCriado, error } = await supabase
      .from("estoque_lotes")
      .insert({
        produto_id: produtoId,
        data_entrada: toDateOnly(new Date()),
        validade,
        quantidade_inicial: quantidade,
        quantidade_atual: quantidade,
        valor_total: Number.isFinite(valorTotal) ? valorTotal : 0,
      })
      .select("id")
      .single();

    if (error) throw error;

    try {
      await supabase.from("estoque_movimentos").insert({
        produto_id: produtoId,
        lote_id: loteCriado?.id || null,
        tipo: "entrada",
        quantidade,
        valor_total: Number.isFinite(valorTotal) ? valorTotal : 0,
        data_movimento: toDateOnly(new Date()),
      });
    } catch (e) {
      console.warn("Movimentos não registrados (ok se ainda não implementado).", e);
    }

    try {
      await registrarCompraNoFinanceiro({
        produtoId,
        loteId: loteCriado?.id || null,
        quantidade,
        valorTotal: Number.isFinite(valorTotal) ? valorTotal : 0,
        validadeISO: validade,
      });
    } catch (e) {
      console.warn("Não foi possível registrar a compra no Financeiro (ok).", e);
    }
  }

  return (
    <section className="w-full py-6 font-sans">
      <div className="px-2 md:px-4 lg:px-6">
        <div
          className="mb-3"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "nowrap",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "nowrap" }}>
            <button
              className="botao-acao pequeno"
              style={{ whiteSpace: "nowrap" }}
              onClick={() => setMostrarCadastro(true)}
            >
              + Novo Produto
            </button>

            <button
              className="botao-cancelar pequeno"
              style={{ whiteSpace: "nowrap" }}
              onClick={() => setMostrarAjustes(true)}
            >
              Ajustes
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "nowrap" }}>
            <Select
              options={categoriasFixas}
              value={categoriaSelecionada}
              onChange={setCategoriaSelecionada}
              menuPortalTarget={document.body}
              styles={rsStylesCompact}
            />
          </div>
        </div>

        {erro && (
          <div className="mb-3 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-2 rounded">
            {erro}
          </div>
        )}

        <table className="tabela-padrao">
          <colgroup>
            <col style={{ width: 240 }} />
            <col style={{ width: 160 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 170 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 190 }} />
          </colgroup>

          <thead>
            <tr>
              {colunas.map((c, i) => (
                <th
                  key={c}
                  className={i === hoverCol ? "coluna-hover" : ""}
                  onMouseEnter={() => setHoverCol(i)}
                  onMouseLeave={() => setHoverCol(null)}
                  style={{ top: STICKY_OFFSET }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colunas.length}>
                  <div className="text-center py-6 text-[#1e3a8a]">Carregando…</div>
                </td>
              </tr>
            ) : produtosFiltrados.length === 0 ? (
              <tr>
                <td colSpan={colunas.length}>
                  <div className="text-center py-6 text-gray-500">Nenhum produto cadastrado.</div>
                </td>
              </tr>
            ) : (
              produtosFiltrados.map((p, idx) => {
                const est = alertaEstoque(p, minimos[p.categoria]);
                const val = alertaValidade(p.validade);
                const readOnly = !!p?.meta?.readOnly;

                return (
                  <tr key={p.id || p._virtualId || idx}>
                    {/* 0 Nome */}
                    <td
                      className={["coluna-limitada", hoverCol === 0 ? "coluna-hover" : ""].join(" ")}
                      title={p.nomeComercial || ""}
                    >
                      {p.nomeComercial || "—"}
                      {readOnly ? <span className="ml-2 text-[12px] text-gray-500">🔒</span> : null}
                    </td>

                    {/* 1 Categoria */}
                    <td className={hoverCol === 1 ? "coluna-hover" : ""} style={{ textAlign: "center" }}>
                      {p.categoria || "—"}
                    </td>

                    {/* 2 Comprado */}
                    <td className={hoverCol === 2 ? "coluna-hover" : ""} style={{ textAlign: "center" }}>
                      {formatQtd(p.compradoTotal)}
                    </td>

                    {/* 3 Em estoque */}
                    <td className={hoverCol === 3 ? "coluna-hover" : ""} style={{ textAlign: "center" }}>
                      {formatQtd(p.quantidade)}
                    </td>

                    {/* 4 Unid */}
                    <td className={hoverCol === 4 ? "coluna-hover" : ""} style={{ textAlign: "center" }}>
                      {p.unidade || "—"}
                    </td>

                    {/* 5 Validade */}
                    <td className={hoverCol === 5 ? "coluna-hover" : ""} style={{ textAlign: "center" }}>
                      {formatVal(p.validade)}
                    </td>

                    {/* 6 Consumo/dia (dieta) */}
                    <td className={hoverCol === 6 ? "coluna-hover" : ""} style={{ textAlign: "center", fontWeight: 800 }}>
                      {p.consumoDiaKg != null ? `${formatQtd(p.consumoDiaKg)} kg/d` : "—"}
                    </td>

                    {/* 7 Prev. término */}
                    <td className={hoverCol === 7 ? "coluna-hover" : ""} style={{ textAlign: "center", fontWeight: 800 }}>
                      {p.prevTerminoDias != null ? `${p.prevTerminoDias} d` : "—"}
                    </td>

                    {/* 8 Alerta Estoque */}
                    <td className={hoverCol === 8 ? "coluna-hover" : ""} style={{ textAlign: "center" }}>
                      <StatusPill {...est} />
                    </td>

                    {/* 9 Alerta Validade */}
                    <td className={hoverCol === 9 ? "coluna-hover" : ""} style={{ textAlign: "center" }}>
                      <StatusPill {...val} />
                    </td>

                    {/* 10 Ação */}
                    <td className={`coluna-acoes ${hoverCol === 10 ? "coluna-hover" : ""}`}>
                      {readOnly ? (
                        <span style={{ color: "#6b7280", fontWeight: 600 }}>—</span>
                      ) : (
                        <div className="botoes-tabela">
                          <button className="botao-editar" onClick={() => setEditar({ abrir: true, item: p })}>
                            Editar
                          </button>
                          <button className="botao-excluir" onClick={() => setProdutoParaExcluir(p)}>
                            Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* ===================== MODAIS ===================== */}

        <ModalNovoProduto
          open={mostrarCadastro}
          onClose={() => setMostrarCadastro(false)}
          onSaved={async (payload) => {
            try {
              setErro("");

              const { produto, lote } = splitPayload(payload);

              if (!produto?.nomeComercial || !produto?.categoria || !produto?.unidade) {
                setErro("Preencha Nome, Categoria e Unidade.");
                return;
              }

              const novoId = await salvarNovoProduto(produto);
              await criarEntradaLote(novoId, lote);

              setMostrarCadastro(false);
              await carregar(categoriaSelecionada);
            } catch (e) {
              console.error(e);
              setErro(e?.message ? String(e.message) : "Não foi possível salvar o produto.");
            }
          }}
        />

        <ModalNovoProduto
          open={editar.abrir}
          initial={editar.item}
          onClose={() => setEditar({ abrir: false, item: null })}
          onSaved={async (payload) => {
            try {
              setErro("");
              if (!editar?.item?.id) {
                setErro("Produto sem ID para editar.");
                return;
              }

              const { produto, lote } = splitPayload(payload);

              await salvarEdicaoProduto(editar.item.id, produto);
              await criarEntradaLote(editar.item.id, lote); // se vier lote no editar -> reposição (compra)

              setEditar({ abrir: false, item: null });
              await carregar(categoriaSelecionada);
            } catch (e) {
              console.error(e);
              setErro(e?.message ? String(e.message) : "Não foi possível salvar a edição.");
            }
          }}
        />

        {produtoParaExcluir && (
          <ModalSimples title="Confirmar exclusão" onClose={() => setProdutoParaExcluir(null)}>
            <div className="mb-3 text-[14px] text-[#374151]">
              Excluir <b>{produtoParaExcluir.nomeComercial}</b>?
            </div>

            <div className="flex justify-end gap-2">
              <button className="botao-cancelar pequeno" onClick={() => setProdutoParaExcluir(null)}>
                Cancelar
              </button>
              <button
                className="botao-excluir"
                onClick={async () => {
                  try {
                    setErro("");
                    if (!produtoParaExcluir?.id) {
                      setErro("Produto sem ID para excluir.");
                      return;
                    }
                    await excluirProduto(produtoParaExcluir.id);
                    setProdutoParaExcluir(null);
                    await carregar(categoriaSelecionada);
                  } catch (e) {
                    console.error(e);
                    setErro(e?.message ? String(e.message) : "Não foi possível excluir o produto.");
                  }
                }}
              >
                Excluir
              </button>
            </div>
          </ModalSimples>
        )}

        {mostrarAjustes && (
          <ModalAjustesEstoque
            open={mostrarAjustes}
            minimos={minimos}
            onChange={setMinimos}
            onClose={() => setMostrarAjustes(false)}
          />
        )}
      </div>
    </section>
  );
}

/* ===================== UI ===================== */
function StatusPill({ color, text }) {
  return (
    <span className="inline-flex items-center gap-2 font-bold" style={{ color }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
      {text}
    </span>
  );
}

/* ===================== MODAL SIMPLES ===================== */
function ModalSimples({ title, children, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={modalCard} onMouseDown={(e) => e.stopPropagation()}>
        <div style={modalHeader}>
          <span style={{ fontWeight: "bold" }}>{title}</span>
          <button className="px-2 text-white/90 hover:text-white" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/* ===================== HELPERS ===================== */
function alertaEstoque(p, min = 1) {
  const q = Number(p.quantidade || 0);
  if (q <= 0) return { text: "Insuficiente", color: "#dc2626" };
  if (q <= min) return { text: "Estoque baixo", color: "#d97706" };
  return { text: "OK", color: "#16a34a" };
}

function alertaValidade(v) {
  if (!v) return { text: "—", color: "#6b7280" };
  const d = new Date(v);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dd = new Date(d);
  dd.setHours(0, 0, 0, 0);
  const dias = Math.ceil((dd - hoje) / 86400000);

  if (dias < 0) return { text: "Vencido", color: "#dc2626" };
  if (dias <= 30) return { text: `Vence em ${dias}d`, color: "#d97706" };
  return { text: "OK", color: "#16a34a" };
}

function formatVal(v) {
  if (!v) return "—";
  const dt = new Date(v);
  return Number.isNaN(dt.getTime()) ? String(v) : dt.toLocaleDateString("pt-BR");
}

function formatQtd(v) {
  const n = Number(v || 0);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

/* ===================== ADAPTERS ===================== */
function dbToUiProduto(d) {
  return {
    id: d.id,
    nomeComercial: d.nome_comercial ?? "",
    categoria: d.categoria ?? "",
    unidade: d.unidade ?? "",
    apresentacao: d.apresentacao ?? "",

    tipoFarmacia: d.tipo_farmacia ?? "",
    carenciaLeiteDias: d.carencia_leite_dias ?? "",
    carenciaCarneDias: d.carencia_carne_dias ?? "",
    semCarenciaLeite: !!d.sem_carencia_leite,
    semCarenciaCarne: !!d.sem_carencia_carne,

    compradoTotal: 0,
    quantidade: 0,
    valorTotal: 0,
    validade: null,

    consumoDiaKg: null,
    prevTerminoDias: null,

    meta: {},
  };
}

function uiToDbProduto(p) {
  return {
    nome_comercial: String(p?.nomeComercial || "").trim(),
    categoria: String(p?.categoria || "").trim(),
    unidade: String(p?.unidade || "").trim(),
    apresentacao: String(p?.apresentacao || "").trim() || null,

    tipo_farmacia: String(p?.tipoFarmacia || "").trim() || null,
    carencia_leite_dias:
      p?.carenciaLeiteDias === "" || p?.carenciaLeiteDias == null ? null : Number(p.carenciaLeiteDias),
    carencia_carne_dias:
      p?.carenciaCarneDias === "" || p?.carenciaCarneDias == null ? null : Number(p.carenciaCarneDias),
    sem_carencia_leite: !!p?.semCarenciaLeite,
    sem_carencia_carne: !!p?.semCarenciaCarne,
  };
}

/* ===================== LOTES -> AGREGADOS ===================== */
function agregarLotesPorProduto(lotesDb) {
  const lotes = Array.isArray(lotesDb) ? lotesDb : [];
  const by = {};

  for (const l of lotes) {
    const pid = l.produto_id;
    if (!pid) continue;

    const qtdAtual = Number(l.quantidade_atual || 0);
    const qtdIni = Number(l.quantidade_inicial || 0);
    const valorTotalLote = Number(l.valor_total || 0);
    const unit = qtdIni > 0 ? valorTotalLote / qtdIni : 0;

    if (!by[pid]) {
      by[pid] = {
        compradoTotal: 0,
        emEstoque: 0,
        valorTotalRestante: 0,
        validadeMaisProxima: null,
      };
    }

    by[pid].compradoTotal += qtdIni;
    by[pid].emEstoque += qtdAtual;
    by[pid].valorTotalRestante += qtdAtual * unit;

    if (qtdAtual > 0 && l.validade) {
      const dt = new Date(l.validade);
      if (!Number.isNaN(dt.getTime())) {
        const atual = by[pid].validadeMaisProxima ? new Date(by[pid].validadeMaisProxima) : null;
        if (!atual || dt < atual) by[pid].validadeMaisProxima = dt.toISOString();
      }
    }
  }

  Object.keys(by).forEach((pid) => {
    by[pid].compradoTotal = Number(by[pid].compradoTotal || 0);
    by[pid].emEstoque = Number(by[pid].emEstoque || 0);
    by[pid].valorTotalRestante = Number(by[pid].valorTotalRestante || 0);
  });

  return by;
}

/* ===================== TOUROS (mock) ===================== */
function normalizeTouros(arr) {
  const data = Array.isArray(arr) ? arr : [];
  return data.map((t) => ({
    _virtualId: t.id,
    id: null,
    nomeComercial: t.nome || "Touro (Sêmen)",
    categoria: "Reprodução",
    compradoTotal: Number(t.doses ?? 0),
    quantidade: Number(t.doses ?? 0),
    unidade: "doses",
    valorTotal: Number(t.valorTotal ?? 0),
    apresentacao: "Sêmen (touro)",
    validade: t.validade || null,
    consumoDiaKg: null,
    prevTerminoDias: null,
    meta: { readOnly: true },
  }));
}

function mesclarTourosNoEstoque(estoque, touros) {
  const clean = (Array.isArray(estoque) ? estoque : []).map((p) => ({
    id: p.id,
    nomeComercial: p.nomeComercial,
    categoria: p.categoria,
    unidade: p.unidade || "un",

    compradoTotal: Number(p.compradoTotal ?? 0),
    quantidade: Number(p.quantidade ?? 0),
    valorTotal: Number(p.valorTotal ?? 0),
    apresentacao: p.apresentacao || null,
    validade: p.validade || null,

    consumoDiaKg: p.consumoDiaKg ?? null,
    prevTerminoDias: p.prevTerminoDias ?? null,

    tipoFarmacia: p.tipoFarmacia ?? "",
    carenciaLeiteDias: p.carenciaLeiteDias ?? "",
    carenciaCarneDias: p.carenciaCarneDias ?? "",
    semCarenciaLeite: !!p.semCarenciaLeite,
    semCarenciaCarne: !!p.semCarenciaCarne,

    meta: p.meta || {},
  }));

  return [...clean, ...(Array.isArray(touros) ? touros : [])].sort((a, b) =>
    String(a.nomeComercial || "").localeCompare(String(b.nomeComercial || ""))
  );
}
