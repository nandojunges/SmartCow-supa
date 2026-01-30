// src/pages/Saude.jsx
import { useFazenda } from "../../context/FazendaContext";
import SelecioneFazenda from "../../components/SelecioneFazenda";

export default function Saude() {
  const { fazendaAtualId } = useFazenda();

  if (!fazendaAtualId) {
    return <SelecioneFazenda />;
  }

  return (
    <h1 style={{ fontSize: 24, fontWeight: 600 }}>
      Página SAÚDE – em construção.
    </h1>
  );
}
