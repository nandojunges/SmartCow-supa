import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useFarmSelection } from "../hooks/useFarmSelection";
import { useFazenda } from "../context/FazendaContext";

const TXT_MUTED = "rgba(255,255,255,0.72)";

export default function FarmSwitcher({ style, readOnly = false }) {
  const { fazendaAtualId } = useFazenda();
  const [userId, setUserId] = useState(null);
  const [tipoConta, setTipoConta] = useState(null);
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef(null);
  const isAssistenteTecnico = tipoConta === "ASSISTENTE_TECNICO";
  const podeAutoSelecionar = tipoConta ? !isAssistenteTecnico : false;

  useEffect(() => {
    let isMounted = true;

    async function carregarUsuario() {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        if (import.meta.env.DEV) {
          console.warn("Erro ao carregar usuário:", error.message);
        }
        return;
      }

      const user = data?.user ?? null;
      if (!user) {
        return;
      }

      if (isMounted) {
        setUserId(user.id);
      }

      const { data: perfilData, error: perfilError } = await supabase
        .from("profiles")
        .select("tipo_conta")
        .eq("id", user.id)
        .maybeSingle();

      if (perfilError && import.meta.env.DEV) {
        console.warn("Erro ao carregar tipo de conta:", perfilError.message);
      }

      const tipoContaRaw =
        perfilData?.tipo_conta ??
        user.user_metadata?.tipo_conta ??
        user.user_metadata?.tipoConta;

      if (isMounted) {
        setTipoConta(tipoContaRaw ? String(tipoContaRaw).trim().toUpperCase() : null);
      }
    }

    carregarUsuario();

    return () => {
      isMounted = false;
    };
  }, []);

  const { fazendas, loading, selecionarFazenda } = useFarmSelection({
    userId,
    tipoConta,
    autoSelect: podeAutoSelecionar,
    persistSelection: podeAutoSelecionar,
    onSelect: (fazendaId) => {
      if (typeof window !== "undefined") {
        const queryClient = window.__SMARTCOW_QUERY_CLIENT__;
        if (queryClient?.invalidateQueries) {
          queryClient.invalidateQueries({ queryKey: ["fazenda", String(fazendaId)] });
        }
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("fazenda:changed", {
            detail: { fazendaId },
          })
        );
      }
    },
    onError: (error) => {
      if (import.meta.env.DEV) {
        console.warn("Erro ao carregar fazendas:", error?.message);
      }
    },
  });

  const fazendaAtiva = useMemo(() => {
    if (!fazendaAtualId) {
      return fazendas[0] ?? null;
    }
    return fazendas.find((fazenda) => String(fazenda.id) === String(fazendaAtualId)) ?? null;
  }, [fazendaAtualId, fazendas]);

  const nomeFazenda =
    fazendaAtiva?.nome ?? fazendaAtiva?.name ?? (loading ? "Carregando..." : "-");
  const temDropdown = fazendas.length > 1;

  useEffect(() => {
    if (!aberto) {
      return undefined;
    }

    function handleClick(event) {
      if (!containerRef.current?.contains(event.target)) {
        setAberto(false);
      }
    }

    function handleKey(event) {
      if (event.key === "Escape") {
        setAberto(false);
      }
    }

    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [aberto]);

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-flex", ...style }}>
      {readOnly ? (
        <span style={{ color: TXT_MUTED, fontSize: 11.5, fontWeight: 700, lineHeight: 1.2 }}>
          Fazenda: {nomeFazenda}
        </span>
      ) : (
        <>
          <button
            type="button"
            disabled={!temDropdown || loading}
            onClick={() => {
              if (temDropdown && !loading) {
                setAberto((prev) => !prev);
              }
            }}
            style={{
              border: "none",
              background: "transparent",
              color: TXT_MUTED,
              fontSize: 11.5,
              fontWeight: 700,
              cursor: temDropdown && !loading ? "pointer" : "default",
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              lineHeight: 1.2,
            }}
            aria-expanded={aberto}
            aria-haspopup={temDropdown ? "listbox" : undefined}
          >
            <span>Fazenda: {nomeFazenda}</span>
            {temDropdown ? (
              <span
                aria-hidden="true"
                style={{
                  transform: aberto ? "rotate(180deg)" : "none",
                  transition: "transform 0.12s ease",
                }}
              >
                ▾
              </span>
            ) : null}
          </button>

          {aberto && temDropdown ? (
            <div
              role="listbox"
              aria-label="Selecionar fazenda"
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0,
                minWidth: 200,
                background: "rgba(11,31,58,0.98)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                boxShadow: "0 10px 24px rgba(0,0,0,0.28)",
                padding: 6,
                zIndex: 80,
              }}
            >
              {fazendas.map((fazenda) => {
                const isAtiva = String(fazenda.id) === String(fazendaAtiva?.id ?? "");

                return (
                  <button
                    key={fazenda.id}
                    type="button"
                    onClick={async () => {
                      await selecionarFazenda(fazenda.id);
                      setAberto(false);
                    }}
                    style={{
                      width: "100%",
                      border: "none",
                      background: isAtiva ? "rgba(25,182,164,0.2)" : "transparent",
                      color: "rgba(255,255,255,0.9)",
                      fontWeight: isAtiva ? 800 : 600,
                      fontSize: 12.5,
                      padding: "8px 10px",
                      borderRadius: 8,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    {fazenda.nome ?? fazenda.name}
                  </button>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
