// src/pages/Animais/Plantel.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import Select from "react-select";
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

function formatProducao(valor) {
  if (!Number.isFinite(valor)) return "—";
  return valor.toFixed(1).replace(".", ",");
}

export default function Plantel() {
  const [animais, setAnimais] = useState([]);
  const [racaMap, setRacaMap] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [lotes, setLotes] = useState([]);
  const [loteMeta, setLoteMeta] = useState({ table: "", idKey: "id", labelKey: "nome" });
  const [loteAviso, setLoteAviso] = useState("");
  const [hoveredRowId, setHoveredRowId] = useState(null);
  const [hoveredColKey, setHoveredColKey] = useState(null);
  const [ultimaProducaoMap, setUltimaProducaoMap] = useState({});

  // ficha
  const [animalSelecionado, setAnimalSelecionado] = useState(null);
  const abrirFichaAnimal = (animal) => setAnimalSelecionado(animal);
  const fecharFichaAnimal = () => setAnimalSelecionado(null);

  const detectLoteField = useCallback((lista) => {
    const campos = ["lote_id", "grupo_id", "lote", "grupo"];
    const sample = Array.isArray(lista) ? lista.find(Boolean) : null;
    if (!sample) return "lote_id";
    const found = campos.find((campo) =>
      Object.prototype.hasOwnProperty.call(sample, campo)
    );
    return found || "lote_id";
  }, []);

  const loteField = useMemo(() => detectLoteField(animais), [animais, detectLoteField]);

  const loteOptions = useMemo(() => {
    const idKey = loteMeta.idKey || "id";
    const labelKey = loteMeta.labelKey || "nome";
    return (lotes || []).map((lote) => {
      const label =
        lote[labelKey] ??
        lote.nome ??
        lote.descricao ??
        lote.titulo ??
        lote.label ??
        String(lote[idKey] ?? "—");
      return {
        value: lote[idKey],
        label,
      };
    });
  }, [lotes, loteMeta]);

  useEffect(() => {
    let ativo = true;

    async function carregarDados() {
      setCarregando(true);
      setErro("");
      setLoteAviso("");

      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) throw new Error("Usuário não autenticado.");

        const { data: animaisData, error: animaisErr } = await supabase
          .from("animais")
          .select("*")
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

        const lotesTabelas = [
          "lotes",
          "grupos",
          "grupos_animais",
          "grupo_animais",
          "lotes_animais",
        ];

        let lotesEncontrados = [];
        let loteMetaLocal = { table: "", idKey: "id", labelKey: "nome" };

        for (const tabela of lotesTabelas) {
          let lotesQuery = supabase.from(tabela).select("*").order("id", { ascending: true });
          let { data: lotesData, error: lotesErr } = await lotesQuery.eq("user_id", user.id);

          if (lotesErr && /column .*user_id.* does not exist/i.test(lotesErr.message || "")) {
            const retry = await supabase.from(tabela).select("*").order("id", { ascending: true });
            lotesData = retry.data;
            lotesErr = retry.error;
          }

          if (!lotesErr && Array.isArray(lotesData)) {
            const sample = lotesData.find(Boolean);
            const idKey = sample && Object.prototype.hasOwnProperty.call(sample, "id")
              ? "id"
              : sample && Object.prototype.hasOwnProperty.call(sample, "uuid")
              ? "uuid"
              : "id";
            const labelKey = sample && Object.prototype.hasOwnProperty.call(sample, "nome")
              ? "nome"
              : sample && Object.prototype.hasOwnProperty.call(sample, "descricao")
              ? "descricao"
              : sample && Object.prototype.hasOwnProperty.call(sample, "titulo")
              ? "titulo"
              : sample && Object.prototype.hasOwnProperty.call(sample, "label")
              ? "label"
              : "nome";
            lotesEncontrados = lotesData;
            loteMetaLocal = { table: tabela, idKey, labelKey };
            break;
          }
        }

        setRacaMap(map);
        setAnimais(Array.isArray(animaisData) ? animaisData : []);
        setLotes(lotesEncontrados);
        setLoteMeta(loteMetaLocal);
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

  useEffect(() => {
    let ativo = true;

    async function carregarUltimaProducao() {
      if (!Array.isArray(animais) || animais.length === 0) {
        if (ativo) setUltimaProducaoMap({});
        return;
      }

      const ids = animais.map((animal) => animal.id).filter(Boolean);
      if (ids.length === 0) {
        if (ativo) setUltimaProducaoMap({});
        return;
      }

      const tabelasLeite = ["medicoes_leite", "leite_registros", "producoes_leite", "leite"];
      const camposAnimal = ["animal_id", "animalId", "id_animal", "idAnimal"];
      const camposData = ["data", "created_at"];
      const camposValor = ["litros", "producao", "volume"];

      for (const tabela of tabelasLeite) {
        let dados = null;
        let erroFinal = null;
        let campoAnimalEncontrado = null;

        for (const campoAnimal of camposAnimal) {
          for (const campoData of camposData) {
            const { data, error } = await supabase
              .from(tabela)
              .select("*")
              .in(campoAnimal, ids)
              .order(campoData, { ascending: false })
              .limit(400);

            if (!error) {
              dados = data;
              erroFinal = null;
              campoAnimalEncontrado = campoAnimal;
              break;
            }

            const msg = error.message || "";
            if (/column .* does not exist/i.test(msg)) {
              erroFinal = error;
              continue;
            }

            erroFinal = error;
            break;
          }
          if (dados) break;
        }

        if (Array.isArray(dados)) {
          const mapa = {};
          dados.forEach((registro) => {
            const animalId =
              registro?.[campoAnimalEncontrado] ??
              registro?.animal_id ??
              registro?.animalId ??
              registro?.id_animal ??
              registro?.idAnimal;
            if (!animalId || Object.prototype.hasOwnProperty.call(mapa, animalId)) return;
            const valorRaw = camposValor
              .map((campo) => registro?.[campo])
              .find((valor) => valor != null && valor !== "");
            const valor = Number(valorRaw);
            if (Number.isFinite(valor)) {
              mapa[animalId] = valor;
            }
          });

          if (ativo) setUltimaProducaoMap(mapa);
          return;
        }

        const msg = erroFinal?.message || "";
        if (/relation .* does not exist/i.test(msg)) {
          continue;
        }
      }

      if (ativo) setUltimaProducaoMap({});
    }

    carregarUltimaProducao();

    return () => {
      ativo = false;
    };
  }, [animais]);

  const linhas = useMemo(() => (Array.isArray(animais) ? animais : []), [animais]);

  const selectStyles = useMemo(
    () => ({
      control: (base, state) => ({
        ...base,
        minHeight: 32,
        height: 32,
        borderRadius: 8,
        borderColor: state.isFocused ? "#1e3a8a" : "#cbd5f5",
        boxShadow: "none",
        fontSize: "0.85rem",
        backgroundColor: "#fff",
        cursor: "pointer",
      }),
      valueContainer: (base) => ({
        ...base,
        padding: "0 8px",
      }),
      input: (base) => ({
        ...base,
        margin: 0,
        padding: 0,
      }),
      indicatorsContainer: (base) => ({
        ...base,
        height: 32,
      }),
      dropdownIndicator: (base) => ({
        ...base,
        padding: 4,
      }),
      clearIndicator: (base) => ({
        ...base,
        padding: 4,
      }),
      menu: (base) => ({
        ...base,
        zIndex: 20,
        fontSize: "0.85rem",
      }),
      menuPortal: (base) => ({
        ...base,
        zIndex: 9999,
      }),
    }),
    []
  );

  const handleLoteChange = useCallback(
    async (animal, option) => {
      if (!animal?.id || !loteField) return;
      const isIdField = loteField.endsWith("_id");
      const valorNovo = isIdField ? option?.value ?? null : option?.label ?? null;
      const valorAnterior = animal[loteField] ?? null;

      setAnimais((prev) =>
        prev.map((item) =>
          item.id === animal.id ? { ...item, [loteField]: valorNovo } : item
        )
      );
      setLoteAviso("");

      const { error: updateErr } = await supabase
        .from("animais")
        .update({ [loteField]: valorNovo })
        .eq("id", animal.id);

      if (updateErr) {
        setAnimais((prev) =>
          prev.map((item) =>
            item.id === animal.id ? { ...item, [loteField]: valorAnterior } : item
          )
        );
        setLoteAviso("Não foi possível atualizar o lote. Tente novamente.");
      }
    },
    [loteField]
  );

  const resolveSelectedLote = useCallback(
    (animal) => {
      if (!loteField) return null;
      const valorAtual = animal?.[loteField];
      if (valorAtual == null) return null;
      if (loteField.endsWith("_id")) {
        return loteOptions.find((opt) => opt.value === valorAtual) || null;
      }
      return loteOptions.find((opt) => opt.label === valorAtual) || null;
    },
    [loteField, loteOptions]
  );

  const handleColEnter = useCallback((colKey) => {
    setHoveredColKey(colKey);
    setHoveredRowId(null);
  }, []);

  const handleCellEnter = useCallback((rowId, colKey) => {
    setHoveredRowId(rowId);
    setHoveredColKey(colKey);
  }, []);

  return (
    <section className="w-full">
      {erro && <div className="st-alert st-alert--danger">{erro}</div>}
      {loteAviso && <div className="st-alert st-alert--warning">{loteAviso}</div>}

      <div className="st-table-container">
        <div className="st-table-wrap">
          <table
            className="st-table st-table--plantel"
            onMouseLeave={() => {
              setHoveredRowId(null);
              setHoveredColKey(null);
            }}
          >
            <thead>
              <tr>
                <th
                  className="col-animal st-col-animal"
                  onMouseEnter={() => handleColEnter("animal")}
                >
                  Animal
                </th>
                <th
                  className="col-lote"
                  onMouseEnter={() => handleColEnter("lote")}
                >
                  Lote
                </th>
                <th
                  className="st-td-center col-sitprod"
                  onMouseEnter={() => handleColEnter("sitprod")}
                >
                  Situação produtiva
                </th>
                <th
                  className="st-td-center col-producao"
                  onMouseEnter={() => handleColEnter("producao")}
                >
                  Última produção
                </th>
                <th
                  className="st-td-center col-sitreprod"
                  onMouseEnter={() => handleColEnter("sitreprod")}
                >
                  Situação reprodutiva
                </th>
                <th
                  className="st-td-center col-del"
                  onMouseEnter={() => handleColEnter("del")}
                >
                  DEL
                </th>
                <th
                  className="col-origem"
                  onMouseEnter={() => handleColEnter("origem")}
                >
                  Origem
                </th>
                <th
                  className="st-td-center col-acoes"
                  onMouseEnter={() => handleColEnter("acoes")}
                >
                  Ações
                </th>
              </tr>
            </thead>

            <tbody>
              {linhas.length === 0 && !carregando && (
                <tr>
                  <td colSpan={8} style={{ padding: 18, color: "#64748b", fontWeight: 700 }}>
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
                const isLact = /lact|lac/i.test(String(sitProd || ""));
                const producaoValor = isLact ? ultimaProducaoMap[a.id] : null;
                const producaoTexto = isLact ? formatProducao(producaoValor) : "—";

                const prodClass =
                  String(sitProd).toLowerCase().includes("lact") ? "st-pill st-pill--ok" :
                  String(sitProd).toLowerCase().includes("seca") ? "st-pill st-pill--mute" :
                  "st-pill st-pill--info";

                const reprClass =
                  String(sitReprod).toLowerCase().includes("pev") ? "st-pill st-pill--info" :
                  String(sitReprod).toLowerCase().includes("vaz") ? "st-pill st-pill--mute" :
                  "st-pill st-pill--info";

                const rowId = a.id ?? a.numero ?? a.brinco ?? idx;
                const rowHover = hoveredRowId === rowId;

                return (
                  <tr key={rowId} className={rowHover ? "st-row-hover" : ""}>
                    {/* ANIMAL (duas linhas, mas com respiro) */}
                    <td
                      className={`col-animal st-col-animal ${
                        hoveredColKey === "animal" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "animal" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => handleCellEnter(rowId, "animal")}
                    >
                      <div className="st-animal">
                        <span
                          className="st-animal-num"
                          title={`Nº do animal: ${a.numero ?? "—"}`}
                        >
                          {a.numero ?? "—"}
                        </span>

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

                    {/* LOTE */}
                    <td
                      className={`col-lote ${
                        hoveredColKey === "lote" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "lote" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => handleCellEnter(rowId, "lote")}
                    >
                      <Select
                        classNamePrefix="st-select"
                        styles={selectStyles}
                        options={loteOptions}
                        value={resolveSelectedLote(a)}
                        onChange={(option) => handleLoteChange(a, option)}
                        isClearable
                        placeholder="Selecione"
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                      />
                    </td>

                    {/* PROD */}
                    <td
                      className={`st-td-center col-sitprod ${
                        hoveredColKey === "sitprod" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "sitprod" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => handleCellEnter(rowId, "sitprod")}
                    >
                      {sitProd === "—" ? "—" : (
                        <span className={prodClass}>
                          {sitProd === "lactante" ? "LAC" : sitProd}
                        </span>
                      )}
                    </td>

                    {/* PRODUÇÃO */}
                    <td
                      className={`st-td-center col-producao ${
                        hoveredColKey === "producao" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "producao" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => handleCellEnter(rowId, "producao")}
                    >
                      {producaoTexto}
                    </td>

                    {/* REPROD */}
                    <td
                      className={`st-td-center col-sitreprod ${
                        hoveredColKey === "sitreprod" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "sitreprod" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => handleCellEnter(rowId, "sitreprod")}
                    >
                      {sitReprod === "—" ? "—" : (
                        <span className={reprClass}>
                          {String(sitReprod).toUpperCase().slice(0, 3)}
                        </span>
                      )}
                    </td>

                    {/* DEL */}
                    <td
                      className={`st-td-center col-del ${
                        hoveredColKey === "del" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "del" ? "st-cell-hover" : ""
                      }`}
                      style={{ fontWeight: 900 }}
                      onMouseEnter={() => handleCellEnter(rowId, "del")}
                    >
                      {del}
                    </td>

                    {/* ORIGEM */}
                    <td
                      className={`col-origem ${
                        hoveredColKey === "origem" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "origem" ? "st-cell-hover" : ""
                      }`}
                      style={{ fontWeight: 700 }}
                      onMouseEnter={() => handleCellEnter(rowId, "origem")}
                    >
                      {a.origem || "—"}
                    </td>

                    {/* AÇÕES */}
                    <td
                      className={`st-td-center col-acoes ${
                        hoveredColKey === "acoes" ? "st-col-hover" : ""
                      } ${rowHover ? "st-row-hover" : ""} ${
                        rowHover && hoveredColKey === "acoes" ? "st-cell-hover" : ""
                      }`}
                      onMouseEnter={() => handleCellEnter(rowId, "acoes")}
                    >
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
