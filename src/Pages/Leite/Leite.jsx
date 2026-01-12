// src/pages/Leite.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/tabelaModerna.css";

export default function Leite() {
  const [animais, setAnimais] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [loteAviso, setLoteAviso] = useState("");
  const [editingLoteId, setEditingLoteId] = useState(null);

  const LOTE_FIELD = "lote_id";
  const LOTE_TABLE = "lotes";

  const carregarAnimais = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from("animais")
      .select("id, numero, brinco, situacao_produtiva, ativo, lote_id")
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
        await Promise.all([carregarAnimais(user.id), carregarLotes(user.id)]);
      } catch (e) {
        console.error("Erro ao carregar leite:", e);
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
  }, [carregarAnimais, carregarLotes]);

  const loteOptions = useMemo(() => {
    const baseOptions = (lotes || []).map((lote) => {
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
      const valorAtual = animal?.[LOTE_FIELD];
      if (valorAtual == null || valorAtual === "") return "Sem lote";
      return lotesById[valorAtual] || "Sem lote";
    },
    [LOTE_FIELD, lotesById]
  );

  const handleSetLote = useCallback(
    async (animal, option) => {
      if (!animal?.id) return;
      const loteId = option?.value ?? null;
      const valorAnterior = animal[LOTE_FIELD] ?? null;

      setAnimais((prev) =>
        prev.map((item) =>
          item.id === animal.id ? { ...item, [LOTE_FIELD]: loteId } : item
        )
      );
      setLoteAviso("");

      const { error: updateErr } = await supabase
        .from("animais")
        .update({ [LOTE_FIELD]: loteId })
        .eq("id", animal.id);

      if (updateErr) {
        setAnimais((prev) =>
          prev.map((item) =>
            item.id === animal.id ? { ...item, [LOTE_FIELD]: valorAnterior } : item
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
      setEditingLoteId(null);
    },
    [LOTE_FIELD, carregarAnimais]
  );

  return (
    <section className="w-full">
      {erro && <div className="st-alert st-alert--danger">{erro}</div>}
      {loteAviso && <div className="st-alert st-alert--warning">{loteAviso}</div>}

      <div className="st-table-container">
        <div className="st-table-wrap">
          <table className="st-table st-table--darkhead">
            <colgroup>
              <col style={{ width: "45%" }} />
              <col style={{ width: "35%" }} />
              <col style={{ width: "20%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>Animal</th>
                <th>Lote</th>
                <th className="st-td-center">Situação</th>
              </tr>
            </thead>
            <tbody>
              {!carregando && animais.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 18, color: "#64748b", fontWeight: 700 }}>
                    Nenhum animal cadastrado ainda.
                  </td>
                </tr>
              )}

              {animais.map((animal) => {
                const sitProd = animal.situacao_produtiva || "—";
                const isSemLote = !animal[LOTE_FIELD];

                return (
                  <tr key={animal.id}>
                    <td>
                      <div className="st-animal">
                        <span className="st-animal-num">{animal.numero ?? "—"}</span>
                        <div className="st-animal-main">
                          <div className="st-animal-title">
                            Brinco {animal.brinco || "—"}
                          </div>
                          <div className="st-animal-sub">
                            <span>{animal.id}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ overflow: "visible", paddingLeft: 12, paddingRight: 12 }}>
                      {editingLoteId === animal.id ? (
                        <Select
                          autoFocus
                          menuIsOpen
                          menuPortalTarget={typeof document !== "undefined" ? document.body : null}
                          menuPosition="fixed"
                          menuShouldBlockScroll
                          styles={selectStylesCompact}
                          options={loteOptions}
                          value={resolveSelectedLote(animal)}
                          placeholder="Selecionar lote…"
                          onChange={(option) => handleSetLote(animal, option)}
                          onBlur={() => setEditingLoteId(null)}
                          isClearable
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingLoteId(animal.id)}
                          title="Clique para alterar o lote"
                          className={`st-pill ${isSemLote ? "st-pill--mute" : "st-pill--info"}`}
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
                          {resolveLoteLabel(animal)}
                        </button>
                      )}
                    </td>
                    <td className="st-td-center">
                      {sitProd === "—" ? "—" : (
                        <span className="st-pill st-pill--info">
                          {sitProd === "lactante" ? "LAC" : sitProd}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {carregando && <div className="st-loading">Carregando...</div>}
    </section>
  );
}
