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

export default function Plantel() {
  const [animais, setAnimais] = useState([]);
  const [racaMap, setRacaMap] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

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

  return (
    <section className="w-full">
      {erro && (
        <div className="st-alert st-alert--danger">
          {erro}
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="st-table-wrap">
          <table className="st-table">
            <thead>
              <tr>
                <th style={{ width: 520 }}>Animal</th>
                <th className="st-td-center" style={{ width: 120 }}>Prod.</th>
                <th className="st-td-center" style={{ width: 120 }}>Reprod.</th>
                <th className="st-td-center" style={{ width: 90 }}>DEL</th>
                <th style={{ width: 140 }}>Origem</th>
                <th className="st-td-center" style={{ width: 110 }}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {linhas.length === 0 && !carregando && (
                <tr>
                  <td colSpan={6} style={{ padding: 18, color: "#64748b", fontWeight: 700 }}>
                    Nenhum animal cadastrado ainda.
                  </td>
                </tr>
              )}

              {linhas.map((a, idx) => {
                const idade = a.idade || idadeTexto(a.nascimento);
                const racaNome = racaMap[a.raca_id] || "—";
                const sexoLabel =
                  a.sexo === "macho" ? "Macho" : a.sexo === "femea" ? "Fêmea" : a.sexo || "—";

                const sitProd = a.situacao_produtiva || "—";
                const sitReprod = a.situacao_reprodutiva || "—";
                const del = delFromParto(a.ultimo_parto);

                const prodClass =
                  String(sitProd).toLowerCase().includes("lact") ? "st-pill st-pill--ok" :
                  String(sitProd).toLowerCase().includes("seca") ? "st-pill st-pill--mute" :
                  "st-pill st-pill--info";

                const reprClass =
                  String(sitReprod).toLowerCase().includes("pev") ? "st-pill st-pill--info" :
                  String(sitReprod).toLowerCase().includes("vaz") ? "st-pill st-pill--mute" :
                  "st-pill st-pill--info";

                return (
                  <tr key={a.id ?? a.numero ?? a.brinco ?? idx}>
                    {/* ANIMAL (duas linhas, mas com respiro) */}
                    <td>
                      <div className="st-animal">
                        <span className="st-animal-num">{a.numero ?? "—"}</span>

                        <div className="st-animal-main">
                          <div className="st-animal-title">
                            {racaNome} <span className="st-dot">•</span> {sexoLabel}
                          </div>
                          <div className="st-animal-sub">
                            <span>{idade}</span>
                            <span className="st-dot">•</span>
                            <span>Brinco {a.brinco || "—"}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* PROD */}
                    <td className="st-td-center">
                      {sitProd === "—" ? "—" : (
                        <span className={prodClass}>
                          {sitProd === "lactante" ? "LAC" : sitProd}
                        </span>
                      )}
                    </td>

                    {/* REPROD */}
                    <td className="st-td-center">
                      {sitReprod === "—" ? "—" : (
                        <span className={reprClass}>
                          {String(sitReprod).toUpperCase().slice(0, 3)}
                        </span>
                      )}
                    </td>

                    {/* DEL */}
                    <td className="st-td-center" style={{ fontWeight: 900 }}>
                      {del}
                    </td>

                    {/* ORIGEM */}
                    <td style={{ fontWeight: 700 }}>
                      {a.origem || "—"}
                    </td>

                    {/* AÇÕES */}
                    <td className="st-td-center">
                      <button onClick={() => abrirFichaAnimal(a)} className="st-btn">
                        Ficha
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {carregando && (
        <div className="st-loading">Carregando...</div>
      )}

      {animalSelecionado && (
        <FichaAnimal animal={animalSelecionado} onClose={fecharFichaAnimal} />
      )}
    </section>
  );
}
