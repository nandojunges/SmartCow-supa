import React, { useContext, useMemo, useCallback } from "react";
import { AppContext } from "../Bezerras";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { AlertTriangle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Comparativo() {
  const ctx = useContext(AppContext);
  const navigate = useNavigate();

  const selectedBezerras = ctx?.selectedBezerras || [];
  const toggleBezerraSelection = ctx?.toggleBezerraSelection || (() => {});

  const handleLimpar = useCallback(() => {
    selectedBezerras.forEach((b) => toggleBezerraSelection(b));
  }, [selectedBezerras, toggleBezerraSelection]);

  if (selectedBezerras.length < 2) {
    return (
      <div className="h-[600px] flex flex-col items-center justify-center text-slate-500">
        <AlertTriangle size={64} className="mb-4 text-amber-500/50" />
        <h2 className="text-2xl font-bold text-white mb-2">Seleção Insuficiente</h2>
        <p className="mb-6">Selecione pelo menos 2 bezerras na lista para comparar</p>
        <button
          onClick={() => navigate("/bezerras")}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-lg transition-colors"
        >
          Ir para Lista de Bezerras
        </button>
      </div>
    );
  }

  const colors = ["#06b6d4", "#8b5cf6", "#ec4899", "#f59e0b"];

  // ========= Dados do gráfico (peso x idade) =========
  const chartData = useMemo(() => {
    const maxIdade = Math.max(
      ...selectedBezerras.flatMap((b) =>
        (Array.isArray(b?.pesagens) ? b.pesagens : []).map((p) => Number(p?.idadeDias) || 0)
      )
    );

    const datasComparativo = Array.from(
      { length: Math.floor(maxIdade / 15) + 1 },
      (_, i) => i * 15
    );

    return datasComparativo.map((idade) => {
      const point = { idade };

      selectedBezerras.forEach((bezerra, idx) => {
        const pesagens = Array.isArray(bezerra?.pesagens) ? bezerra.pesagens : [];

        // pega a ÚLTIMA pesagem com idadeDias <= idade (mais próxima)
        const pesagemMaisProxima = pesagens
          .filter((p) => (Number(p?.idadeDias) || 0) <= idade)
          .sort((a, b) => (Number(b?.idadeDias) || 0) - (Number(a?.idadeDias) || 0))[0];

        point[`bezerra${idx}`] = pesagemMaisProxima ? Number(pesagemMaisProxima.peso) : null;
      });

      return point;
    });
  }, [selectedBezerras]);

  // ========= Dados do gráfico de eficiência =========
  const barData = useMemo(() => {
    return selectedBezerras.map((b) => {
      const pesoAtual = Number(b?.pesoAtual) || 0;
      const pesoNascimento = Number(b?.pesoNascimento) || 0;
      const ganho = pesoAtual - pesoNascimento;

      const ocorrencias = Array.isArray(b?.ocorrencias) ? b.ocorrencias : [];
      const custo = ocorrencias.reduce((acc, o) => acc + (Number(o?.custo) || 0), 0);

      return {
        name: b?.brinco || "—",
        ganho,
        custo,
        eficiencia: custo > 0 ? Number((ganho / custo).toFixed(2)) : null,
      };
    });
  }, [selectedBezerras]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Análise Comparativa</h2>
          <p className="text-slate-400">Comparando {selectedBezerras.length} animais selecionados</p>
        </div>
        <button onClick={handleLimpar} className="text-red-400 hover:text-red-300 text-sm">
          Limpar seleção
        </button>
      </div>

      {/* Cards Comparativos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {selectedBezerras.map((bezerra, idx) => {
          const nascimento = bezerra?.dataNascimento ? new Date(bezerra.dataNascimento) : null;
          const idadeDias = nascimento ? Math.floor((Date.now() - nascimento.getTime()) / (1000 * 60 * 60 * 24)) : 0;

          const pesoAtual = Number(bezerra?.pesoAtual) || 0;
          const pesoNascimento = Number(bezerra?.pesoNascimento) || 0;

          const gmd = (idadeDias > 0 ? (pesoAtual - pesoNascimento) / idadeDias : 0).toFixed(2);

          const ocorrencias = Array.isArray(bezerra?.ocorrencias) ? bezerra.ocorrencias : [];
          const custoSanitario = ocorrencias.reduce((a, b) => a + (Number(b?.custo) || 0), 0);

          return (
            <div
              key={bezerra?.id || idx}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative group"
            >
              <button
                onClick={() => toggleBezerraSelection(bezerra)}
                className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                type="button"
                title="Remover da comparação"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[idx] }} />
                <h3 className="font-bold text-white">{bezerra?.brinco || "—"}</h3>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Peso Atual</span>
                  <span className="text-white font-medium">{pesoAtual} kg</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">GMD</span>
                  <span
                    className={`font-medium ${
                      parseFloat(gmd) >= 0.7 ? "text-emerald-400" : parseFloat(gmd) >= 0.5 ? "text-amber-400" : "text-red-400"
                    }`}
                  >
                    {gmd} kg/dia
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Ocorrências</span>
                  <span className="text-white font-medium">{ocorrencias.length}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Custo Sanitário</span>
                  <span className="text-white font-medium">R$ {custoSanitario}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Gráfico Comparativo */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Evolução do Peso</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="idade"
                stroke="#475569"
                label={{ value: "Idade (dias)", fill: "#475569", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                stroke="#475569"
                label={{ value: "Peso (kg)", fill: "#475569", angle: -90, position: "insideLeft" }}
              />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }} />
              <Legend />

              {selectedBezerras.map((bezerra, idx) => (
                <Line
                  key={bezerra?.id || idx}
                  type="monotone"
                  dataKey={`bezerra${idx}`}
                  name={bezerra?.brinco || `Bezerra ${idx + 1}`}
                  stroke={colors[idx]}
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Análise de Custo-Benefício */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Análise de Eficiência</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#475569" />
              <YAxis stroke="#475569" />
              <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b" }} />
              <Legend />
              <Bar dataKey="ganho" name="Ganho de Peso (kg)" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              <Bar dataKey="custo" name="Custo Sanitário (R$)" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
