// src/pages/ConsumoReposicao/CalendarioSanitario.jsx
import React, { useMemo, useState, useEffect } from "react";

/** =====================================================================
 * CALENDÁRIO SANITÁRIO — SOMENTE LAYOUT (SEM BANCO / SEM API)
 * - Mantém layout completo: tabela sticky + hover/zebra + header azul
 * - Mantém modais e formulários
 * - CRUD em memória (mock) para você plugar no novo banco depois
 * ===================================================================== */

const STICKY_OFFSET = 48;

/* ===== estilos de tabela ===== */
const tableClasses =
  "w-full border-separate [border-spacing:0_4px] text-[14px] text-[#333] table-auto";
const thBase =
  "bg-[#e6f0ff] px-3 py-3 text-left font-bold text-[16px] text-[#1e3a8a] border-b-2 border-[#a8c3e6] sticky z-10 whitespace-nowrap";
const tdBase = "px-4 py-2 border-b border-[#eee] whitespace-nowrap";
const tdClamp = tdBase + " overflow-hidden text-ellipsis";
const rowBase = "bg-white shadow-xs transition-colors";
const rowAlt = "even:bg-[#f7f7f8]";
const hoverTH = (i, hc) => (i === hc ? "bg-[rgba(33,150,243,0.08)]" : "");
const hoverTD = (i, hc) => (i === hc ? "bg-[rgba(33,150,243,0.08)]" : "");

