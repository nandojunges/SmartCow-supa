// src/pages/Animais/Plantel.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import "../../styles/tabelaModerna.css";
import FichaAnimal from "./FichaAnimal/FichaAnimal";

/* ========= helpers de data ========= */
// aceita "2023-01-01" ou "dd/mm/aaaa"
function parseDateFlexible(s) {
  if (!s) return null;
  if (typeof s !== "string") s = String(s);

  // ISO: yyyy-mm-dd
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = +m[1];
    const mo = +m[2];
    const d = +m[3];
    const dt = new Date(y, mo - 1, d);
    return Number.isFinite(+dt) ? dt : null;
  }

  // BR: dd/mm/aaaa
  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const d = +m[1];
    const mo = +m[2];
    const y = +m[3];
    const dt = new Date(y, mo - 1, d);
    return Number.isFinite(+dt) ? dt : null;
  }

  return null;
}

function idadeTexto(nascimento) {
  const dt = parseDateFlexible(nascimento);
  if (!dt) return "—";

  const hoje = new Date();
  let meses =
    (hoje.getFullYear() - dt.getFullYear()) * 12 +
    (hoje.getMonth() - dt.getMonth());

  if (hoje.getDate() < dt.getDate()) meses -= 1;
  if (meses < 0) meses = 0;

  const anos = Math.floor(meses / 12);
  const rem = meses % 12;
  return `${anos}a ${rem}m`;
}

/**
 * DEL (Dias em Lactação)
 * - Se não houver secagem -> dias entre parto e hoje
 */
function delFromParto(partoStr, secagemOpcional) {
  const parto = parseDateFlexible(partoStr);
  if (!parto) return "—";

  if (secagemOpcional) {
    const sec = parseDateFlexible(secagemOpcional);
    if (sec && sec > parto) {
      const dias = Math.floor((sec.getTime() - parto.getTime()) / 86400000);
      if (!Number.isFinite(dias)) return "—";
      return String(Math.max(0, dias));
    }
  }

  const hoje = new Date();
  const dias = Math.floor((hoje.getTime() - parto.getTime()) / 86400000);
  if (!Number.isFinite(dias)) return "—";
  return String(Math.max(0, dias));
}

/* ========= “códigos” curtos (sem cortar) ========= */
function shortProd(sit) {
  const t = String(sit || "").toLowerCase();
  if (!t || t === "—") return { label: "—", tone: "muted" };
  if (t.includes("lact")) return { label: "LAC", tone: "ok" };
  if (t.includes("seca")) return { label: "SEC", tone: "muted" };
  return { label: String(sit).slice(0, 4).toUpperCase(), tone: "info" };
}

function shortReprod(sit) {
  const t = String(sit || "").toLowerCase();
  if (!t || t === "—") return { label: "—", tone: "muted" };
  if (t.includes("pren") || t.includes("gest")) return { label: "PRE", tone: "info" };
  if (t.includes("vaz")) return { label: "VAZ", tone: "muted" };
  if (t.includes("cio")) return { label: "CIO", tone: "warn" };
  return { label: String(sit).slice(0, 4).toUpperCase(), tone: "info" };
}

/* ========= headers do novo padrão ========= */
const HEADERS = [
  { key: "animal", label: "Animal" },
  { key: "prod", label: "Prod." },
  { key: "reprod", label: "Reprod." },
  { key: "del", label: "DEL" },
  { key: "origem", label: "Origem" },
  { key: "acoes", label: "" }, // ações sem título (padrão de sistemas)
];

