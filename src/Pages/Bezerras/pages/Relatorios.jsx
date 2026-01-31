import React, { useState } from 'react';
import { Download, TrendingUp, Activity, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const Relatorios = () => {
  const [periodo, setPeriodo] = useState('30');
  
  // Dados mockados para relatórios
  const dadosMortalidade = [
    { name: 'Neonatal (0-7d)', value: 2, color: '#ef4444' },
    { name: 'Aleitamento', value: 1, color: '#f59e0b' },
    { name: 'Transição', value: 0, color: '#10b981' },
    { name: 'Desmamadas', value: 0, color: '#06b6d4' },
  ];

  const dadosCausas = [
    { name: 'Diarreia', value: 45, color: '#ef4444' },
    { name: 'Pneumonia', value: 30, color: '#f59e0b' },
    { name: 'Onfalite', value: 15, color: '#8b5cf6' },
    { name: 'Outros', value: 10, color: '#64748b' },
  ];

  const relatoriosDisponiveis = [
    { id: 1, nome: 'Desempenho do Lote', tipo: 'Performance', ultimo: 'Hoje', icon: TrendingUp },
    { id: 2, nome: 'Morbidade e Mortalidade', tipo: 'Sanitário', ultimo: 'Ontem', icon: Activity },
    { id: 3, nome: 'Custos por Bezerra', tipo: 'Financeiro', ultimo: '3 dias atrás', icon: DollarSign },
    { id: 4, nome: 'Eficiência Alimentar', tipo: 'Nutrição', ultimo: '1 semana atrás', icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">Central de Relatórios</h2>
          <p className="text-slate-400">Análises e métricas avançadas do sistema</p>
        </div>
        <div className="flex gap-3">
          <select 
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
            <option value="365">Ano completo</option>
          </select>
          <button className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg">
            <Download size={18} />
            Exportar Todos
          </button>
        </div>
      </div>

      {/* Cards de Relatórios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {relatoriosDisponiveis.map((rel) => (
          <div key={rel.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-cyan-500/50 transition-all group cursor-pointer">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-cyan-600/20 transition-colors">
                <rel.icon className="text-cyan-400" size={24} />
              </div>
              <span className="text-xs text-slate-500">Atualizado: {rel.ultimo}</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">{rel.nome}</h3>
            <p className="text-sm text-slate-500 mb-4">{rel.tipo}</p>
            <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors">
              Gerar PDF
            </button>
          </div>
        ))}
      </div>

      {/* Dashboard de Estatísticas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Mortalidade */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Mortalidade por Fase</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosMortalidade}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dadosMortalidade.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-red-950/20 border border-red-900/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
              <Activity size={16} />
              Taxa de Mortalidade: 3.2% (Meta: &lt; 2%)
            </div>
          </div>
        </div>

        {/* Gráfico de Causas */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-6">Principais Causas de Morbidade</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosCausas}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {dadosCausas.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 p-4 bg-amber-950/20 border border-amber-900/30 rounded-lg">
            <p className="text-amber-400 text-sm">
              <strong>Alerta:</strong> Diarreia representa 45% dos casos. Recomendada revisão do protocolo de colostragem.
            </p>
          </div>
        </div>
      </div>

      {/* Tabela de Resumo */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">Resumo de Eficiência por Lote</h3>
        </div>
        <table className="w-full">
          <thead className="bg-slate-950">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">Lote</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">Nascidos</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">Vivos</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">Mortalidade</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">GMD Médio</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-slate-400 uppercase">Custo/Bezerra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            <tr className="hover:bg-slate-800/50">
              <td className="py-4 px-6 text-sm text-white font-medium">Lote 2024-A</td>
              <td className="py-4 px-6 text-sm text-slate-300">45</td>
              <td className="py-4 px-6 text-sm text-emerald-400">43</td>
              <td className="py-4 px-6 text-sm text-amber-400">4.4%</td>
              <td className="py-4 px-6 text-sm text-white">0.82 kg/dia</td>
              <td className="py-4 px-6 text-sm text-white">R$ 320,00</td>
            </tr>
            <tr className="hover:bg-slate-800/50">
              <td className="py-4 px-6 text-sm text-white font-medium">Lote 2024-B</td>
              <td className="py-4 px-6 text-sm text-slate-300">38</td>
              <td className="py-4 px-6 text-sm text-emerald-400">36</td>
              <td className="py-4 px-6 text-sm text-emerald-400">5.2%</td>
              <td className="py-4 px-6 text-sm text-white">0.75 kg/dia</td>
              <td className="py-4 px-6 text-sm text-white">R$ 295,00</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Relatorios;
