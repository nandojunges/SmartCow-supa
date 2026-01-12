// src/pages/ConsumoReposicao/Lotes.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { supabase } from "../../lib/supabaseClient";

import "../../styles/tabelamoderna.css";
import "../../styles/botoes.css";

import { ModalLoteCadastro, ModalLoteInfo, ModalConfirmarExclusao } from "./ModalLote";

const STICKY_OFFSET = 48;

/* ===================== helpers (map modal <-> banco) ===================== */
// Banco usa: nivel_produtivo
// Modal usa: nivelProducao
function dbToUiLote(row) {
  if (!row) return row;
  return {
    ...row,
    nivelProducao: row.nivel_produtivo ?? "",
    numVacas: Number(row.num_animais ?? 0),
  };
}

function uiToDbPayload(form) {
  if (!form) return form;

  // limpa campos dependentes (banco exige nivel_produtivo NULL se não for lactação)
  const funcao = form.funcao || "Outro";

  const payload = {
    nome: String(form.nome || "").trim(),
    funcao,
    descricao: String(form.descricao || "").trim() || null,
    ativo: !!form.ativo,
    nivel_produtivo: null,
  };

  if (funcao === "Lactação") {
    payload.nivel_produtivo = String(form.nivelProducao || form.nivel_produtivo || "").trim() || null;
  }

  return payload;
}

