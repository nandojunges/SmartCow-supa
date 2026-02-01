import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useFazenda } from "../../context/FazendaContext";
import "../../styles/tabelaModerna.css";

export default function Reproducao() {
  const { fazendaAtualId } = useFazenda();
  const [registros, setRegistros] = useState([]);
  const [eventosRepro, setEventosRepro] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [carregandoEventos, setCarregandoEventos] = useState(false);
  const [erro, setErro] = useState("");
  const [animalSelecionado, setAnimalSelecionado] = useState(null);

  const formatarData = (valor) => {
    if (valor === null || valor === undefined) return "—";
    const data = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(data.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR").format(data);
  };

  const obterValor = (registro, campos, fallback = "—") => {
    for (const campo of campos) {
      const valor = registro?.[campo];
      if (valor !== null && valor !== undefined && valor !== "") return valor;
    }
    return fallback;
  };

  useEffect(() => {
    let ativo = true;

    if (!fazendaAtualId) {
      setRegistros([]);
      setEventosRepro([]);
      setErro("");
      setCarregando(false);
      return () => {
        ativo = false;
      };
    }

    const carregarTabela = async () => {
      setCarregando(true);
      setErro("");

      try {
        const { data, error } = await supabase
          .from("v_repro_tabela")
          .select("*")
          .eq("fazenda_id", fazendaAtualId)
          .order("numero", { ascending: true });

        if (error) {
          throw error;
        }

        if (ativo) {
          const lista = Array.isArray(data) ? data : [];
          setRegistros(lista);
        }
      } catch (err) {
        if (ativo) {
          setErro(err?.message || "Erro ao carregar reprodução.");
          setRegistros([]);
          setEventosRepro([]);
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    };

    carregarTabela();

    return () => {
      ativo = false;
    };
  }, [fazendaAtualId]);

  const fetchTimeline = async (animalId) => {
    const { data, error } = await supabase
      .from("repro_eventos")
      .select("*")
      .eq("animal_id", animalId)
      .order("data_evento", { ascending: false });

    if (error) {
      throw error;
    }

    return Array.isArray(data) ? data : [];
  };

  useEffect(() => {
    if (!animalSelecionado?.animalId) {
      setEventosRepro([]);
      setCarregandoEventos(false);
      return undefined;
    }

    let ativo = true;
    setCarregandoEventos(true);

    const carregarEventos = async () => {
      try {
        const data = await fetchTimeline(animalSelecionado.animalId);

        if (ativo) {
          setEventosRepro(data);
        }
      } catch (err) {
        if (ativo) {
          setEventosRepro([]);
        }
      } finally {
        if (ativo) {
          setCarregandoEventos(false);
        }
      }
    };

    carregarEventos();

    return () => {
      ativo = false;
    };
  }, [animalSelecionado]);

  useEffect(() => {
    if (!animalSelecionado) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setAnimalSelecionado(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [animalSelecionado]);

  return (
    <section className="w-full">
      <div className="st-table-container">
        <div className="st-table-wrap">
          <table className="st-table st-table--darkhead">
            <colgroup>
              <col style={{ width: "90px" }} />
              <col style={{ width: "110px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "180px" }} />
              <col style={{ width: "160px" }} />
              <col style={{ width: "140px" }} />
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
                  <span className="st-th-label">Idade em meses</span>
                </th>
                <th>
                  <span className="st-th-label">Número de lactações</span>
                </th>
                <th>
                  <span className="st-th-label">Dias em lactação</span>
                </th>
                <th>
                  <span className="st-th-label">Última IA</span>
                </th>
                <th>
                  <span className="st-th-label">Número de IAs na lactação</span>
                </th>
                <th>
                  <span className="st-th-label">Número de IAs total</span>
                </th>
                <th>
                  <span className="st-th-label">Último parto</span>
                </th>
                <th>
                  <span className="st-th-label">Previsão de parto</span>
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
                    colSpan={13}
                    style={{ padding: 18, color: "#64748b", fontWeight: 700 }}
                  >
                    Selecione uma fazenda
                  </td>
                </tr>
              ) : carregando ? (
                <tr>
                  <td
                    colSpan={13}
                    style={{ padding: 18, color: "#64748b", fontWeight: 700 }}
                  >
                    Carregando...
                  </td>
                </tr>
              ) : erro ? (
                <tr>
                  <td
                    colSpan={13}
                    style={{ padding: 18, color: "#b91c1c", fontWeight: 700 }}
                  >
                    {erro}
                  </td>
                </tr>
              ) : registros.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    style={{ padding: 18, color: "#64748b", fontWeight: 700 }}
                  >
                    Nenhum registro encontrado...
                  </td>
                </tr>
              ) : (
                registros.map((registro, index) => {
                  const animalId =
                    registro.animal_id ?? registro.id ?? registro.animalId ?? null;

                  return (
                    <tr key={animalId ?? index}>
                      <td>{obterValor(registro, ["numero"])}</td>
                      <td>{obterValor(registro, ["brinco"])}</td>
                      <td>{obterValor(registro, ["categoria"])}</td>
                      <td>{obterValor(registro, ["idade_meses"])}</td>
                      <td>
                        {obterValor(registro, ["numero_lactacoes", "lactacoes"])}
                      </td>
                      <td>
                        {obterValor(registro, ["del"])}
                      </td>
                      <td>
                        {formatarData(registro.ultima_ia)}
                      </td>
                      <td>
                        {obterValor(registro, ["numero_ias_lactacao"])}
                      </td>
                      <td>
                        {obterValor(registro, ["numero_ias_total"])}
                      </td>
                      <td>
                        {formatarData(registro.ultimo_parto)}
                      </td>
                      <td>
                        {formatarData(registro.previsao_parto)}
                      </td>
                      <td>
                        {obterValor(registro, ["status_reprodutivo"])}
                      </td>
                      <td className="st-td-center col-acoes">
                        <button
                          type="button"
                          className="st-btn"
                          onClick={() => setAnimalSelecionado({ registro, animalId })}
                        >
                          Manejo
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {animalSelecionado && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Manejo reprodutivo — Nº{" "}
                  {obterValor(animalSelecionado.registro, ["numero"])}
                </h2>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>
                    <strong>Última IA:</strong>{" "}
                    {formatarData(animalSelecionado.registro.ultima_ia)}
                  </p>
                  <p>
                    <strong>DPP:</strong>{" "}
                    {formatarData(animalSelecionado.registro.previsao_parto)}
                  </p>
                  <p>
                    <strong>Status reprodutivo:</strong>{" "}
                    {obterValor(animalSelecionado.registro, [
                      "status_reprodutivo",
                    ])}
                  </p>
                  <p>
                    <strong>Eventos registrados:</strong>{" "}
                    {carregandoEventos ? "Carregando..." : eventosRepro.length}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                onClick={() => setAnimalSelecionado(null)}
              >
                Fechar
              </button>
            </div>
            <div className="mt-6 text-sm text-slate-600">
              Em breve: registro de IA, DG, protocolos e observações neste painel.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
