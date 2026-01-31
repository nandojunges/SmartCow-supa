export default function BlockHeaderVisit({ data, onChange }) {
  const handleChange = (field) => (event) => {
    onChange({
      ...data,
      [field]: event.target.value,
    });
  };

  return (
    <div className="report-block__grid">
      <label>
        Título
        <input
          type="text"
          value={data.titulo}
          onChange={handleChange("titulo")}
        />
      </label>
      <label>
        Fazenda
        <input
          type="text"
          value={data.fazenda}
          onChange={handleChange("fazenda")}
        />
      </label>
      <label>
        Data
        <input
          type="date"
          value={data.data}
          onChange={handleChange("data")}
        />
      </label>
      <label>
        Técnico
        <input
          type="text"
          value={data.tecnico}
          onChange={handleChange("tecnico")}
        />
      </label>
    </div>
  );
}