/* ===== estilos modal ===== */
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 9999,
};
const modalCard = {
  background: "#fff",
  borderRadius: "1rem",
  width: "820px",
  maxHeight: "90vh",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  fontFamily: "Poppins, sans-serif",
};
const header = {
  background: "#1e40af",
  color: "white",
  padding: "1rem 1.2rem",
  fontWeight: "bold",
  fontSize: "1.05rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

/* ============================ PÁGINA ============================ */

export default function CalendarioSanitario() {
  // ✅ mock inicial (apenas para o layout não ficar vazio)
  const [manejos, setManejos] = useState(() => [
    {
      id: "m1",
      categoria: "Bezerra",
      tipo: "Vacina",
      produto: "Clostridioses",
      frequencia: "180",
      idade: "60 dias",
      via: "Subcutânea",
      dose: 2,
      dataInicial: isoDate(new Date()),
      proximaAplicacao: "",
      ultimaAplicacao: "",
      observacoes: "",
    },
  ]);

  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [editarIdx, setEditarIdx] = useState(null);

  const [mostrarRegistro, setMostrarRegistro] = useState(false);
  const [registrarIdx, setRegistrarIdx] = useState(null);

  const [mostrarExames, setMostrarExames] = useState(false);
  const [excluirIdx, setExcluirIdx] = useState(null);

  const [hoverCol, setHoverCol] = useState(null);

  // ✅ não carrega nada de API/banco (layout apenas)
  useEffect(() => {
    setErro("");
    setLoading(false);
  }, []);

  const abrirNovo = () => {
    setEditarIdx(null);
    setMostrarCadastro(true);
  };

  const abrirEdicao = (idx) => {
    setEditarIdx(idx);
    setMostrarCadastro(true);
  };

  // ✅ salva em memória (para manter fluxo/UX do layout)
  const salvarManejo = (registro) => {
    const id = registro?.id || cryptoId();

    setManejos((prev) => {
      const arr = [...prev];
      const idx = arr.findIndex((m) => m.id === id);
      const payload = { ...registro, id };
      if (idx >= 0) arr[idx] = payload;
      else arr.push(payload);
      return arr;
    });

    setMostrarCadastro(false);
    setEditarIdx(null);
  };

  const abrirRegistro = (idx) => {
    setRegistrarIdx(idx);
    setMostrarRegistro(true);
  };

  // ✅ registra em memória (atualiza ultima/proxima + observacoes)
  const salvarRegistro = (dataAplicacao, observacoes) => {
    const cur = manejos[registrarIdx];
    if (!cur) return;

    let proximaAplicacao = cur.proximaAplicacao || "";
    const dias = parseInt(cur.frequencia, 10);
    if (Number.isFinite(dias) && dataAplicacao) {
      const d = new Date(dataAplicacao);
      d.setDate(d.getDate() + dias);
      proximaAplicacao = isoDate(d);
    }

    setManejos((prev) => {
      const arr = [...prev];
      arr[registrarIdx] = {
        ...arr[registrarIdx],
        ultimaAplicacao: dataAplicacao,
        proximaAplicacao,
        observacoes,
      };
      return arr;
    });

    setMostrarRegistro(false);
    setRegistrarIdx(null);
  };

  const confirmarExclusao = () => {
    setManejos((prev) => prev.filter((_, i) => i !== excluirIdx));
    setExcluirIdx(null);
  };

  const titulos = useMemo(
    () => [
      "Categoria",
      "Tipo",
      "Produto",
      "Frequência / Intervalo",
      "Idade de Aplicação",
      "Via",
      "Dose (mL)",
      "Próxima Aplicação",
      "Ações",
    ],
    []
  );

  return (
    <section className="w-full py-6 font-sans">
      <div className="px-2 md:px-4 lg:px-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[18px] font-extrabold text-[#1e3a8a]">
            Calendário Sanitário
          </h3>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded border border-[#e5e7eb] bg-[#f3f4f6] text-[#111827]"
              onClick={() => setMostrarExames(true)}
            >
              Exames Sanitários
            </button>
            <button
              className="px-3 py-2 rounded bg-[#2563eb] text-white"
              onClick={abrirNovo}
            >
              + Novo Manejo
            </button>
          </div>
        </div>

        {erro && (
          <div className="mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-300 px-3 py-2 rounded">
            {erro}
          </div>
        )}

        <table className={tableClasses}>
          <colgroup>
            <col style={{ width: 150 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 220 }} />
            <col style={{ width: 170 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 140 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 170 }} />
            <col style={{ width: 160 }} />
          </colgroup>

          <thead>
            <tr>
              {titulos.map((t, i) => (
                <th
                  key={t}
                  className={`${thBase} ${hoverTH(i, hoverCol)}`}
                  onMouseEnter={() => setHoverCol(i)}
                  onMouseLeave={() => setHoverCol(null)}
                  style={{ top: STICKY_OFFSET }}
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td className={tdBase} colSpan={titulos.length}>
                  <div className="text-center text-[#1e3a8a] py-6">
                    Carregando…
                  </div>
                </td>
              </tr>
            ) : manejos.length === 0 ? (
              <tr>
                <td className={tdBase} colSpan={titulos.length}>
                  <div className="text-center text-gray-600 py-6">
                    Nenhum manejo cadastrado.
                  </div>
                </td>
              </tr>
            ) : (
              manejos.map((m, idx) => (
                <tr
                  key={m.id || idx}
                  className={`${rowBase} ${rowAlt} hover:bg-[#eaf5ff]`}
                >
                  <td className={`${tdClamp} ${hoverTD(0, hoverCol)}`}>
                    {m.categoria || "—"}
                  </td>
                  <td className={`${tdClamp} ${hoverTD(1, hoverCol)}`}>
                    {m.tipo || "—"}
                  </td>
                  <td className={`${tdClamp} ${hoverTD(2, hoverCol)}`}>
                    {m.produto || "—"}
                  </td>
                  <td className={`${tdClamp} ${hoverTD(3, hoverCol)}`}>
                    {m.frequencia ? `${m.frequencia} dias` : "—"}
                  </td>
                  <td className={`${tdClamp} ${hoverTD(4, hoverCol)}`}>
                    {m.idade || "—"}
                  </td>
                  <td className={`${tdClamp} ${hoverTD(5, hoverCol)}`}>
                    {m.via || "—"}
                  </td>
                  <td className={`${tdClamp} ${hoverTD(6, hoverCol)}`}>
                    {m.dose ?? "—"}
                  </td>
                  <td className={`${tdClamp} ${hoverTD(7, hoverCol)}`}>
                    {m.proximaAplicacao
                      ? formatBR(m.proximaAplicacao)
                      : m.dataInicial
                      ? formatBR(m.dataInicial)
                      : "—"}
                  </td>
                  <td className={`${tdBase} ${hoverTD(8, hoverCol)}`}>
                    <div className="whitespace-nowrap">
                      <button
                        className="text-[#2563eb] font-extrabold"
                        onClick={() => abrirEdicao(idx)}
                      >
                        Editar
                      </button>
                      <span className="mx-2 text-[#e5e7eb]">|</span>
                      <button
                        className="text-[#2563eb] font-extrabold"
                        onClick={() => abrirRegistro(idx)}
                      >
                        Registrar
                      </button>
                      <span className="mx-2 text-[#e5e7eb]">|</span>
                      <button
                        className="text-[#dc2626] font-extrabold"
                        onClick={() => setExcluirIdx(idx)}
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Modais */}
        {mostrarCadastro && (
          <Modal
            onClose={() => {
              setMostrarCadastro(false);
              setEditarIdx(null);
            }}
            title={editarIdx != null ? "✏️ Editar Manejo" : "➕ Novo Manejo"}
          >
            <CadastroManejoForm
              value={editarIdx != null ? manejos[editarIdx] : null}
              onCancel={() => {
                setMostrarCadastro(false);
                setEditarIdx(null);
              }}
              onSave={salvarManejo}
            />
          </Modal>
        )}

        {mostrarRegistro && (
          <Modal
            onClose={() => {
              setMostrarRegistro(false);
              setRegistrarIdx(null);
            }}
            title="Registrar Aplicação"
          >
            <RegistroAplicacaoForm
              manejo={manejos[registrarIdx]}
              onCancel={() => {
                setMostrarRegistro(false);
                setRegistrarIdx(null);
              }}
              onSave={salvarRegistro}
            />
          </Modal>
        )}

        {mostrarExames && (
          <Modal onClose={() => setMostrarExames(false)} title="Controle de Exames">
            <ExamesSanitariosForm
              onCancel={() => setMostrarExames(false)}
              onSave={() => {
                // ✅ layout only: aqui depois você pluga insert no novo banco
                setMostrarExames(false);
              }}
            />
          </Modal>
        )}

        {excluirIdx !== null && (
          <Modal onClose={() => setExcluirIdx(null)} title="Confirmar exclusão">
            <div className="text-[14px] text-[#374151]">
              Deseja realmente excluir este manejo?
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-2 rounded border border-[#e5e7eb]"
                onClick={() => setExcluirIdx(null)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-2 rounded bg-[#ef4444] text-white"
                onClick={confirmarExclusao}
              >
                Excluir
              </button>
            </div>
          </Modal>
        )}
      </div>
    </section>
  );
}

/* ============================ FORMS ============================ */

function CadastroManejoForm({ value, onCancel, onSave }) {
  const CATEGORIAS = ["Bezerra", "Novilha", "Vaca em lactação", "Vaca seca", "Todo plantel"];
  const TIPOS = ["Vacina", "Vermífugo", "Vitamina", "Antiparasitário", "Preventivo"];
  const VIAS = ["Subcutânea", "Oral", "Intramuscular"];

  const [form, setForm] = useState(() => ({
    id: value?.id || null,
    categoria: value?.categoria || "",
    tipo: value?.tipo || "",
    produto: value?.produto || "",
    frequencia: value?.frequencia || "",
    idade: value?.idade || "",
    via: value?.via || "",
    dose: value?.dose || "",
    dataInicial: value?.dataInicial || "",
    proximaAplicacao: value?.proximaAplicacao || "",
    ultimaAplicacao: value?.ultimaAplicacao || "",
  }));

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const proximaEstimada = useMemo(() => {
    if (!form.dataInicial) return "";
    const dias = parseInt(form.frequencia, 10);
    const d = new Date(form.dataInicial);
    if (Number.isFinite(dias)) {
      d.setDate(d.getDate() + dias);
      return isoDate(d);
    }
    return form.dataInicial;
  }, [form.dataInicial, form.frequencia]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <SelectInline
        label="Categoria *"
        value={form.categoria}
        onChange={(v) => set("categoria", v)}
        options={CATEGORIAS}
      />
      <SelectInline
        label="Tipo *"
        value={form.tipo}
        onChange={(v) => set("tipo", v)}
        options={TIPOS}
      />
      <Input
        label="Produto / Princípio Ativo *"
        value={form.produto}
        onChange={(v) => set("produto", v)}
      />
      <Input
        label="Frequência (dias) *"
        value={form.frequencia}
        onChange={(v) => set("frequencia", v)}
      />
      <Input label="Idade de Aplicação" value={form.idade} onChange={(v) => set("idade", v)} />
      <SelectInline label="Via" value={form.via} onChange={(v) => set("via", v)} options={VIAS} />
      <Input
        label="Dose por animal (mL) *"
        type="number"
        value={form.dose}
        onChange={(v) => set("dose", v)}
      />
      <Input
        label="Data Inicial"
        type="date"
        value={form.dataInicial}
        onChange={(v) => set("dataInicial", v)}
      />

      <div className="md:col-span-2 flex items-center justify-between">
        <div className="text-[13px] text-[#374151]">
          Próxima aplicação (estimada):{" "}
          <strong>{proximaEstimada ? formatBR(proximaEstimada) : "—"}</strong>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded border border-[#e5e7eb]" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="px-3 py-2 rounded bg-[#2563eb] text-white"
            onClick={() => {
              if (!form.categoria || !form.tipo || !form.produto || !form.dose || !form.frequencia) {
                alert("Preencha os campos obrigatórios.");
                return;
              }
              onSave({ ...form, proximaAplicacao: proximaEstimada || form.proximaAplicacao });
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function RegistroAplicacaoForm({ manejo, onCancel, onSave }) {
  const [data, setData] = useState(isoDate(new Date()));
  const [observacoes, setObservacoes] = useState("");

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Data da Aplicação" type="date" value={data} onChange={setData} />
        <Input label="Manejo" value={`${manejo?.tipo || "—"} • ${manejo?.produto || "—"}`} readOnly />
      </div>

      <div>
        <label className="text-[12px] font-bold text-[#374151]">Observações</label>
        <textarea
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
          className="w-full border border-[#d1d5db] rounded-md p-2 text-[14px] h-24 resize-y"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button className="px-3 py-2 rounded border border-[#e5e7eb]" onClick={onCancel}>
          Cancelar
        </button>
        <button
          className="px-3 py-2 rounded bg-[#2563eb] text-white"
          onClick={() => onSave(data, observacoes)}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

function ExamesSanitariosForm({ onCancel, onSave }) {
  const [dados, setDados] = useState({
    tipo: "",
    outroTipo: "",
    abrangencia: "",
    status: "Propriedade Não Certificada",
    validadeCertificado: "",
    certificado: null,
    dataUltimo: "",
    comprovante: null,
    animal: "",
  });

  const precisaStatus = (t) =>
    ["Brucelose", "Tuberculose", "Brucelose e Tuberculose (certificação conjunta)"].includes(t);

  const set = (k, v) => setDados((p) => ({ ...p, [k]: v }));

  const calcularProxima = () => {
    if (!dados.dataUltimo) return "";
    const d = new Date(dados.dataUltimo);

    switch (dados.tipo) {
      case "Brucelose":
      case "Tuberculose":
        d.setFullYear(d.getFullYear() + 1);
        return isoDate(d);

      case "Brucelose e Tuberculose (certificação conjunta)":
        if (dados.validadeCertificado) return dados.validadeCertificado;
        d.setFullYear(d.getFullYear() + 1);
        return isoDate(d);

      case "Leptospirose":
        d.setMonth(d.getMonth() + 6);
        return isoDate(d);

      default:
        return "";
    }
  };

  const handleFile = (campo, file) => {
    if (!file) {
      set(campo, null);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => set(campo, reader.result);
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <SelectInline
        label="Tipo de Exame *"
        value={dados.tipo}
        onChange={(v) => set("tipo", v)}
        options={[
          "Brucelose",
          "Tuberculose",
          "Brucelose e Tuberculose (certificação conjunta)",
          "Leptospirose",
          "Tripanossoma",
          "Babesiose",
          "Outros (com campo livre)",
        ]}
      />

      {dados.tipo === "Outros (com campo livre)" && (
        <Input label="Nome do Exame" value={dados.outroTipo} onChange={(v) => set("outroTipo", v)} />
      )}

      <SelectInline
        label="Abrangência *"
        value={dados.abrangencia}
        onChange={(v) => set("abrangencia", v)}
        options={["Propriedade inteira", "Animal específico", "Animal novo em entrada"]}
      />

      {(dados.abrangencia === "Animal específico" || dados.abrangencia === "Animal novo em entrada") && (
        <Input label="Animal vinculado" value={dados.animal} onChange={(v) => set("animal", v)} />
      )}

      {precisaStatus(dados.tipo) && (
        <SelectInline
          label="Status da Propriedade"
          value={dados.status}
          onChange={(v) => set("status", v)}
          options={["Propriedade Não Certificada", "Propriedade Certificada"]}
        />
      )}

      {precisaStatus(dados.tipo) && dados.status === "Propriedade Certificada" && (
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[12px] font-bold text-[#374151]">Certificado (PDF/Imagem)</label>
            <input
              type="file"
              onChange={(e) => handleFile("certificado", e.target.files?.[0])}
              className="w-full border border-[#d1d5db] rounded-md p-2 text-[14px]"
            />
          </div>
          <Input
            label="Validade do Certificado"
            type="date"
            value={dados.validadeCertificado}
            onChange={(v) => set("validadeCertificado", v)}
          />
        </div>
      )}

      <Input
        label="Data do Último Exame *"
        type="date"
        value={dados.dataUltimo}
        onChange={(v) => set("dataUltimo", v)}
      />

      <div>
        <label className="text-[12px] font-bold text-[#374151]">Comprovante do Exame</label>
        <input
          type="file"
          onChange={(e) => handleFile("comprovante", e.target.files?.[0])}
          className="w-full border border-[#d1d5db] rounded-md p-2 text-[14px]"
        />
      </div>

      <div className="md:col-span-2 text-[13px] text-[#374151]">
        Próxima obrigatoriedade:{" "}
        <strong>{calcularProxima() ? formatBR(calcularProxima()) : "—"}</strong>
      </div>

      <div className="md:col-span-2 flex justify-end gap-2">
        <button className="px-3 py-2 rounded border border-[#e5e7eb]" onClick={onCancel}>
          Cancelar
        </button>
        <button
          className="px-3 py-2 rounded bg-[#2563eb] text-white"
          onClick={() => {
            if (!dados.tipo || !dados.dataUltimo || !dados.abrangencia) {
              alert("Preencha os campos obrigatórios.");
              return;
            }
            onSave({ ...dados, proximaObrigatoriedade: calcularProxima() || null });
          }}
        >
          Salvar
        </button>
      </div>
    </div>
  );
}

/* ============================ MODAL BASE ============================ */

function Modal({ title, children, onClose }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div style={overlay} onMouseDown={onClose}>
      <div style={modalCard} onMouseDown={(e) => e.stopPropagation()}>
        <div style={header}>
          <div style={{ fontWeight: "bold" }}>{title}</div>
          <button className="px-2 text-white/90 hover:text-white" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-auto">{children}</div>
      </div>
    </div>
  );
}

/* ============================ UI PRIMITIVES ======================== */

function Input({ label, value, onChange, type = "text", readOnly = false }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-bold text-[#374151]">{label}</label>
      <input
        type={type}
        value={value ?? ""}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={`border border-[#d1d5db] rounded-md p-2 text-[14px] w-full ${
          readOnly ? "bg-[#f3f4f6]" : "bg-white"
        }`}
      />
    </div>
  );
}

function SelectInline({ label, value, onChange, options = [] }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[12px] font-bold text-[#374151]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="border border-[#d1d5db] rounded-md p-2 text-[14px] w-full bg-white"
      >
        <option value="">Selecione...</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ============================ HELPERS ============================== */

function isoDate(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function formatBR(iso) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

// id simples para mock (evita depender de backend)
function cryptoId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `id_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}