export default function Lotes() {
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [hoverCol, setHoverCol] = useState(null);
  const [cad, setCad] = useState({ open: false, index: null, lote: null });
  const [info, setInfo] = useState(null);
  const [excluirId, setExcluirId] = useState(null);

  const colunas = useMemo(
    () => ["Nome", "Nº de Vacas", "Função", "Nível Produtivo", "Status", "Ação"],
    []
  );

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro("");

    // View que você criou: v_lotes_com_contagem
    const { data, error } = await supabase
      .from("v_lotes_com_contagem")
      .select("id,nome,funcao,nivel_produtivo,descricao,ativo,num_animais,created_at,updated_at")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar lotes:", error);
      setErro("Não foi possível carregar os lotes. Verifique suas permissões (RLS) e tente novamente.");
      setLotes([]);
      setLoading(false);
      return;
    }

    setLotes((data || []).map(dbToUiLote));
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirCadastro = () =>
    setCad({
      open: true,
      index: null,
      lote: {
        id: null,
        nome: "",
        funcao: "Lactação",
        nivelProducao: "",
        descricao: "",
        ativo: true,
        numVacas: 0,
      },
    });

  const abrirEdicao = (i) => {
    const item = lotes[i];
    if (!item) return;
    setCad({ open: true, index: i, lote: JSON.parse(JSON.stringify(item)) });
  };

  /* ===================== CRUD SUPABASE ===================== */
  const salvarBanco = async (loteFinal) => {
    const nome = String(loteFinal?.nome || "").trim();
    const funcao = String(loteFinal?.funcao || "").trim();

    if (!nome || !funcao) return alert("Preencha os campos obrigatórios.");
    if (funcao === "Lactação" && !String(loteFinal?.nivelProducao || "").trim())
      return alert("Informe o nível produtivo.");

    setLoading(true);
    setErro("");

    const payload = uiToDbPayload(loteFinal);

    try {
      if (loteFinal?.id) {
        const { error } = await supabase.from("lotes").update(payload).eq("id", loteFinal.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lotes").insert(payload);
        if (error) throw error;
      }

      setCad({ open: false, index: null, lote: null });
      await carregar();
    } catch (e) {
      console.error("Erro ao salvar lote:", e);
      setErro("Não foi possível salvar o lote. Confira os campos e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const alternarAtivoBanco = async (loteId, ativoAtual) => {
    if (!loteId) return;
    setLoading(true);
    setErro("");

    try {
      const { error } = await supabase.from("lotes").update({ ativo: !ativoAtual }).eq("id", loteId);
      if (error) throw error;
      await carregar();
    } catch (e) {
      console.error("Erro ao alternar ativo:", e);
      setErro("Não foi possível alterar o status. Verifique permissões (RLS).");
      setLoading(false);
    }
  };

  const confirmarExclusaoBanco = async () => {
    if (!excluirId) return;

    setLoading(true);
    setErro("");

    try {
      const { error } = await supabase.from("lotes").delete().eq("id", excluirId);
      if (error) throw error;

      setExcluirId(null);
      await carregar();
    } catch (e) {
      console.error("Erro ao excluir lote:", e);
      setErro("Não foi possível excluir o lote. Se houver animais vinculados, o lote será removido e o lote_id fica null.");
      setLoading(false);
    }
  };

  return (
    <section style={{ width: "100%", padding: "24px 0" }}>
      <div style={{ padding: "0 12px" }}>
        <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 8 }}>
          <button className="botao-acao pequeno" onClick={abrirCadastro} disabled={loading}>
            + Cadastrar Lote
          </button>
          <div />
        </div>

        {erro && (
          <div
            style={{
              marginBottom: 12,
              fontSize: 13,
              color: "#92400e",
              background: "#fffbeb",
              border: "1px solid #fcd34d",
              padding: "10px 12px",
              borderRadius: 8,
            }}
          >
            {erro}
          </div>
        )}

        <table className="tabela-padrao">
          <colgroup>
            <col style={{ width: 220 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 170 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 170 }} />
          </colgroup>

          <thead>
            <tr>
              {colunas.map((c, i) => (
                <th
                  key={c}
                  className={hoverCol === i ? "coluna-hover" : ""}
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
                  <div style={{ textAlign: "center", color: "#1e3a8a", padding: "22px 0" }}>
                    Carregando…
                  </div>
                </td>
              </tr>
            ) : lotes.length === 0 ? (
              <tr>
                <td colSpan={colunas.length}>
                  <div style={{ textAlign: "center", color: "#4b5563", padding: "22px 0" }}>
                    Nenhum lote cadastrado.
                  </div>
                </td>
              </tr>
            ) : (
              lotes.map((l, i) => (
                <tr key={l.id || i}>
                  <td className={hoverCol === 0 ? "coluna-hover" : ""} title={l.nome || ""}>
                    {l.nome || "—"}
                  </td>

                  <td className={hoverCol === 1 ? "coluna-hover" : ""}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <span>{typeof l.numVacas === "number" ? l.numVacas : 0}</span>
                      <button
                        className="botao-editar"
                        style={{ padding: "2px 10px", height: 28 }}
                        title="Informações do lote"
                        onClick={() => setInfo(l)}
                      >
                        ℹ️
                      </button>
                    </div>
                  </td>

                  <td className={hoverCol === 2 ? "coluna-hover" : ""} title={l.funcao || ""}>
                    {l.funcao || "—"}
                  </td>

                  <td className={hoverCol === 3 ? "coluna-hover" : ""} title={l.nivelProducao || ""}>
                    {l.funcao === "Lactação" ? l.nivelProducao || "—" : "—"}
                  </td>

                  <td className={hoverCol === 4 ? "coluna-hover" : ""}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 28,
                        padding: "0 14px",
                        borderRadius: 999,
                        fontSize: 14,
                        fontWeight: 800,
                        background: "#fff",
                        border: `1.5px solid ${l.ativo ? "#86efac" : "#e5e7eb"}`,
                        color: l.ativo ? "#065f46" : "#374151",
                      }}
                    >
                      {l.ativo ? "Ativo" : "Inativo"}
                    </span>
                  </td>

                  <td className="coluna-acoes">
                    <div className="botoes-tabela">
                      <button className="botao-editar" onClick={() => abrirEdicao(i)}>
                        Editar
                      </button>

                      <button
                        className="btn-registrar"
                        onClick={() => alternarAtivoBanco(l.id, l.ativo)}
                      >
                        {l.ativo ? "Inativar" : "Ativar"}
                      </button>

                      <button className="btn-excluir" onClick={() => setExcluirId(l.id)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {cad.open && (
          <ModalLoteCadastro
            title={cad.index != null ? "✏️ Editar Lote" : "➕ Cadastro de Lote"}
            initialValue={cad.lote}
            onClose={() => setCad({ open: false, index: null, lote: null })}
            onCancel={() => setCad({ open: false, index: null, lote: null })}
            onSave={(payload) => salvarBanco(payload)}
          />
        )}

        {info && <ModalLoteInfo lote={info} onClose={() => setInfo(null)} />}

        {excluirId && (
          <ModalConfirmarExclusao
            title="Confirmar exclusão"
            onClose={() => setExcluirId(null)}
            onCancel={() => setExcluirId(null)}
            onConfirm={confirmarExclusaoBanco}
          />
        )}
      </div>
    </section>
  );
}
