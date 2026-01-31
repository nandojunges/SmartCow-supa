export default function BlockActionsChecklist({ data, onChange }) {
  const handleToggle = (id) => {
    const nextItems = data.items.map((item) =>
      item.id === id ? { ...item, done: !item.done } : item
    );
    onChange({ ...data, items: nextItems });
  };

  const handleTextChange = (id, value) => {
    const nextItems = data.items.map((item) =>
      item.id === id ? { ...item, text: value } : item
    );
    onChange({ ...data, items: nextItems });
  };

  const handleAdd = () => {
    const nextItems = [
      ...data.items,
      { id: `a-${Date.now()}`, text: "Novo item", done: false },
    ];
    onChange({ ...data, items: nextItems });
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
        <div key={item.id} className="report-block__list-item">
          <input
            type="checkbox"
            checked={item.done}
            onChange={() => handleToggle(item.id)}
          />
          <input
            type="text"
            value={item.text}
            onChange={(event) => handleTextChange(item.id, event.target.value)}
          />
          <button
            type="button"
            className="sc-btn-chip"
            onClick={() => handleRemove(item.id)}
          >
            🗑️
          </button>
        </div>
      ))}
      <button type="button" className="sc-btn-chip" onClick={handleAdd}>
        + Adicionar item
      </button>
    </div>
  );
}
