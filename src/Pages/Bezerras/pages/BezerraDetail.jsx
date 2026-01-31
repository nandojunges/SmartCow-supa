// src/Pages/Bezerras/pages/BezerraDetail.jsx
import React, { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Printer,
  Weight,
  Activity,
  Calendar,
  HeartPulse,
  FileText,
  Clock,
  CheckCircle2,
} from "lucide-react";

import { mockBezerras } from "../data/mockData";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

import Timeline from "../components/bezerras/Timeline";
import Modal from "../components/ui/Modal";

export default function BezerraDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("visao-geral");
  const [showModal, setShowModal] = useState(null);

  const bezerra = useMemo(() => {
    const found = mockBezerras.find((b) => b.id === id);
    return found || mockBezerras[0]; // fallback demo
  }, [id]);

  // Proteções básicas pra não quebrar se vier dado incompleto
  const status = bezerra?.status || "alerta";
  const nome = bezerra?.nome || "—";
  const brinco = bezerra?.brinco || "—";
  const origem = bezerra?.origem || "—";
  const dataNascimento = bezerra?.dataNascimento ? new Date(bezerra.dataNascimento) : null;

  const idadeDias = useMemo(() => {
    if (!dataNascimento) return 0;
    const diff = Date.now() - dataNascimento.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  }, [dataNascimento]);

  const pesagens = Array.isArray(bezerra?.pesagens) ? bezerra.pesagens : [];
  const ocorrencias = Array.isArray(bezerra?.ocorrencias) ? bezerra.ocorrencias : [];
  const manejos = Array.isArray(bezerra?.manejos) ? bezerra.manejos : [];

  // Dados do gráfico (simulação de esperado)
  const chartData = useMemo(() => {
    return pesagens.map((p) => ({
      idade: p.idadeDias,
      peso: p.peso,
      esperado: 40 + p.idadeDias * 0.8,
    }));
  }, [pesagens]);

  const tabs = [
    { id: "visao-geral", label: "Visão Geral", icon: Activity },
    { id: "saude", label: "Carteira Sanitária", icon: HeartPulse },
    { id: "manejos", label: "Protocolos", icon: CheckCircle2 },
    { id: "documentos", label: "Documentos", icon: FileText },
  ];

  const statusClass = useMemo(() => {
    if (status === "saudavel") return "bg-emerald-500/20 text-emerald-400";
    if (status === "critico") return "bg-red-500/20 text-red-400";
    if (status === "tratamento") return "bg-blue-500/20 text-blue-400";
    return "bg-amber-500/20 text-amber-400";
  }, [status]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/bezerras")}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            type="button"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">{brinco}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                {String(status).toUpperCase()}
              </span>
            </div>
            <p className="text-slate-400">
              {nome} • Filha de {origem}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-700 transition-colors"
            type="button"
            onClick={() => window.print()}
          >
            <Printer size={18} />
            Imprimir Ficha
          </button>

          <button
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg transition-colors"
            type="button"
            onClick={() => {
              // placeholder (você pode trocar por abrir modal real de edição)
              alert("Editar cadastro (placeholder).");
            }}
          >
            <Edit size={18} />
            Editar Cadastro
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Data Nascimento"
          value={dataNascimento ? dataNascimento.toLocaleDateString("pt-BR") : "—"}
          icon={Calendar}
          color="slate"
        />
        <InfoCard
          label="Peso ao Nascer"
          value={`${bezerra?.pesoNascimento ?? "—"} kg`}
          icon={Weight}
          color="cyan"
        />
        <InfoCard
          label="Peso Atual"
          value={`${bezerra?.pesoAtual ?? "—"} kg`}
          icon={Activity}
          color="emerald"
        />
        <InfoCard
          label="Idade"
          value={`${idadeDias} dias`}
          icon={Clock}
          color="slate"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <div className="flex gap-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 px-2 text-sm font-medium transition-colors border-b-2 ${
                  isActive ? "text-cyan-400 border-cyan-400" : "text-slate-400 border-transparent hover:text-white"
                }`}
                type="button"
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo das Tabs */}
      <div className="min-h-[400px]">
        {activeTab === "visao-geral" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gráfico */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-white">Curva de Crescimento</h3>
                <button
                  onClick={() => setShowModal("pesagem")}
                  className="text-sm text-cyan-400 hover:text-cyan-300"
                  type="button"
                >
                  + Registrar Pesagem
                </button>
              </div>

              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="idade"
                      stroke="#475569"
                      label={{ value: "Dias de Vida", fill: "#475569", position: "insideBottom", offset: -5 }}
                    />
                    <YAxis
                      stroke="#475569"
                      label={{ value: "Peso (kg)", fill: "#475569", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid #1e293b",
                        borderRadius: "8px",
                      }}
                    />
                    <Line type="monotone" dataKey="peso" stroke="#06b6d4" strokeWidth={3} dot={{ fill: "#06b6d4", r: 4 }} />
                    <Line type="monotone" dataKey="esperado" stroke="#475569" strokeDasharray="5 5" strokeWidth={2} />
                    <ReferenceLine
                      y={(bezerra?.pesoNascimento || 0) * 2}
                      stroke="#10b981"
                      strokeDasharray="3 3"
                      label={{ value: "Meta Desmama", fill: "#10b981", fontSize: 12 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {pesagens.length === 0 && (
                <div className="mt-4 text-sm text-slate-500">
                  Nenhuma pesagem cadastrada ainda. Clique em <span className="text-cyan-400">Registrar Pesagem</span>.
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Linha do Tempo</h3>
              <Timeline
                events={[
                  ...(bezerra?.dataNascimento
                    ? [{ date: bezerra.dataNascimento, title: "Nascimento", type: "birth" }]
                    : []),
                  ...pesagens.map((p) => ({ date: p.data, title: `Pesagem: ${p.peso}kg`, type: "weight" })),
                  ...ocorrencias.map((o) => ({
                    date: o.dataInicio,
                    title: o.tipo,
                    type: "health",
                    severity: o.gravidade,
                  })),
                ]}
              />
            </div>
          </div>
        )}

        {activeTab === "saude" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Histórico de Ocorrências</h3>
              <button
                onClick={() => setShowModal("ocorrencia")}
                className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg transition-colors border border-red-900/50"
                type="button"
              >
                + Registrar Ocorrência
              </button>
            </div>

            <table className="w-full">
              <thead className="bg-slate-950">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">Data</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">Tipo</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">Gravidade</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">Tratamento</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">Custo</th>
                  <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {ocorrencias.length > 0 ? (
                  ocorrencias.map((oco, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/50">
                      <td className="py-4 px-6 text-sm text-slate-300">
                        {oco?.dataInicio ? new Date(oco.dataInicio).toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="py-4 px-6 text-sm text-white capitalize">{oco?.tipo || "—"}</td>
                      <td className="py-4 px-6">
                        <SeverityBadge level={oco?.gravidade || "leve"} />
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-400">{oco?.tratamento || "—"}</td>
                      <td className="py-4 px-6 text-sm text-slate-300">R$ {oco?.custo ?? "-"}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            oco?.dataFim ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {oco?.dataFim ? "Resolvido" : "Em tratamento"}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500">
                      Nenhuma ocorrência registrada
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "manejos" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {manejos.length > 0 ? (
              manejos.map((manejo, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-start gap-4"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      manejo.status === "realizado"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : manejo.status === "atrasado"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    <CheckCircle2 size={24} />
                  </div>

                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-white font-medium capitalize">
                        {String(manejo?.tipo || "—").replace("_", " ")}
                      </h4>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          manejo.status === "realizado"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : manejo.status === "atrasado"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {manejo?.status || "pendente"}
                      </span>
                    </div>

                    <p className="text-sm text-slate-400 mt-1">{manejo?.protocolo || "—"}</p>

                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {manejo?.data ? new Date(manejo.data).toLocaleDateString("pt-BR") : "—"}
                      </span>
                      {manejo?.responsavel && <span>Téc.: {manejo.responsavel}</span>}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-slate-500">Nenhum protocolo/manejo registrado.</div>
            )}
          </div>
        )}

        {activeTab === "documentos" && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Documentos</h3>
              <button
                type="button"
                className="text-sm text-cyan-400 hover:text-cyan-300"
                onClick={() => alert("Upload de documentos (placeholder).")}
              >
                + Adicionar documento
              </button>
            </div>

            <div className="text-sm text-slate-400">
              Placeholder: aqui você pode listar anexos (atestado, exames, notas) por bezerra.
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {showModal === "pesagem" && (
        <Modal title="Registrar Pesagem" onClose={() => setShowModal(null)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              // placeholder: você vai integrar com supabase / state real
              setShowModal(null);
              alert("Pesagem salva (placeholder).");
            }}
          >
            <div>
              <label className="block text-sm text-slate-400 mb-2">Data</label>
              <input
                type="date"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
                placeholder="Ex: 45.5"
              />
            </div>

            <div className="bg-cyan-950/30 p-4 rounded-lg border border-cyan-900/50">
              <div className="text-sm text-cyan-400 font-medium">Previsão de GMD</div>
              <div className="text-2xl font-bold text-white mt-1">+0.72 kg/dia</div>
              <div className="text-xs text-slate-500">Baseado na última pesagem</div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button type="submit" className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded-lg">
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showModal === "ocorrencia" && (
        <Modal title="Registrar Ocorrência" onClose={() => setShowModal(null)}>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setShowModal(null);
              alert("Ocorrência salva (placeholder).");
            }}
          >
            <div>
              <label className="block text-sm text-slate-400 mb-2">Data de início</label>
              <input
                type="date"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Tipo</label>
              <input
                type="text"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
                placeholder="Ex: diarreia, pneumonia..."
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">Gravidade</label>
              <select className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white">
                <option value="leve">Leve</option>
                <option value="moderada">Moderada</option>
                <option value="grave">Grave</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowModal(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg"
              >
                Cancelar
              </button>
              <button type="submit" className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg">
                Salvar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* =======================
   Componentes auxiliares
   ======================= */

function InfoCard({ label, value, icon: Icon, color = "slate" }) {
  // Tailwind-safe: classes fixas (nada de template string dinâmico)
  const iconColorClass =
    color === "cyan"
      ? "text-cyan-400"
      : color === "emerald"
      ? "text-emerald-400"
      : color === "red"
      ? "text-red-400"
      : color === "amber"
      ? "text-amber-400"
      : "text-slate-400";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-3 mb-2">
        <Icon size={18} className={iconColorClass} />
        <span className="text-slate-500 text-sm">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function SeverityBadge({ level }) {
  const styles = {
    leve: "bg-yellow-500/20 text-yellow-400",
    moderada: "bg-orange-500/20 text-orange-400",
    grave: "bg-red-500/20 text-red-400",
  };

  const safe = styles[level] ? level : "leve";

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[safe]}`}>
      {safe.charAt(0).toUpperCase() + safe.slice(1)}
    </span>
  );
}
