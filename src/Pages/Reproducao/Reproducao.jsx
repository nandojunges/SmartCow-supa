import "../../styles/tabelaModerna.css";

export default function Reproducao() {
  const animais = [];

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
              {animais.length === 0 ? (
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
                    <td>{animal.categoria ?? "—"}</td>
                    <td>{animal.idade ?? "—"}</td>
                    <td>{animal.numero_lactacoes ?? "—"}</td>
                    <td>{animal.del ?? "—"}</td>
                    <td>{animal.ultima_ia ?? "—"}</td>
                    <td>{animal.numero_ias ?? "—"}</td>
                    <td>{animal.ultimo_parto ?? "—"}</td>
                    <td>{animal.status_reprodutivo ?? "—"}</td>
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
