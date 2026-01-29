// src/pages/Inicio.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useFazenda } from "../../context/FazendaContext";
import {
  ensureActiveFazenda,
  getActiveFazendaId,
  listFazendasForUser,
} from "../../lib/fazendaHelpers";

export default function Inicio() {
  const navigate = useNavigate();
  const { fazendaAtualId, setFazendaAtualId } = useFazenda();
  const [fazendas, setFazendas] = useState([]);
  const [tipoConta, setTipoConta] = useState("PRODUTOR");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function carregarFazendas() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session ?? null;
        if (!session?.user?.id) {
          return;
        }

        const tipoContaRaw =
          session?.user?.user_metadata?.tipo_conta ??
          session?.user?.user_metadata?.tipoConta ??
          session?.user?.user_metadata?.tipo;

        if (!tipoContaRaw) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("tipo_conta")
            .eq("id", session.user.id)
            .maybeSingle();
          if (isMounted) {
            setTipoConta(
              profileData?.tipo_conta
                ? String(profileData.tipo_conta).trim().toUpperCase()
                : "PRODUTOR"
            );
          }
        } else if (isMounted) {
          setTipoConta(String(tipoContaRaw).trim().toUpperCase());
        }

        const lista = await listFazendasForUser(session);
        if (!isMounted) {
          return;
        }
        setFazendas(lista);

        const ensuredId = ensureActiveFazenda(lista);
        const currentId = fazendaAtualId ?? getActiveFazendaId();
        const resolvedId = ensuredId ?? currentId;
        if (resolvedId && String(resolvedId) !== String(fazendaAtualId ?? "")) {
          setFazendaAtualId(resolvedId);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Erro ao carregar fazendas no início:", error?.message);
        }
      } finally {
        if (isMounted) {
          setCarregando(false);
        }
      }
    }

    carregarFazendas();

    return () => {
      isMounted = false;
    };
  }, [fazendaAtualId, setFazendaAtualId]);

  const isProdutor = tipoConta === "PRODUTOR";
  const mostrarAvisoSemFazenda = !carregando && isProdutor && fazendas.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>
        Página INÍCIO – em construção.
      </h1>
      {mostrarAvisoSemFazenda && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            border: "1px solid rgba(15, 23, 42, 0.1)",
            background: "rgba(15, 23, 42, 0.03)",
            maxWidth: 520,
          }}
        >
          <p style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>
            Nenhuma fazenda encontrada.
          </p>
          <p style={{ margin: "6px 0 12px", color: "#475569", fontSize: 13 }}>
            Cadastre sua primeira fazenda para começar a usar o sistema.
          </p>
          <button
            type="button"
            onClick={() => navigate("/ajustes")}
            style={{
              borderRadius: 10,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 700,
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            Criar fazenda
          </button>
        </div>
      )}
    </div>
  );
}
