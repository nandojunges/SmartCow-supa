// src/pages/ConsumoReposicao/ModalDieta.jsx
// ✅ Modal padrão SmartCow (React-Select em tudo que é seleção)
// - Busca lotes no Supabase (public.lotes)
// - Ao selecionar lote, busca quantidade de animais ATIVOS no lote (public.animais)
// - Ingredientes: busca produtos do estoque com categoria "Cozinha" (public.estoque_produtos)
// - Preço: tenta VIEW vw_dieta_ingredientes (se existir); fallback busca último movimento ENTRADA e extrai preço
// - Salva em: public.dietas + public.dietas_itens (snapshot de preços e custos)
// - ESC fecha | ↑/↓ navega qty | ENTER em qty adiciona linha
// - Quadro interno com margem/padding e campos alinhados

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/botoes.css";

/** ✅ Categoria usada no seu banco para ingredientes de dieta */
const CATEGORIA_INGREDIENTE = "cozinha"; // ilike (case-insensitive)

/** ✅ tipos que podem existir no seu banco */
const TIPOS_ENTRADA = ["ENTRADA", "entrada", "Entrada", "E", "e"];

/** =============== helpers preço / data =============== */
function safeNum(n) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function pickMostRecentRow(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;

  const getTime = (r) => {
    const raw = r?.created_at ?? r?.data ?? r?.dia ?? r?.updated_at ?? r?.inserted_at ?? null;
    const t = raw ? new Date(raw).getTime() : NaN;
    return Number.isFinite(t) ? t : 0;
  };

  let best = rows[0];
  let bestT = getTime(best);

  for (let i = 1; i < rows.length; i++) {
    const t = getTime(rows[i]);
    if (t > bestT) {
      best = rows[i];
      bestT = t;
    }
  }
  return best;
}

function extractUnitPriceFromMov(m) {
  if (!m) return 0;

  const direct =
    m?.valor_unitario_aplicado ??
    m?.valor_unitario ??
    m?.preco_unitario ??
    m?.preco ??
    null;

  if (direct != null && direct !== "") return safeNum(direct);

  const total = m?.valor_total ?? m?.total ?? null;
  const qtd = m?.quantidade ?? m?.qtd ?? null;

  const t = safeNum(total);
  const q = safeNum(qtd);

  if (q > 0 && t > 0) return t / q;
  return 0;
}

