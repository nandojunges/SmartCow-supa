import { useMemo, useState } from "react";
import "../../styles/tabelaModerna.css";

const SUB_ABAS = [
  { id: "visaoGeral", label: "Visão Geral" },
  { id: "protocolos", label: "Protocolos" },
  { id: "cadastro", label: "Cadastro" },
  { id: "relatorios", label: "Relatórios" },
  { id: "inseminacoes", label: "Inseminações" },
];

export default function Reproducao() {
  const [abaAtiva, setAbaAtiva] = useState("visaoGeral");
  const animais = [];

  const contadores = useMemo(
    () => ({
      visaoGeral: animais.length,
      protocolos: 0,
      cadastro: 0,
      relatorios: 0,
      inseminacoes: 0,
    }),
    [animais.length]
  );

  return (
    <section className="w-full">
      <div
        style={{
          display: "flex",
          gap: 20,
          padding: "4px 6px 0",
          borderBottom: "1px solid #e5e7eb",
          marginBottom: 8,
        }}
      >
        {SUB_ABAS.map((aba) => {
          const active = abaAtiva === aba.id;

          return (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              style={{
                appearance: "none",
                background: active ? "rgba(20,184,166,0.10)" : "transparent",
                border: "1px solid",
                borderColor: active ? "rgba(20,184,166,0.35)" : "transparent",
                padding: "8px 12px 10px",
                borderRadius: 10,
                fontSize: 14,
                fontWeight: active ? 800 : 650,
                color: active ? "#0f766e" : "#334155",
                cursor: "pointer",
                position: "relative",
                outline: "none",
                transition:
                  "background 160ms ease, border-color 160ms ease, transform 120ms ease",
              }}
              onMouseDown={(event) =>
                (event.currentTarget.style.transform = "translateY(1px)")
              }
              onMouseUp={(event) =>
                (event.currentTarget.style.transform = "translateY(0px)")
              }
              onMouseLeave={(event) =>
                (event.currentTarget.style.transform = "translateY(0px)")
              }
              onFocus={(event) => {
                event.currentTarget.style.boxShadow =
                  "0 0 0 3px rgba(20,184,166,0.25)";
              }}
              onBlur={(event) => {
                event.currentTarget.style.boxShadow = "none";
              }}
            >
              {aba.label}
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 999,
                  background: active
                    ? "rgba(15,118,110,0.12)"
                    : "rgba(148,163,184,0.18)",
                  color: active ? "#0f766e" : "#64748b",
                }}
              >
                {contadores[aba.id]}
              </span>
              {active && (
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    right: 10,
                    bottom: -2,
                    height: 2,
                    borderRadius: 2,
                    background: "#14b8a6",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ paddingTop: 2 }}>
        <div style={{ display: "block" }} aria-hidden={abaAtiva !== "visaoGeral"}>
          <div className="st-table-container">
            <div className="st-table-wrap">
              <table className="st-table st-table--darkhead">
                <colgroup>
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "30%" }} />
                  <col style={{ width: "14%" }} />
                </colgroup>
                <thead>
                  <tr>
                    <th className="col-animal st-col-animal">
                      <span className="st-th-label">Animal</span>
                    </th>
                    <th>
                      <span className="st-th-label">Status reprodutivo</span>
                    </th>
                    <th>
                      <span className="st-th-label">Última IA</span>
                    </th>
                    <th>
                      <span className="st-th-label">Previsão / Observação</span>
                    </th>
                    <th className="st-td-center col-acoes">
                      <span className="st-th-label">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {animais.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        style={{ padding: 18, color: "#64748b", fontWeight: 700 }}
                      >
                        Nenhum animal encontrado...
                      </td>
                    </tr>
                  ) : (
                    animais.map((animal, index) => (
                      <tr key={animal.id ?? index}>
                        <td className="col-animal st-col-animal">
                          <div className="st-animal">
                            <span className="st-animal-num">
                              {animal.numero ?? "—"}
                            </span>
                            <div className="st-animal-main">
                              <div className="st-animal-title">
                                {animal.nome ?? "Animal"}
                              </div>
                              <div className="st-animal-sub">
                                <span>
                                  {animal.brinco ? `Brinco ${animal.brinco}` : "—"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>{animal.status_reprodutivo ?? "—"}</td>
                        <td>{animal.ultima_ia ?? "—"}</td>
                        <td className="st-td-wrap">
                          {animal.previsao ?? animal.observacao ?? "—"}
                        </td>
                        <td className="st-td-center col-acoes">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button type="button" className="st-btn">
                              Registrar IA
                            </button>
                            <button type="button" className="st-btn">
                              DG
                            </button>
                            <button type="button" className="st-btn">
                              Ficha
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
        </div>
      </div>
    </section>
  );
}
