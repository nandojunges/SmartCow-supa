// src/pages/Bezerras.jsx
import { useFazenda } from "../../context/FazendaContext";
import SelecioneFazenda from "../../components/SelecioneFazenda";

export default function Bezerras() {
  const { fazendaAtualId } = useFazenda();

  if (!fazendaAtualId) {
    return <SelecioneFazenda />;
  }

  return (
    <h1 style={{ fontSize: 24, fontWeight: 600 }}>
      Página BEZERRAS – em construção.
    </h1>
  );
}