export default function Plantel() {
  const [animais, setAnimais] = useState([]);
  const [racaMap, setRacaMap] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [hoverCol, setHoverCol] = useState(null);

  // ficha
  const [animalSelecionado, setAnimalSelecionado] = useState(null);
  const abrirFichaAnimal = (animal) => setAnimalSelecionado(animal);
  const fecharFichaAnimal = () => setAnimalSelecionado(null);

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      setCarregando(true);
      setErro("");

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) throw new Error("Usuário não autenticado.");

        const { data: animaisData, error: animaisErr } = await supabase
          .from("animais")
          .select(
            [
              "id",
              "numero",
              "brinco",
              "nascimento",
              "sexo",
              "categoria",
              "origem",
              "situacao_produtiva",
              "situacao_reprodutiva",
              "ultimo_parto",
              "raca_id",
            ].join(", ")
          )
          .eq("user_id", user.id)
          .eq("ativo", true)
          .order("numero", { ascending: true });

        if (animaisErr) throw animaisErr;

        const { data: racasData, error: racasErr } = await supabase
          .from("racas")
          .select("id, nome")
          .eq("user_id", user.id);

        if (racasErr) throw racasErr;

        if (!ativo) return;

        const map = {};
        (racasData || []).forEach((r) => {
          map[r.id] = r.nome;
        });

        setRacaMap(map);
        setAnimais(Array.isArray(animaisData) ? animaisData : []);
      } catch (e) {
        console.error("Erro ao carregar plantel:", e);
        if (!ativo) return;
        setErro("Não foi possível carregar a lista de animais.");
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    carregarDados();
    return () => {
      ativo = false;
    };
  }, []);

  const linhas = useMemo(() => (Array.isArray(animais) ? animais : []), [animais]);

  const thClass = (idx, key) => `st-th ${key} ${hoverCol === idx ? "coluna-hover" : ""}`;
  const tdClass = (idx, key) => `st-td ${key} ${hoverCol === idx ? "coluna-hover" : ""}`;

  return (
    <section className="w-full">
      <div className="st-table-wrap">
        {erro && (
          <div className="st-alert st-alert--danger">
            {erro}
          </div>
        )}

        <div className="st-scroll">
          <table className="st-table st-table--entity">
            <thead>
              <tr>
                {HEADERS.map((h, idx) => (
                  <th
                    key={h.key}
                    className={thClass(idx, h.key)}
                    onMouseEnter={() => setHoverCol(idx)}
                    onMouseLeave={() => setHoverCol(null)}
                    title={h.label}
                  >
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {linhas.length === 0 && !carregando && (
                <tr className="st-empty">
                  <td colSpan={HEADERS.length}>Nenhum animal cadastrado ainda.</td>
                </tr>
              )}

              {linhas.map((a, idx) => {
                const idade = idadeTexto(a.nascimento);
                const racaNome = racaMap[a.raca_id] || "—";
                const sexoLabel =
                  a.sexo === "macho"
                    ? "Macho"
                    : a.sexo === "femea"
                    ? "Fêmea"
                    : a.sexo || "—";

                const sitProd = a.situacao_produtiva || "—";
                const sitReprod = a.situacao_reprodutiva || "—";
                const prod = shortProd(sitProd);
                const rep = shortReprod(sitReprod);

                const del = delFromParto(a.ultimo_parto);

                return (
                  <tr
                    key={a.id ?? a.numero ?? a.brinco ?? idx}
                    className="st-row"
                  >
                    {/* ANIMAL (coluna principal) */}
                    <td className={tdClass(0, "animal")}>
                      <div className="st-entity">
                        <div className="st-entity__top">
                          <span className="st-entity__id">{a.numero ?? "—"}</span>
                          <span className="st-entity__meta">
                            {racaNome} • {sexoLabel}
                          </span>
                        </div>

                        <div className="st-entity__sub">
                          <span className="st-subitem">{idade}</span>
                          <span className="st-dot">•</span>
                          <span className="st-subitem">Brinco {a.brinco || "—"}</span>
                          {a.categoria ? (
                            <>
                              <span className="st-dot">•</span>
                              <span className="st-subitem">{a.categoria}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    {/* PROD */}
                    <td className={tdClass(1, "prod")} title={sitProd}>
                      <span className={`st-chip st-chip--${prod.tone}`}>
                        {prod.label}
                      </span>
                    </td>

                    {/* REPROD */}
                    <td className={tdClass(2, "reprod")} title={sitReprod}>
                      <span className={`st-chip st-chip--${rep.tone}`}>
                        {rep.label}
                      </span>
                    </td>

                    {/* DEL */}
                    <td className={tdClass(3, "del")} title={del}>
                      <span className="st-num">{del}</span>
                    </td>

                    {/* ORIGEM */}
                    <td className={tdClass(4, "origem")} title={a.origem || "—"}>
                      <span className="st-text">{a.origem || "—"}</span>
                    </td>

                    {/* AÇÕES */}
                    <td className={tdClass(5, "acoes")}>
                      <button
                        type="button"
                        onClick={() => abrirFichaAnimal(a)}
                        className="st-action"
                        title="Abrir ficha"
                        aria-label="Abrir ficha"
                      >
                        Ficha
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {carregando && (
          <div className="st-loading">Carregando...</div>
        )}
      </div>

      {animalSelecionado && (
        <FichaAnimal animal={animalSelecionado} onClose={fecharFichaAnimal} />
      )}
    </section>
  );
}
