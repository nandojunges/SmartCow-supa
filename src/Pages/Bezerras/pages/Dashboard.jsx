import React, { useMemo } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Activity,
  DollarSign,
  HeartPulse,
} from "lucide-react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { mockBezerras } from "../data/mockData";
import Card from "../components/ui/Card";

const formatDateSafe = (d, fallback = "—") => {
  if (!d) return fallback;
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("pt-BR");
};

const Dashboard = () => {
  const stats = useMemo(() => {
    const total = mockBezerras.length;
    const emAlerta = mockBezerras.filter(
      (b) => b.status === "alerta" || b.status === "critico"
    ).length;

    const emTratamento = mockBezerras.filter((b) =>
      (b.ocorrencias || []).some((o) => !o.dataFim)
    ).length;

    const desmamadas = mockBezerras.filter((b) => b.categoria === "desmamada")
      .length;

    const custoSanitario = mockBezerras.reduce(
      (acc, b) =>
        acc +
        (b.ocorrencias || []).reduce((sum, o) => sum + (o.custo || 0), 0),
      0
    );

    return { total, emAlerta, emTratamento, desmamadas, custoSanitario };
  }, []);

  // Dados para gráficos (mock)
  const dataCrescimento = [
    { mes: "Jan", esperado: 45, real: 42 },
    { mes: "Fev", esperado: 52, real: 50 },
    { mes: "Mar", esperado: 68, real: 72 },
    { mes: "Abr", esperado: 85, real: 88 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Dashboard Executivo
          </h2>
          <p className="text-slate-400">
            Visão geral do desempenho do lote atual
          </p>
        </div>

        <div className="flex gap-3">
          <select className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500">
            <option>Últimos 30 dias</option>
            <option>Últimos 90 dias</option>
            <option>Tempo total</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card
          title="Total Bezerras"
          value={stats.total}
          trend="+12% vs mês passado"
          trendUp={true}
          icon={Activity}
          color="cyan"
        />
        <Card
          title="Em Tratamento"
          value={stats.emTratamento}
          trend="3 casos críticos"
          trendUp={false}
          icon={HeartPulse}
          color="red"
        />
        <Card
          title="Média GMD"
          value="0.82 kg/dia"
          trend="+0.05 vs meta"
          trendUp={true}
          icon={TrendingUp}
          color="emerald"
        />
        <Card
          title="Custo Sanitário"
          value={`R$ ${stats.custoSanitario.toLocaleString("pt-BR")}`}
          trend="R$ 45/bezerra"
          trendUp={false}
          icon={DollarSign}
          color="amber"
        />
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Crescimento */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-white">
              Curva de Crescimento Média
            </h3>
            <div className="flex gap-2">
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-3 h-3 rounded-full bg-cyan-500" />
                Real
              </span>
              <span className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-3 h-3 rounded-full bg-slate-600" />
                Esperado
              </span>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataCrescimento}>
                <defs>
                  <linearGradient id="colorReal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="mes" stroke="#475569" />
                <YAxis stroke="#475569" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid #1e293b",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="real"
                  stroke="#06b6d4"
                  fillOpacity={1}
                  fill="url(#colorReal)"
                  strokeWidth={3}
                />
                <Line
                  type="monotone"
                  dataKey="esperado"
                  stroke="#475569"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alertas Recentes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Alertas Prioritários
          </h3>

          <div className="space-y-3">
            {mockBezerras
              .filter((b) => b.status !== "saudavel")
              .slice(0, 4)
              .map((bezerra) => (
                <div
                  key={bezerra.id}
                  className="flex items-start gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-red-900/50 transition-colors cursor-pointer"
                >
                  <div
                    className={`w-2 h-2 rounded-full mt-2 ${
                      bezerra.status === "critico"
                        ? "bg-red-500 animate-pulse"
                        : "bg-amber-500"
                    }`}
                  />
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <span className="font-medium text-white text-sm">
                        {bezerra.brinco}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDateSafe(bezerra.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {bezerra.ocorrencias?.find((o) => !o.dataFim)?.tipo ||
                        "Manejo atrasado"}
                    </p>
                  </div>
                </div>
              ))}
          </div>

          <button className="w-full mt-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 border border-cyan-900/30 rounded-lg hover:bg-cyan-950/30 transition-all">
            Ver todos os alertas
          </button>
        </div>
      </div>

      {/* Tabela Resumo */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-white">
            Últimas Movimentações
          </h3>
          <button className="text-sm text-cyan-400 hover:text-cyan-300">
            Exportar CSV
          </button>
        </div>

        <table className="w-full">
          <thead className="bg-slate-950">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">
                Animal
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">
                Evento
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">
                Data
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">
                Status
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {mockBezerras.slice(0, 5).map((bezerra, idx) => {
              const ultimaPesagem =
                bezerra.pesagens?.[bezerra.pesagens.length - 1]?.data;

              return (
                <tr
                  key={bezerra.id || idx}
                  className="hover:bg-slate-800/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-cyan-400">
                        {bezerra.nome?.charAt(0) || "B"}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">
                          {bezerra.brinco}
                        </div>
                        <div className="text-xs text-slate-500">
                          {bezerra.nome}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-6 text-sm text-slate-300">
                    Pesagem rotineira
                  </td>

                  <td className="py-4 px-6 text-sm text-slate-400">
                    {formatDateSafe(ultimaPesagem)}
                  </td>

                  <td className="py-4 px-6">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        bezerra.status === "saudavel"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : bezerra.status === "alerta"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {bezerra.status === "saudavel" ? "Normal" : "Atenção"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
