import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { withFazendaId } from "../../lib/fazendaScope";
import { useFazenda } from "../../context/FazendaContext";
import "../../styles/tabelaModerna.css";

export default function Reproducao() {
  const { fazendaAtualId } = useFazenda();
  const [animais, setAnimais] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    if (!fazendaAtualId) {
      setAnimais([]);
      setErro("");
      setCarregando(false);
      return () => {
        ativo = false;
      };
    }

    const carregarAnimais = async () => {
      setCarregando(true);
      setErro("");

      try {
        const { data, error } = await withFazendaId(
          supabase
            .from("animais")
            .select(
              `
              id,
              numero,
              brinco,
              categoria_atual,
              categoria,
              idade_meses,
              ultimo_parto,
              ultima_ia,
              situacao_reprodutiva
            `
            ),
          fazendaAtualId
        )
          .eq("ativo", true)
          .eq("sexo", "femea")
          .order("numero", { ascending: true });

        if (error) {
          throw error;
        }

        if (ativo) {
          setAnimais(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (ativo) {
          setErro(err?.message || "Erro ao carregar animais.");
          setAnimais([]);
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    };

    carregarAnimais();

    return () => {
      ativo = false;
    };
  }, [fazendaAtualId]);

  return (
    <section className="w-full">
      <div className="st-table-container">
        <div className="st-table-wrap">
          <table className="st-table st-table--darkhead">
            <colgroup>
              <col style={{ width: "90px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "150px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "130px" }} />
              <col style={{ width: "200px" }} />
              <col style={{ width: "220px" }} />
            </colgroup>
            <thead>
              <tr>
                <th>
                  <span className="st-th-label">Número</span>
                </th>
                <th>
                  <span className="st-th-label">Brinco</span>
                </th>
                <th>
                  <span className="st-th-label">Categoria</span>
                </th>
                <th>
                  <span className="st-th-label">Idade</span>
                </th>
                <th>
                  <span className="st-th-label">Nº de lactações</span>
                </th>
                <th>
                  <span className="st-th-label">DEL (dias em lactação)</span>
                </th>
                <th>
                  <span className="st-th-label">Última IA</span>
                </th>
                <th>
                  <span className="st-th-label">Nº de IAs (lactação atual)</span>
                </th>
                <th>
                  <span className="st-th-label">Último parto</span>
                </th>
                <th>
                  <span className="st-th-label">Status reprodutivo</span>
                </th>
                <th className="st-td-center col-acoes">
                  <span className="st-th-label">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {!fazendaAtualId ? (
                <tr>
                  <td
                    colSpan={11}
                    style={{ padding: 18, color: "#64748b", fontWeight: 700 }}
                  >
                    Selecione uma fazenda
                  </td>
                </tr>
              ) : carregando ? (
                <tr>
                  <td
                    colSpan={11}
                    style={{ padding: 18, color: "#64748b", fontWeight: 700 }}
                  >
                    Carregando...
                  </td>
                </tr>
              ) : erro ? (
                <tr>
                  <td
                    colSpan={11}
                    style={{ padding: 18, color: "#b91c1c", fontWeight: 700 }}
                  >
                    {erro}
                  </td>
                </tr>
              ) : animais.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    style={{ padding: 18, color: "#64748b", fontWeight: 700 }}
                  >
                    Nenhum animal encontrado...
                  </td>
                </tr>
              ) : (
                animais.map((animal, index) => (
                  <tr key={animal.id ?? index}>
                    <td>{animal.numero ?? "—"}</td>
                    <td>{animal.brinco ?? "—"}</td>
                    <td>{animal.categoria_atual ?? animal.categoria ?? "—"}</td>
                    <td>{animal.idade_meses ?? "—"}</td>
                    <td>—</td>
                    <td>—</td>
                    <td>{animal.ultima_ia ?? "—"}</td>
                    <td>—</td>
                    <td>{animal.ultimo_parto ?? "—"}</td>
                    <td>{animal.situacao_reprodutiva ?? "—"}</td>
                    <td className="st-td-center col-acoes">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <button
                          type="button"
                          className="st-btn"
                          onClick={() => {}}
                        >
                          Registrar IA
                        </button>
                        <button
                          type="button"
                          className="st-btn"
                          onClick={() => {}}
                        >
                          Registrar DG
                        </button>
                        <button
                          type="button"
                          className="st-btn"
                          onClick={() => {}}
                        >
                          Abrir ficha
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
