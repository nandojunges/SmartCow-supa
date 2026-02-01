import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

function parseDateFlexible(s) {
  if (!s) return null;
  if (typeof s !== "string") s = String(s).trim();

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const y = +m[1];
    const mo = +m[2];
    const d = +m[3];
    const dt = new Date(y, mo - 1, d);
    return Number.isFinite(+dt) ? dt : null;
  }

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

function fmtDataBR(data) {
  const dt = parseDateFlexible(data);
  return dt ? dt.toLocaleDateString("pt-BR") : "—";
}

function delNumeroFromParto(partoStr, secagemOpcional) {
  const parto = parseDateFlexible(partoStr);
  if (!parto) return null;

  if (secagemOpcional) {
    const sec = parseDateFlexible(secagemOpcional);
    if (sec && sec > parto) {
      const dias = Math.floor((sec.getTime() - parto.getTime()) / 86400000);
      return Number.isFinite(dias) ? Math.max(0, dias) : null;
    }
  }

  const hoje = new Date();
  const dias = Math.floor((hoje.getTime() - parto.getTime()) / 86400000);
  return Number.isFinite(dias) ? Math.max(0, dias) : null;
}

function normalizarResultadoDg(valor) {
  if (valor === null || valor === undefined) return "";
  const texto = String(valor).trim().toLowerCase();
  if (!texto) return "";
  const positivos = ["positivo", "pos", "p", "true"];
  const negativos = ["negativo", "neg", "n", "false"];
  if (positivos.includes(texto)) return "POSITIVO";
  if (negativos.includes(texto)) return "NEGATIVO";
  return "";
}

function calcularResumoReproducao(eventos = []) {
  const tiposIa = ["IA", "INSEMINACAO", "IATF"];
  const tiposDg = ["DG", "DIAGNOSTICO_GESTACAO"];
  const eventosComData = (eventos || []).map((evento) => ({
    ...evento,
    _data: parseDateFlexible(evento?.data_evento),
  }));

  const ultimoPartoEvento = eventosComData
    .filter((evento) => String(evento?.tipo || "").toUpperCase() === "PARTO")
    .reduce((maisRecente, evento) => {
      if (!evento._data) return maisRecente;
      if (!maisRecente?._data || evento._data > maisRecente._data) return evento;
      return maisRecente;
    }, null);

  const dataUltimoParto = ultimoPartoEvento?._data || null;
  const eventosDoCiclo = dataUltimoParto
    ? eventosComData.filter((evento) => evento._data && evento._data > dataUltimoParto)
    : eventosComData.filter((evento) => evento._data);

  const ultimaIaEvento = eventosDoCiclo
    .filter((evento) => tiposIa.includes(String(evento?.tipo || "").toUpperCase()))
    .reduce((maisRecente, evento) => {
      if (!evento._data) return maisRecente;
      if (!maisRecente?._data || evento._data > maisRecente._data) return evento;
      return maisRecente;
    }, null);

  const ultimoDgEvento = eventosDoCiclo
    .filter((evento) => tiposDg.includes(String(evento?.tipo || "").toUpperCase()))
    .reduce((maisRecente, evento) => {
      if (!evento._data) return maisRecente;
      if (!maisRecente?._data || evento._data > maisRecente._data) return evento;
      return maisRecente;
    }, null);

  const ultimaSecagemEvento = eventosDoCiclo
    .filter((evento) => String(evento?.tipo || "").toUpperCase() === "SECAGEM")
    .reduce((maisRecente, evento) => {
      if (!evento._data) return maisRecente;
      if (!maisRecente?._data || evento._data > maisRecente._data) return evento;
      return maisRecente;
    }, null);

  const ultimoParto = ultimoPartoEvento?.data_evento ?? null;
  const ultimaSecagem = ultimaSecagemEvento?.data_evento ?? null;
  const ultimaIa = ultimaIaEvento?.data_evento ?? null;
  const resultadoDg = normalizarResultadoDg(ultimoDgEvento?.resultado_dg);

  const del = delNumeroFromParto(ultimoParto, ultimaSecagem);

  let statusReprodutivo = "—";
  if (resultadoDg === "POSITIVO") {
    statusReprodutivo = "PEV";
  } else if (resultadoDg === "NEGATIVO") {
    statusReprodutivo = "VAZ";
  } else if (ultimaIa) {
    statusReprodutivo = "INS";
  }

  let previsaoParto = null;
  if (ultimaIa) {
    const dataIa = parseDateFlexible(ultimaIa);
    if (dataIa) {
      const previsao = new Date(dataIa);
      previsao.setDate(previsao.getDate() + 280);
      previsaoParto = previsao.toISOString().split("T")[0];
    }
  }

  return {
    ultimo_parto_calc: ultimoParto,
    ultima_ia_calc: ultimaIa,
    status_reprodutivo_calc: statusReprodutivo,
    del_calc: del,
    previsao_parto_calc: previsaoParto,
  };
}

