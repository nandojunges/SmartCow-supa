export default function BlockRichText({ data, onChange }) {
  return (
    <label className="report-block__grid">
      Conclusão/Observações
      <textarea
        rows={6}
        value={data.text}
        onChange={(event) => onChange({ ...data, text: event.target.value })}
      />
    </label>
  );
}
