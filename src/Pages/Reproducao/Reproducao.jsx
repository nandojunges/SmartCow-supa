import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { withFazendaId } from "../../lib/fazendaScope";
import { useFazenda } from "../../context/FazendaContext";
import "../../styles/tabelaModerna.css";

export default function Reproducao() {
  const { fazendaAtualId } = useFazenda();
  const [animais, setAnimais] = useState([]);
  const [eventosReprodutivos, setEventosReprodutivos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [animalSelecionado, setAnimalSelecionado] = useState(null);

  const formatarData = (valor) => {
    if (!valor) return "—";
    const data = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(data.getTime())) return "—";
    return new Intl.DateTimeFormat("pt-BR").format(data);
  };

  const obterDataValida = (valor) => {
    if (!valor) return null;
    const data = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(data.getTime())) return null;
    return data;
  };

  const adicionarDias = (data, dias) => {
    if (!data) return null;
    const copia = new Date(data);
    copia.setDate(copia.getDate() + dias);
    return copia;
  };

  const obterResumoReprodutivo = (animal) => {
    const eventosAnimal = eventosReprodutivos.filter(
      (evento) => evento.animal_id === animal.id
    );
    const partos = eventosAnimal.filter(
      (evento) => evento.tipo_evento === "parto"
    );
    const inseminacoes = eventosAnimal.filter(
      (evento) => evento.tipo_evento === "inseminacao"
    );

    const ultimoPartoEvento = partos.reduce((maisRecente, atual) => {
      const dataAtual = obterDataValida(atual.data_evento);
      if (!dataAtual) return maisRecente;
      if (!maisRecente) return dataAtual;
      return dataAtual > maisRecente ? dataAtual : maisRecente;
    }, null);

    const ultimaIaEvento = inseminacoes.reduce((maisRecente, atual) => {
      const dataAtual = obterDataValida(atual.data_evento);
      if (!dataAtual) return maisRecente;
      if (!maisRecente) return dataAtual;
      return dataAtual > maisRecente ? dataAtual : maisRecente;
    }, null);

    const ultimoParto = ultimoPartoEvento || obterDataValida(animal.ultimo_parto);
    const ultimaIa = ultimaIaEvento || obterDataValida(animal.ultima_ia);

    const totalLactacoes = partos.length;

    const inseminacoesFiltradas = ultimoParto
      ? inseminacoes.filter((evento) => {
          const dataEvento = obterDataValida(evento.data_evento);
          return dataEvento && dataEvento >= ultimoParto;
        })
      : inseminacoes;

    const totalIAs = inseminacoesFiltradas.length;

    const del = ultimoParto
      ? Math.floor((Date.now() - ultimoParto.getTime()) / (1000 * 60 * 60 * 24))
      : "—";

    const previsaoParto = ultimaIa ? adicionarDias(ultimaIa, 280) : null;

    return {
      totalLactacoes,
      totalIAs,
      ultimaIa,
      ultimoParto,
      del,
      previsaoParto,
    };
  };

  useEffect(() => {
    let ativo = true;

    if (!fazendaAtualId) {
      setAnimais([]);
      setEventosReprodutivos([]);
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
          const listaAnimais = Array.isArray(data) ? data : [];
          setAnimais(listaAnimais);

          if (listaAnimais.length === 0) {
            setEventosReprodutivos([]);
            return;
          }

          const idsAnimais = listaAnimais
            .map((animal) => animal.id)
            .filter(Boolean);

          if (idsAnimais.length === 0) {
            setEventosReprodutivos([]);
            return;
          }

          const { data: dadosEventos, error: erroEventos } = await withFazendaId(
            supabase
              .from("eventos_reprodutivos")
              .select("animal_id, tipo_evento, data_evento")
              .in("animal_id", idsAnimais),
            fazendaAtualId
          );

          if (erroEventos) {
            throw erroEventos;
          }

          if (ativo) {
            setEventosReprodutivos(Array.isArray(dadosEventos) ? dadosEventos : []);
          }
        }
      } catch (err) {
        if (ativo) {
          setErro(err?.message || "Erro ao carregar animais.");
          setAnimais([]);
          setEventosReprodutivos([]);
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
              <col style={{ width: "160px" }} />
              <col style={{ width: "90px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "120px" }} />
              <col style={{ width: "140px" }} />
              <col style={{ width: "170px" }} />
              <col style={{ width: "180px" }} />
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
                  <span className="st-th-label">Idade (meses)</span>
                </th>
                <th>
                  <span className="st-th-label">Nº de lactações</span>
                </th>
                <th>
                  <span className="st-th-label">DEL</span>
                </th>
                <th>
                  <span className="st-th-label">Última IA</span>
                </th>
                <th>
                  <span className="st-th-label">Nº de IAs</span>
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
                    colSpan={12}
                    style={{ padding: 18, color: "#64748b", fontWeight: 700 }}
                  >
                    Selecione uma fazenda
                  </td>
                </tr>
              ) : carregando ? (
                <tr>
                  <td
                    colSpan={12}
                    style={{ padding: 18, color: "#64748b", fontWeight: 700 }}
                  >
                    Carregando...
                  </td>
                </tr>
              ) : erro ? (
                <tr>
                  <td
                    colSpan={12}
                    style={{ padding: 18, color: "#b91c1c", fontWeight: 700 }}
                  >
                    {erro}
                  </td>
                </tr>
              ) : animais.length === 0 ? (
                <tr>
                  <td
                    colSpan={12}
                    style={{ padding: 18, color: "#64748b", fontWeight: 700 }}
                  >
                    Nenhum animal encontrado...
                  </td>
                </tr>
              ) : (
                animais.map((animal, index) => {
                  const resumo = obterResumoReprodutivo(animal);

                  return (
                    <tr key={animal.id ?? index}>
                      <td>{animal.numero ?? "—"}</td>
                      <td>{animal.brinco ?? "—"}</td>
                      <td>{animal.categoria_atual ?? animal.categoria ?? "—"}</td>
                      <td>{animal.idade_meses ?? "—"}</td>
                      <td>{resumo.totalLactacoes}</td>
                      <td>{resumo.del}</td>
                      <td>{formatarData(resumo.ultimaIa)}</td>
                      <td>{resumo.totalIAs}</td>
                      <td>{formatarData(resumo.ultimoParto)}</td>
                      <td>{formatarData(resumo.previsaoParto)}</td>
                      <td>{animal.situacao_reprodutiva ?? "—"}</td>
                      <td className="st-td-center col-acoes">
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <button
                            type="button"
                            className="st-btn"
                            onClick={() =>
                              setAnimalSelecionado({ animal, resumo })
                            }
                          >
                            Manejo
                          </button>
                        </div>
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
                  Manejo reprodutivo — Nº {animalSelecionado.animal.numero ?? "—"}
                </h2>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p>
                    <strong>Última IA:</strong>{" "}
                    {formatarData(animalSelecionado.resumo.ultimaIa)}
                  </p>
                  <p>
                    <strong>DPP:</strong>{" "}
                    {formatarData(animalSelecionado.resumo.previsaoParto)}
                  </p>
                  <p>
                    <strong>Status reprodutivo:</strong>{" "}
                    {animalSelecionado.animal.situacao_reprodutiva ?? "—"}
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
            <div className="mt-6 flex flex-wrap gap-3">
              <button type="button" className="st-btn">
                Registrar IA
              </button>
              <button type="button" className="st-btn">
                Registrar DG
              </button>
              <button type="button" className="st-btn">
                Registrar Parto
              </button>
              <button type="button" className="st-btn">
                Registrar Secagem
              </button>
              <button type="button" className="st-btn">
                Protocolos
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