const wrapper = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  fontFamily: "Poppins, system-ui, sans-serif",
};

const card = {
  background: "#fff",
  borderRadius: 16,
  padding: "16px 20px",
  border: "1px solid #e5e7eb",
  boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
};

const label = {
  fontSize: "0.7rem",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 700,
};

const value = {
  fontSize: "0.95rem",
  fontWeight: 700,
  color: "#0f172a",
};

function InfoItem({ titulo, texto }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={label}>{titulo}</span>
      <span style={value}>{texto ?? "—"}</span>
    </div>
  );
}

export default function FichaAnimalReproducao({ animal, onResumoChange }) {
  const [eventos, setEventos] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregarEventos() {
      if (!animal?.id || !animal?.fazenda_id) {
        if (ativo) {
          setEventos([]);
          setResumo(null);
          setErro("");
        }
        return;
      }

      setCarregando(true);
      setErro("");

      const { data, error } = await supabase
        .from("repro_eventos")
        .select("tipo, data_evento, resultado_dg, observacoes, meta")
        .eq("fazenda_id", animal.fazenda_id)
        .eq("animal_id", animal.id)
        .order("data_evento", { ascending: false });

      if (!ativo) return;

      if (error) {
        console.error("Erro ao carregar eventos reprodutivos:", error);
        setEventos([]);
        setResumo(null);
        setErro("Não foi possível carregar os eventos reprodutivos.");
        setCarregando(false);
        return;
      }

      const lista = Array.isArray(data) ? data : [];
      setEventos(lista);

      const resumoCalc = calcularResumoReproducao(lista);
      setResumo(resumoCalc);
      if (onResumoChange) onResumoChange(resumoCalc);

      setCarregando(false);
    }

    carregarEventos();

    return () => {
      ativo = false;
    };
  }, [animal?.fazenda_id, animal?.id, onResumoChange]);

  const resumoExibicao = useMemo(() => {
    if (!resumo) return null;
    return {
      ultimoParto: resumo.ultimo_parto_calc ? fmtDataBR(resumo.ultimo_parto_calc) : "—",
      ultimaIa: resumo.ultima_ia_calc ? fmtDataBR(resumo.ultima_ia_calc) : "—",
      previsaoParto: resumo.previsao_parto_calc
        ? fmtDataBR(resumo.previsao_parto_calc)
        : "—",
      status: resumo.status_reprodutivo_calc || "—",
      del:
        Number.isFinite(resumo.del_calc) ? `${Math.round(resumo.del_calc)} d` : "—",
    };
  }, [resumo]);

  return (
    <div style={wrapper}>
      <div style={card}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 16,
          }}
        >
          <InfoItem titulo="Último parto" texto={resumoExibicao?.ultimoParto} />
          <InfoItem titulo="Última IA" texto={resumoExibicao?.ultimaIa} />
          <InfoItem titulo="Previsão parto" texto={resumoExibicao?.previsaoParto} />
          <InfoItem titulo="Status repro" texto={resumoExibicao?.status} />
          <InfoItem titulo="DEL" texto={resumoExibicao?.del} />
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 800, marginBottom: 12 }}>
          Eventos reprodutivos
        </div>
        {carregando && <div>Carregando eventos…</div>}
        {!carregando && erro && <div style={{ color: "#b91c1c" }}>{erro}</div>}
        {!carregando && !erro && eventos.length === 0 && (
          <div style={{ color: "#64748b" }}>Sem eventos reprodutivos.</div>
        )}
        {!carregando && !erro && eventos.length > 0 && (
          <div style={{ display: "grid", gap: 8 }}>
            {eventos.map((evento, index) => (
              <div
                key={`${evento.tipo}-${evento.data_evento}-${index}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 1fr",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "#f8fafc",
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {String(evento?.tipo || "—").toUpperCase()}
                </div>
                <div>{fmtDataBR(evento?.data_evento)}</div>
                <div style={{ color: "#475569" }}>
                  {evento?.resultado_dg ? `DG: ${evento.resultado_dg}` : evento?.observacoes || "—"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