function parseNumBR(v) {
  if (v == null) return 0;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function formatBRL(n) {
  try {
    return (Number(n) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  } catch {
    return `R$ ${(Number(n) || 0).toFixed(2)}`;
  }
}

function formatDateBR(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function sameDayISO(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

/** ISO -> YYYY-MM-DD (para colunas DATE no Postgres) */
function isoToDateOnly(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** =================== Helpers do form =================== */
function normalizeInitial(v) {
  return {
    id: v?.id ?? null,
    lote_id: v?.lote_id ?? "",
    lote_nome: v?.lote_nome ?? "",
    numVacas: Number(v?.numVacas || v?.numvacas_snapshot || 0),
    data: v?.data || v?.dia || new Date().toISOString(),
    observacao: v?.observacao ?? "",
    ingredientes: Array.isArray(v?.ingredientes) ? v.ingredientes : [{ produto_id: "", quantidade: "" }],
  };
}

function withCosts(d, pricesMap) {
  const base = normalizeInitial(d);
  const numVacas = Number(base.numVacas || 0);

  const total = (base.ingredientes || []).reduce((acc, ing) => {
    const preco = ing?.produto_id ? safeNum(pricesMap?.[ing.produto_id]) : 0;
    const q = parseNumBR(ing?.quantidade);
    return acc + preco * q * numVacas;
  }, 0);

  return { ...base, custoTotal: total, custoVacaDia: numVacas ? total / numVacas : 0 };
}

/** =================== Componente =================== */
export default function ModalDieta({ title = "Cadastro de Dieta", value, onCancel, onSave }) {
  const wrapRef = useRef(null);

  // -------------------- lotes (Supabase) --------------------
  const [lotesDb, setLotesDb] = useState([]); // [{id, nome}]
  const [lotesLoading, setLotesLoading] = useState(false);

  const loadLotes = useCallback(async () => {
    setLotesLoading(true);
    const { data, error } = await supabase
      .from("lotes")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome", { ascending: true });

    if (!error) setLotesDb(Array.isArray(data) ? data : []);
    setLotesLoading(false);
  }, []);

  useEffect(() => {
    loadLotes();
  }, [loadLotes]);

  // -------------------- produtos (ingredientes) (Supabase) --------------------
  const [produtosCozinha, setProdutosCozinha] = useState([]);
  const [produtosLoading, setProdutosLoading] = useState(false);

  // { [produto_id]: valor_unitario }
  const [precosMap, setPrecosMap] = useState({});

  const loadProdutosIngredientes = useCallback(async () => {
    setProdutosLoading(true);

    const { data: produtos, error: eProd } = await supabase
      .from("estoque_produtos")
      .select("id, nome_comercial, categoria, unidade, apresentacao")
      .ilike("categoria", CATEGORIA_INGREDIENTE)
      .order("nome_comercial", { ascending: true });

    if (eProd) {
      console.error("Erro loadProdutosIngredientes (produtos):", eProd);
      setProdutosCozinha([]);
      setPrecosMap({});
      setProdutosLoading(false);
      return;
    }

    const list = Array.isArray(produtos) ? produtos : [];
    setProdutosCozinha(list);

    if (!list.length) {
      setPrecosMap({});
      setProdutosLoading(false);
      return;
    }

    // 2) Tenta via VIEW (se existir): vw_dieta_ingredientes
    let viewPrices = null;
    try {
      const { data: viewData, error: eView } = await supabase
        .from("vw_dieta_ingredientes")
        .select("id, preco_unitario")
        .in("id", list.map((p) => p.id));

      if (!eView && Array.isArray(viewData)) {
        const mp = {};
        for (const row of viewData) mp[row.id] = safeNum(row?.preco_unitario);
        viewPrices = mp;
      } else {
        viewPrices = null;
      }
    } catch {
      viewPrices = null;
    }

    if (viewPrices && Object.keys(viewPrices).length) {
      setPrecosMap(viewPrices);
      setProdutosLoading(false);
      return;
    }

    // 3) Fallback: movimentos ENTRADA
    const nextPrices = {};
    for (const p of list) {
      const { data: movs, error: eMov } = await supabase
        .from("estoque_movimentos")
        .select("*")
        .eq("produto_id", p.id)
        .in("tipo", TIPOS_ENTRADA)
        .limit(50);

      if (eMov) {
        console.warn("Erro estoque_movimentos para produto:", p?.nome_comercial, eMov);
        nextPrices[p.id] = 0;
        continue;
      }

      const last = pickMostRecentRow(movs);
      nextPrices[p.id] = extractUnitPriceFromMov(last);
    }

    setPrecosMap(nextPrices);
    setProdutosLoading(false);
  }, []);

  useEffect(() => {
    loadProdutosIngredientes();
  }, [loadProdutosIngredientes]);

  // -------------------- options (react-select) --------------------
  const loteOptions = useMemo(
    () => (lotesDb || []).map((l) => ({ value: l.id, label: l.nome })),
    [lotesDb]
  );

  const produtoOptions = useMemo(() => {
    return (produtosCozinha || []).map((p) => ({
      value: p.id,
      label: p.nome_comercial,
      meta: p,
    }));
  }, [produtosCozinha]);

  const dataOptions = useMemo(() => {
    const out = [];
    for (let i = 0; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const label = d.toLocaleDateString("pt-BR");
      out.push({ value: iso, label: i === 0 ? `${label} (Hoje)` : label });
    }
    return out;
  }, []);

  // -------------------- state do form --------------------
  const [form, setForm] = useState(() => withCosts(normalizeInitial(value), precosMap));
  const [numVacasLoading, setNumVacasLoading] = useState(false);

  useEffect(() => {
    setForm(withCosts(normalizeInitial(value), precosMap));
  }, [value, precosMap]);

  // -------------------- busca nº vacas do lote (ATUAL) --------------------
  const fetchNumVacasAtual = useCallback(async (loteId) => {
    if (!loteId) return 0;

    setNumVacasLoading(true);

    const { count, error } = await supabase
      .from("animais")
      .select("id", { count: "exact", head: true })
      .eq("ativo", true)
      .eq("lote_id", loteId);

    setNumVacasLoading(false);

    if (error) {
      console.error("Erro fetchNumVacasAtual:", error);
      return 0;
    }
    return Number(count || 0);
  }, []);

  // -------------------- setters --------------------
  const setLote = useCallback(
    async (loteId) => {
      const loteNome = (lotesDb || []).find((l) => l.id === loteId)?.nome || "";
      const nv = await fetchNumVacasAtual(loteId);

      setForm((f) =>
        withCosts(
          {
            ...f,
            lote_id: loteId,
            lote_nome: loteNome,
            numVacas: nv,
          },
          precosMap
        )
      );
    },
    [lotesDb, fetchNumVacasAtual, precosMap]
  );

  const setData = useCallback(
    (iso) => setForm((f) => withCosts({ ...f, data: iso }, precosMap)),
    [precosMap]
  );

  const setObs = useCallback((txt) => {
    setForm((f) => ({ ...f, observacao: txt }));
  }, []);

  const setIng = useCallback(
    (idx, campo, val) => {
      setForm((f) => {
        const arr = [...(f.ingredientes || [])];
        arr[idx] = { ...arr[idx], [campo]: val };
        return withCosts({ ...f, ingredientes: arr }, precosMap);
      });
    },
    [precosMap]
  );

  const addIng = useCallback(() => {
    setForm((f) => {
      const next = [...(f.ingredientes || []), { produto_id: "", quantidade: "" }];
      return withCosts({ ...f, ingredientes: next }, precosMap);
    });

    requestAnimationFrame(() => {
      const lastProdInput = wrapRef.current?.querySelector?.(".rs-prod-last__input input");
      lastProdInput?.focus?.();
    });
  }, [precosMap]);

  const rmIng = useCallback(
    (idx) => {
      setForm((f) => {
        const next = (f.ingredientes || []).filter((_, i) => i !== idx);
        return withCosts({ ...f, ingredientes: next }, precosMap);
      });
    },
    [precosMap]
  );

  // -------------------- teclado --------------------
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCancel?.();
        return;
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const inputs = wrapRef.current?.querySelectorAll?.('input[data-role="qty"]') || [];
        if (!inputs.length) return;

        const active = Array.from(inputs).findIndex((n) => n === document.activeElement);
        const dir = e.key === "ArrowDown" ? 1 : -1;
        const nextIdx = Math.max(0, Math.min(inputs.length - 1, active >= 0 ? active + dir : 0));

        inputs[nextIdx]?.focus();
        e.preventDefault();
        return;
      }

      if (e.key === "Enter") {
        const role = document.activeElement?.getAttribute?.("data-role") || "";
        if (role === "qty") {
          e.preventDefault();
          addIng();
        }
      }
    };

    window.addEventListener("keydown", onKey);

    requestAnimationFrame(() => {
      const first = wrapRef.current?.querySelector?.(".rs-lote__input input");
      first?.focus?.();
    });

    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, addIng]);

  // -------------------- selected values --------------------
  const selectedLote = useMemo(
    () => loteOptions.find((o) => o.value === form.lote_id) || null,
    [loteOptions, form.lote_id]
  );

  const selectedData = useMemo(() => {
    const found = dataOptions.find((o) => sameDayISO(o.value, form.data));
    return found || (form.data ? { value: form.data, label: formatDateBR(form.data) } : null);
  }, [dataOptions, form.data]);

  // -------------------- SALVAR NO BANCO --------------------
  const [saving, setSaving] = useState(false);

  const validateBeforeSave = useCallback(() => {
    if (!form.lote_id) return "Selecione um lote.";
    const dia = isoToDateOnly(form.data);
    if (!dia) return "Selecione uma data válida.";

    const ings = (form.ingredientes || []).filter((i) => i?.produto_id);
    if (!ings.length) return "Adicione ao menos 1 ingrediente.";

    for (const ing of ings) {
      const q = parseNumBR(ing.quantidade);
      if (q <= 0) return "Quantidade (kg/vaca) deve ser maior que 0.";
    }

    return null;
  }, [form]);

  const buildItensForDb = useCallback(
    (dietaId, uid) => {
      const numVacas = Number(form.numVacas || 0) || 0;

      return (form.ingredientes || [])
        .filter((i) => i?.produto_id)
        .map((ing) => {
          const produto_id = ing.produto_id;
          const quantidade_kg_vaca = parseNumBR(ing.quantidade);
          const preco_unitario_snapshot = safeNum(precosMap?.[produto_id]);
          const custo_parcial_snapshot = numVacas * quantidade_kg_vaca * preco_unitario_snapshot;

          return {
            user_id: uid, // ✅ evita 409 quando auth.uid() não chega no DEFAULT
            dieta_id: dietaId,
            produto_id,
            quantidade_kg_vaca,
            preco_unitario_snapshot,
            custo_parcial_snapshot,
          };
        });
    },
    [form, precosMap]
  );

  const handleSalvar = useCallback(async () => {
    const errMsg = validateBeforeSave();
    if (errMsg) return alert(errMsg);

    if (Number(form.numVacas || 0) <= 0) {
      const ok = window.confirm(
        "Este lote está com 0 vacas (ou não foi possível buscar). Deseja salvar mesmo assim?"
      );
      if (!ok) return;
    }

    setSaving(true);

    // ✅ garante sessão / uid para preencher user_id explicitamente
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess?.session?.user?.id;

    if (!uid) {
      alert("Sessão expirada (sem usuário autenticado). Faça login novamente.");
      setSaving(false);
      return;
    }

    const dia = isoToDateOnly(form.data);

    const payloadDieta = {
      user_id: uid, // ✅ evita dependência do DEFAULT auth.uid()
      lote_id: form.lote_id,
      dia,
      numvacas_snapshot: Number(form.numVacas || 0) || 0,
      custo_total: safeNum(form.custoTotal),
      custo_vaca_dia: safeNum(form.custoVacaDia),
      observacao: String(form.observacao || "").trim() || null,
    };

    try {
      // === EDITAR ===
      if (form.id) {
        const dietaId = form.id;

        // 1) update dieta (garante que pertence ao usuário)
        const { error: eUp } = await supabase
          .from("dietas")
          .update(payloadDieta)
          .eq("id", dietaId)
          .eq("user_id", uid);

        if (eUp) throw eUp;

        // 2) remove itens antigos (do usuário)
        const { error: eDel } = await supabase
          .from("dietas_itens")
          .delete()
          .eq("dieta_id", dietaId)
          .eq("user_id", uid);

        if (eDel) throw eDel;

        // 3) insere itens novos
        const itens = buildItensForDb(dietaId, uid);
        if (itens.length) {
          const { error: eInsItens } = await supabase.from("dietas_itens").insert(itens);
          if (eInsItens) throw eInsItens;
        }

        const saved = { ...payloadDieta, id: dietaId, ingredientes: form.ingredientes, data: form.data };
        onSave?.(saved);
        onCancel?.();
        setSaving(false);
        return;
      }

      // === NOVO ===
      // 1) cria dieta
      const { data: dietaRow, error: eIns } = await supabase
        .from("dietas")
        .insert(payloadDieta)
        .select("id")
        .single();

      if (eIns) throw eIns;

      const dietaId = dietaRow?.id;
      if (!dietaId) throw new Error("Falha ao obter id da dieta criada.");

      // 2) cria itens
      const itens = buildItensForDb(dietaId, uid);
      if (itens.length) {
        const { error: eInsItens } = await supabase.from("dietas_itens").insert(itens);
        if (eInsItens) {
          // rollback simples: apaga dieta (itens falharam)
          await supabase.from("dietas").delete().eq("id", dietaId).eq("user_id", uid);
          throw eInsItens;
        }
      }

      const saved = { ...payloadDieta, id: dietaId, ingredientes: form.ingredientes, data: form.data };
      onSave?.(saved);
      onCancel?.();
      setSaving(false);
    } catch (err) {
      console.error("Erro ao salvar dieta:", err);

      // ✅ mostra motivo real (409 / constraint / RLS / etc.)
      const msg =
        err?.message ||
        err?.error_description ||
        err?.details ||
        err?.hint ||
        (typeof err === "string" ? err : "Erro desconhecido");

      const extra = [
        err?.code ? `code: ${err.code}` : null,
        err?.details ? `details: ${err.details}` : null,
        err?.hint ? `hint: ${err.hint}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      alert(`Não foi possível salvar a dieta.\n\n${msg}${extra ? `\n\n${extra}` : ""}`);
      setSaving(false);
    }
  }, [form, validateBeforeSave, buildItensForDb, onSave, onCancel]);

  return (
    <ModalShell title={title} onClose={onCancel}>
      <div ref={wrapRef} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={innerFrame}>
          <div style={grid2}>
            <div>
              <div style={lbl}>Lote *</div>
              <Select
                value={selectedLote}
                onChange={(opt) => setLote(opt?.value || "")}
                options={loteOptions}
                placeholder={lotesLoading ? "Carregando lotes..." : "Selecione..."}
                isLoading={lotesLoading}
                styles={rsStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                components={{ IndicatorSeparator: null }}
                classNamePrefix="rs-lote"
              />

              <div style={subInfo}>
                Vacas no lote agora:{" "}
                <span style={subInfoStrong}>{numVacasLoading ? "carregando..." : Number(form.numVacas || 0) || 0}</span>
              </div>
            </div>

            <div>
              <div style={lbl}>Data</div>
              <Select
                value={selectedData}
                onChange={(opt) => setData(opt?.value || new Date().toISOString())}
                options={dataOptions}
                placeholder="Selecione..."
                styles={rsStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
                components={{ IndicatorSeparator: null }}
                classNamePrefix="rs-data"
              />
            </div>
          </div>

          <div style={{ marginTop: 14, ...sectionTitle }}>Ingredientes</div>

          <div style={ingHeader}>
            <div style={{ flex: 1 }}>Ingrediente</div>
            <div style={{ width: 160, textAlign: "center" }}>Qtd (kg/vaca)</div>
            <div style={{ width: 150, textAlign: "center" }}>Preço (R$)</div>
            <div style={{ width: 160, textAlign: "center" }}>Parcial (R$)</div>
            <div style={{ width: 44 }} />
          </div>

          {(form.ingredientes || []).map((ing, idx) => {
            const preco = ing?.produto_id ? safeNum(precosMap?.[ing.produto_id]) : 0;
            const q = parseNumBR(ing?.quantidade);
            const parcial = Number(form.numVacas || 0) * q * preco;

            const selectedProd = produtoOptions.find((o) => o.value === ing.produto_id) || null;

            const isLast = idx === (form.ingredientes || []).length - 1;
            const prefix = isLast ? "rs-prod-last" : `rs-prod-${idx}`;

            return (
              <div key={idx} style={ingRow}>
                <div style={{ flex: 1 }}>
                  <Select
                    value={selectedProd}
                    onChange={(opt) => setIng(idx, "produto_id", opt?.value || "")}
                    options={produtoOptions}
                    placeholder={produtosLoading ? "Carregando produtos..." : "Selecione o ingrediente..."}
                    isLoading={produtosLoading}
                    styles={rsStyles}
                    menuPortalTarget={document.body}
                    menuPosition="fixed"
                    components={{ IndicatorSeparator: null }}
                    classNamePrefix={prefix}
                    noOptionsMessage={() => (produtosLoading ? "Carregando..." : `Nenhum produto com categoria "Cozinha"`)}
                  />
                </div>

                <div style={{ width: 160 }}>
                  <input
                    data-role="qty"
                    inputMode="decimal"
                    value={ing.quantidade ?? ""}
                    onChange={(e) => setIng(idx, "quantidade", e.target.value)}
                    placeholder="0,0"
                    style={{ ...inp, textAlign: "center" }}
                    disabled={saving}
                  />
                </div>

                <div style={moneyCell}>{preco ? formatBRL(preco) : "—"}</div>
                <div style={moneyCell}>{parcial ? formatBRL(parcial) : "—"}</div>

                <button
                  type="button"
                  className="btn-excluir"
                  onClick={() => rmIng(idx)}
                  title="Remover ingrediente"
                  style={btnX}
                  disabled={saving}
                >
                  ×
                </button>
              </div>
            );
          })}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" className="botao-acao pequeno" onClick={addIng} disabled={saving}>
              + Ingrediente
            </button>

            <div style={kpisWrap}>
              <KpiMini label="Custo Total" value={formatBRL(form.custoTotal)} />
              <KpiMini label="Custo Vaca/dia" value={formatBRL(form.custoVacaDia)} />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={lbl}>Observação</div>
            <input
              value={form.observacao || ""}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Opcional..."
              style={inp}
              disabled={saving}
            />
          </div>

          <div style={footer}>
            <button type="button" className="botao-cancelar" onClick={onCancel} disabled={saving}>
              Cancelar
            </button>

            <button type="button" className="botao-acao" onClick={handleSalvar} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

/* =================== Shell do Modal =================== */
function ModalShell({ title, children, onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = prev);
  }, []);

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={card} onMouseDown={(e) => e.stopPropagation()}>
        <div style={topbar}>
          <div style={{ fontWeight: 800 }}>{title}</div>
          <button type="button" onClick={onClose} style={closeBtn} title="Fechar">
            ×
          </button>
        </div>
        <div style={body}>{children}</div>
      </div>
    </div>
  );
}

/* =================== KPI =================== */
function KpiMini({ label, value }) {
  return (
    <div style={kpiMini}>
      <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 900, color: "#111827" }}>{value}</div>
    </div>
  );
}

/* =================== React-Select styles =================== */
const rsStyles = {
  container: (base) => ({ ...base, width: "100%" }),
  control: (base, state) => ({
    ...base,
    minHeight: 44,
    height: 44,
    borderRadius: 12,
    borderColor: state.isFocused ? "#2563eb" : "#cbd5e1",
    boxShadow: state.isFocused ? "0 0 0 1px #2563eb" : "none",
    backgroundColor: "#fff",
    ":hover": { borderColor: "#2563eb" },
  }),
  valueContainer: (base) => ({ ...base, padding: "0 12px" }),
  input: (base) => ({ ...base, margin: 0, padding: 0 }),
  indicatorsContainer: (base) => ({ ...base, height: 44 }),
  placeholder: (base) => ({ ...base, color: "#6b7280" }),
  menuPortal: (base) => ({ ...base, zIndex: 999999 }),
};

/* =================== Estilos =================== */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.62)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 99999,
  padding: 14,
};

const card = {
  width: 980,
  maxWidth: "96vw",
  borderRadius: 18,
  overflow: "hidden",
  background: "#fff",
  boxShadow: "0 18px 55px rgba(0,0,0,0.35)",
  fontFamily: "Poppins, sans-serif",
};

const topbar = {
  height: 64,
  background: "#1e40af",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 18px",
  fontSize: 18,
};

const closeBtn = {
  width: 44,
  height: 44,
  borderRadius: 12,
  border: "none",
  background: "rgba(255,255,255,0.14)",
  color: "#fff",
  fontSize: 22,
  cursor: "pointer",
};

const body = {
  padding: 18,
  maxHeight: "78vh",
  overflow: "auto",
};

const innerFrame = {
  border: "1px solid #e5e7eb",
  borderRadius: 16,
  padding: 16,
  background: "#fff",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "1.2fr 0.8fr",
  gap: 14,
};

const lbl = {
  fontSize: 12,
  fontWeight: 800,
  color: "#374151",
  marginBottom: 6,
};

const subInfo = {
  marginTop: 8,
  fontSize: 12,
  color: "#475569",
  fontWeight: 800,
};

const subInfoStrong = {
  color: "#111827",
  fontWeight: 900,
};

const inp = {
  width: "100%",
  height: 44,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  outline: "none",
  fontSize: 14,
};

const sectionTitle = {
  fontWeight: 900,
  color: "#0f172a",
  fontSize: 14,
};

const ingHeader = {
  display: "flex",
  gap: 10,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#f8fafc",
  fontWeight: 800,
  color: "#334155",
  fontSize: 12,
  marginTop: 10,
};

const ingRow = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  padding: 10,
  borderRadius: 12,
  border: "1px solid #e5e7eb",
  background: "#fff",
  marginTop: 10,
};

const moneyCell = {
  width: 150,
  textAlign: "center",
  fontWeight: 900,
  color: "#111827",
};

const btnX = {
  width: 40,
  height: 40,
  padding: 0,
  borderRadius: 12,
  fontWeight: 900,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const footer = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 10,
  marginTop: 14,
  paddingTop: 14,
  borderTop: "1px solid #e5e7eb",
};

const kpisWrap = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
  justifyContent: "flex-end",
};

const kpiMini = {
  minWidth: 190,
  border: "1px solid #e5e7eb",
  background: "#fff",
  borderRadius: 14,
  padding: "10px 12px",
};
