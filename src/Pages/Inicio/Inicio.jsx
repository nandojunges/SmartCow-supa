// src/pages/Inicio.jsx
import { useFazenda } from "../../context/FazendaContext";
import SelecioneFazenda from "../../components/SelecioneFazenda";

export default function Inicio() {
  const { fazendaAtualId } = useFazenda();

  if (!fazendaAtualId) {
    return <SelecioneFazenda />;
  }

  return (
    <h1 style={{ fontSize: 24, fontWeight: 600 }}>
      Página INÍCIO – em construção.
    </h1>
  );
}
