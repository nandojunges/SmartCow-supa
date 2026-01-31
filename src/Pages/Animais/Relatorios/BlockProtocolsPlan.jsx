export default function BlockProtocolsPlan({ data, onChange }) {
  const handleChangeField = (id, field, value) => {
    const nextItems = data.items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    );
    onChange({ ...data, items: nextItems });
  };

  const handleAdd = () => {
    onChange({
      ...data,
      items: [
        ...data.items,
        {
          id: `p-${Date.now()}`,
          nome: "Novo protocolo",
          grupo: "",
          observacao: "",
        },
      ],
    });
  };

  const handleRemove = (id) => {
    onChange({
      ...data,
      items: data.items.filter((item) => item.id !== id),
    });
  };

  return (
    <div className="report-block__list">
      {data.items.map((item) => (
        <div key={item.id} className="report-block__grid">
          <label>
            Protocolo
            <input
              type="text"
              value={item.nome}
              onChange={(event) =>
                handleChangeField(item.id, "nome", event.target.value)
              }
            />
          </label>
          <label>
            Grupo/Alvo
            <input
              type="text"
              value={item.grupo}
              onChange={(event) =>
                handleChangeField(item.id, "grupo", event.target.value)
              }
            />
          </label>
          <label>
            Observação
            <input
              type="text"
              value={item.observacao}
              onChange={(event) =>
                handleChangeField(item.id, "observacao", event.target.value)
              }
            />
          </label>
          <button
            type="button"
            className="sc-btn-chip"
            onClick={() => handleRemove(item.id)}
          >
            Remover
          </button>
        </div>
      ))}
      <button type="button" className="sc-btn-chip" onClick={handleAdd}>
        + Adicionar protocolo
      </button>
    </div>
  );
}
