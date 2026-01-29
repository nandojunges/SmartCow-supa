// src/layout/NavegacaoPrincipal.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import StatusConexao from "../components/StatusConexao";
import { useFazenda } from "../context/FazendaContext";
import {
  ensureActiveFazenda,
  listFazendasForUser,
  setActiveFazendaId,
} from "../lib/fazendaHelpers";

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
  const { fazendaAtualId, setFazendaAtualId, clearFazendaAtualId } = useFazenda();
  const [tipoContaPerfil, setTipoContaPerfil] = useState(null);
  const [fazendas, setFazendas] = useState([]);
  const [carregandoFazendas, setCarregandoFazendas] = useState(true);

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

  useEffect(() => {
    let isMounted = true;

    async function carregarFazendas() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session ?? null;
        if (!session?.user?.id) {
          return;
        }

        const lista = await listFazendasForUser(session);
        if (!isMounted) {
          return;
        }

        setFazendas(lista);

        const ensuredId = ensureActiveFazenda(lista);
        if (ensuredId && String(ensuredId) !== String(fazendaAtualId ?? "")) {
          setFazendaAtualId(ensuredId);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Erro ao carregar fazendas no header:", error?.message);
        }
      } finally {
        if (isMounted) {
          setCarregandoFazendas(false);
        }
      }
    }

    carregarFazendas();

    return () => {
      isMounted = false;
    };
  }, [fazendaAtualId, setFazendaAtualId]);

  const fazendaAtiva = useMemo(() => {
    if (!fazendas.length) {
      return null;
    }
    return (
      fazendas.find((fazenda) => String(fazenda.id) === String(fazendaAtualId ?? "")) ??
      fazendas[0] ??
      null
    );
  }, [fazendaAtualId, fazendas]);

  const tipoContaAtual = tipoContaPerfil ?? tipoConta;
  const isAssistenteTecnico =
    String(tipoContaAtual ?? "").trim().toUpperCase() === "ASSISTENTE_TECNICO";
  const isModoConsultor = isAssistenteTecnico && Boolean(fazendaAtualId);
  const usarMenuTecnico = isAssistenteTecnico && !fazendaAtualId;
  const abasBase = isModoConsultor
    ? ABAS_BASE.filter((aba) => aba.id !== "ajustes")
    : ABAS_BASE;
  const abas = usarMenuTecnico ? ABAS_TECNICO : abasBase;
  const abaAtiva = useAbaAtiva(pathname, abas);

  // ===== PALETA “AgTech premium” =====
  const NAV_BG = "#0B1F3A";           // navy profundo
  const ACCENT = "#19B6A4";           // teal (agtech)
  const TXT = "rgba(255,255,255,0.92)";
  const TXT_MUTED = "rgba(255,255,255,0.72)";

  const ativa = abas.find((a) => a.id === abaAtiva);
  const mostrarDropdown = fazendas.length >= 2;

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
            {!carregandoFazendas && fazendaAtiva && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: TXT_MUTED,
                    textTransform: "uppercase",
                    letterSpacing: 0.4,
                  }}
                >
                  Fazenda:
                </span>
                {mostrarDropdown ? (
                  <div style={{ position: "relative", display: "inline-flex" }}>
                    <select
                      aria-label="Selecionar fazenda"
                      value={fazendaAtiva?.id ?? ""}
                      onChange={(event) => {
                        const nextId = event.target.value;
                        setActiveFazendaId(nextId);
                        setFazendaAtualId(nextId);
                        window.dispatchEvent(new Event("fazenda:changed"));
                      }}
                      style={{
                        appearance: "none",
                        background: "rgba(255,255,255,0.12)",
                        border: "1px solid rgba(255,255,255,0.3)",
                        color: TXT,
                        fontWeight: 800,
                        fontSize: 12,
                        borderRadius: 10,
                        padding: "4px 26px 4px 10px",
                        cursor: "pointer",
                        maxWidth: 180,
                      }}
                    >
                      {fazendas.map((fazenda) => (
                        <option key={fazenda.id} value={fazenda.id}>
                          {fazenda.nome || `Fazenda ${fazenda.id}`}
                        </option>
                      ))}
                    </select>
                    <span
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        pointerEvents: "none",
                        color: TXT,
                        fontSize: 10,
                      }}
                    >
                      ▼
                    </span>
                  </div>
                ) : (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: TXT,
                      maxWidth: 180,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={fazendaAtiva?.nome || `Fazenda ${fazendaAtiva?.id}`}
                  >
                    {fazendaAtiva?.nome || `Fazenda ${fazendaAtiva?.id}`}
                  </span>
                )}
              </div>
            )}
            {isAssistenteTecnico && fazendaAtualId && (
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
              if (fazendaAtualId) {
                clearFazendaAtualId();
                navigate("/tecnico");
                return;
              }
              clearFazendaAtualId();
              await supabase.auth.signOut();
              if (typeof localStorage !== "undefined") {
                localStorage.clear();
              }
              if (typeof sessionStorage !== "undefined") {
                sessionStorage.clear();
              }
              navigate("/login");
              return;
            }
            await supabase.auth.signOut();
            if (typeof localStorage !== "undefined") {
              localStorage.clear();
            }
            if (typeof sessionStorage !== "undefined") {
              sessionStorage.clear();
            }
            navigate("/login");
          }}
          title={
            isAssistenteTecnico
              ? fazendaAtualId
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
