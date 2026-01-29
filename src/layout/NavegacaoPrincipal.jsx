// src/layout/NavegacaoPrincipal.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import StatusConexao from "../components/StatusConexao";
import { useFazenda } from "../context/FazendaContext";

const ABAS_BASE = [
  { id: "inicio",     label: "Início",            title: "Página inicial" },
  { id: "animais",    label: "Animais",           title: "Plantel e fichas" },
  { id: "bezerras",   label: "Bezerras",          title: "Cria e recria" },
  { id: "reproducao", label: "Reprodução",        title: "IATF, IA e DG" },
  { id: "leite",      label: "Leite",             title: "Controle leiteiro" },
  { id: "saude",      label: "Saúde",             title: "Sanitário e manejo" },
  { id: "consumo",    label: "Consumo/Reposição", title: "Estoque e consumo" },
  { id: "financeiro", label: "Financeiro",        title: "Custos e receitas" },
  { id: "calendario", label: "Calendário",        title: "Agenda e alertas" },
  { id: "ajustes",    label: "Ajustes",           title: "Configurações" },
];

const ABAS_TECNICO = [{ id: "tecnico", label: "Fazendas", title: "Fazendas autorizadas" }];

function useAbaAtiva(pathname, abas) {
  const seg = pathname.split("/")[1] || abas[0]?.id || "inicio";
  return abas.some((a) => a.id === seg) ? seg : abas[0]?.id || "inicio";
}

export default function NavegacaoPrincipal({ tipoConta }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { fazendaAtivaId, clearFazendaAtiva } = useFazenda();
  const [tipoContaPerfil, setTipoContaPerfil] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function carregarPerfil() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.warn("Erro ao carregar usuário:", authError.message);
        return;
      }

      const userId = authData?.user?.id;
      if (!userId) {
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("tipo_conta")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.warn("Erro ao carregar perfil:", error.message);
        return;
      }

      if (isMounted) {
        setTipoContaPerfil(data?.tipo_conta ?? null);
      }
    }

    carregarPerfil();

    return () => {
      isMounted = false;
    };
  }, []);

  const tipoContaAtual = tipoContaPerfil ?? tipoConta;
  const isAssistenteTecnico =
    String(tipoContaAtual ?? "").trim().toUpperCase() === "ASSISTENTE_TECNICO";
  const usarMenuTecnico =
    isAssistenteTecnico && !fazendaAtivaId && pathname.startsWith("/tecnico");
  const abas = usarMenuTecnico ? ABAS_TECNICO : ABAS_BASE;
  const abaAtiva = useAbaAtiva(pathname, abas);

  // ===== PALETA “AgTech premium” =====
  const NAV_BG = "#0B1F3A";           // navy profundo
  const ACCENT = "#19B6A4";           // teal (agtech)
  const TXT = "rgba(255,255,255,0.92)";
  const TXT_MUTED = "rgba(255,255,255,0.72)";

  const ativa = abas.find((a) => a.id === abaAtiva);

  return (
    <header
      style={{
        width: "100%",
        position: "sticky",
        top: 0,
        zIndex: 60,
        background: NAV_BG,
        borderBottom: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 10px 26px rgba(0,0,0,0.22)",
        overflow: "visible", // evita qualquer clipping visual
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 16px",
        }}
      >
        {/* Marca / contexto mínimo (sem barra extra) */}
        <div style={{ display: "flex", flexDirection: "column", minWidth: 180 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusConexao />
            <span
              style={{
                color: TXT,
                fontWeight: 950,
                letterSpacing: 0.2,
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              SmartCow
            </span>
            {isAssistenteTecnico && fazendaAtivaId && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: 999,
                  background: "rgba(25,182,164,0.18)",
                  color: TXT,
                  border: "1px solid rgba(25,182,164,0.4)",
                  textTransform: "uppercase",
                }}
              >
                Modo Consultor
              </span>
            )}
          </div>

          <span
            style={{
              marginLeft: 20,
              marginTop: 3,
              fontSize: 11.5,
              color: TXT_MUTED,
              fontWeight: 750,
              lineHeight: 1.2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 240,
            }}
            title={`${ativa?.label || ""} · ${ativa?.title || ""}`}
          >
            {ativa?.label} · {ativa?.title}
          </span>
        </div>

        {/* Tabs ERP (sem contorno externo; underline interno não “corta”) */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            flex: 1,
            paddingBottom: 2,
            scrollbarWidth: "none",
          }}
        >
          <style>{`nav::-webkit-scrollbar{height:0px;}`}</style>

          {abas.map((aba) => {
            const isAtiva = abaAtiva === aba.id;

            return (
              <button
                key={aba.id}
                type="button"
                onClick={() => navigate(`/${aba.id}`)}
                title={aba.title}
                style={{
                  border: "none",
                  background: isAtiva ? "rgba(255,255,255,0.06)" : "transparent",
                  cursor: "pointer",

                  // área vertical suficiente: não “corta” nada visualmente
                  padding: "9px 10px",
                  lineHeight: 1,

                  color: isAtiva ? TXT : TXT_MUTED,
                  fontWeight: isAtiva ? 950 : 820,
                  fontSize: 13.5,
                  letterSpacing: 0.15,
                  whiteSpace: "nowrap",

                  borderRadius: 10,

                  // indicador interno (profissional e nunca sofre clipping)
                  boxShadow: isAtiva ? `inset 0 -3px 0 ${ACCENT}` : "none",

                  outline: "none",
                  transition:
                    "background 0.12s ease, color 0.12s ease, box-shadow 0.12s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isAtiva) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (!isAtiva) e.currentTarget.style.background = "transparent";
                }}
              >
                {aba.label}
              </button>
            );
          })}
        </nav>

        {/* Sair (ghost, menos chamativo, combina com paleta) */}
        <button
          onClick={async () => {
            if (isAssistenteTecnico) {
              if (fazendaAtivaId) {
                clearFazendaAtiva();
                navigate("/tecnico");
                return;
              }
              clearFazendaAtiva();
              await supabase.auth.signOut();
              if (typeof localStorage !== "undefined") {
                localStorage.clear();
              }
              if (typeof sessionStorage !== "undefined") {
                sessionStorage.clear();
              }
              return;
            }
            await supabase.auth.signOut();
            if (typeof localStorage !== "undefined") {
              localStorage.clear();
            }
            if (typeof sessionStorage !== "undefined") {
              sessionStorage.clear();
            }
          }}
          title={
            isAssistenteTecnico
              ? fazendaAtivaId
                ? "Sair da fazenda"
                : "Sair do sistema"
              : "Sair do sistema"
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 10px",
            borderRadius: 10,

            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            color: "rgba(255,255,255,0.90)",

            cursor: "pointer",
            fontWeight: 900,
            whiteSpace: "nowrap",

            transition:
              "background 0.12s ease, border-color 0.12s ease, transform 0.12s ease, color 0.12s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(220,38,38,0.14)";
            e.currentTarget.style.borderColor = "rgba(220,38,38,0.35)";
            e.currentTarget.style.color = "rgba(255,255,255,0.96)";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
            e.currentTarget.style.color = "rgba(255,255,255,0.90)";
            e.currentTarget.style.transform = "translateY(0px)";
          }}
        >
          {/* ícone logout inline */}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M10 7V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M15 12H3m0 0 3-3m-3 3 3 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Sair
        </button>
      </div>
    </header>
  );
}
