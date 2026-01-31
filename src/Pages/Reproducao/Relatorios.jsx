import { useMemo, useState } from "react";
import { format, subDays, isWithinInterval, parseISO } from "date-fns";

export default function Relatorios({ eventos, animais, touros }) {
  const [periodo, setPeriodo] = useState(90);
  const [aba, setAba] = useState("concepcao");

  // Métricas calculadas
  const metricas = useMemo(() => {
    const hoje = new Date();
    const inicio = subDays(hoje, periodo);
    
    const eventosPeriodo = eventos.filter(e => {
      const data = new Date(e.data);
      return isWithinInterval(data, { start: inicio, end: hoje });
    });

    const ias = eventosPeriodo.filter(e => e.tipo === "IA");
    const dgs = eventosPeriodo.filter(e => e.tipo === "DG");
    
    const concepcoes = dgs.filter(e => e.resultado === "prenhe").length;
    const taxa = ias.length > 0 ? Math.round((concepcoes / ias.length) * 100) : 0;

    // Por touro
    const porTouro = {};
    ias.forEach(ia => {
      const nome = ia.touro_nome || "Não identificado";
      if (!porTouro[nome]) porTouro[nome] = { total: 0, prenhes: 0 };
      porTouro[nome].total++;
      
      // Verifica se teve DG posterior positivo
      const dgPositivo = dgs.find(dg => 
        dg.animal_id === ia.animal_id && 
        dg.resultado === "prenhe" &&
        new Date(dg.data) > new Date(ia.data)
      );
      if (dgPositivo) porTouro[nome].prenhes++;
    });

    return {
      totalIAs: ias.length,
      totalDGs: dgs.length,
      taxaConcepcao: taxa,
      porTouro: Object.entries(porTouro).map(([nome, stats]) => ({
        nome,
        ...stats,
        taxa: stats.total > 0 ? Math.round((stats.prenhes / stats.total) * 100) : 0
      })).sort((a, b) => b.taxa - a.taxa),
      animaisPrenhes: animais.filter(a => a.status === "prenhe").length,
      animaisVazios: animais.filter(a => a.status === "vazia").length
    };
  }, [eventos, periodo, animais]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          {[
            { id: "concepcao", label: "Taxas de Concepção" },
            { id: "touros", label: "Ranking de Touros" },
            { id: "fila", label: "Fila de Trabalho" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                aba === tab.id ? "bg-white text-blue-600 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select 
          value={periodo}
          onChange={e => setPeriodo(Number(e.target.value))}
          className="border-gray-300 rounded-lg text-sm"
        >
          <option value={30}>Últimos 30 dias</option>
          <option value={60}>Últimos 60 dias</option>
          <option value={90}>Últimos 90 dias</option>
          <option value={180}>Últimos 6 meses</option>
          <option value={365}>Último ano</option>
        </select>
      </div>

      {/* Conteúdo por aba */}
      {aba === "concepcao" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
            <div className="text-blue-100 text-sm font-medium mb-1">Taxa de Concepção</div>
            <div className="text-4xl font-bold">{metricas.taxaConcepcao}%</div>
            <div className="text-blue-100 text-sm mt-2">Meta: &gt;45%</div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-sm font-medium mb-1">Total de IAs</div>
            <div className="text-3xl font-bold text-gray-900">{metricas.totalIAs}</div>
          </div>
          
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-sm font-medium mb-1">Diagnósticos</div>
            <div className="text-3xl font-bold text-gray-900">{metricas.totalDGs}</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="text-gray-500 text-sm font-medium mb-1">Prenhes Confirmadas</div>
            <div className="text-3xl font-bold text-green-600">
              {metricas.animaisPrenhes}
            </div>
          </div>

          <div className="md:col-span-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg mb-4">Distribuição de Status</h3>
            <div className="h-64 flex items-end gap-8 justify-center border-b border-gray-200 pb-4">
              {[
                { label: "Prenhes", valor: metricas.animaisPrenhes, cor: "bg-green-500" },
                { label: "Vazios", valor: metricas.animaisVazios, cor: "bg-red-500" },
                { label: "Aguardando DG", valor: metricas.totalIAs - metricas.totalDGs, cor: "bg-yellow-500" }
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div 
                    className={`w-24 ${item.cor} rounded-t-lg transition-all duration-1000`}
                    style={{ height: `${Math.max(20, (item.valor / (animais.length || 1)) * 200)}px` }}
                  />
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className="text-xl font-bold">{item.valor}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {aba === "touros" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-bold text-gray-700">Touro</th>
                <th className="px-6 py-3 text-center font-bold text-gray-700">Total IAs</th>
                <th className="px-6 py-3 text-center font-bold text-gray-700">Prenhes</th>
                <th className="px-6 py-3 text-center font-bold text-gray-700">Taxa %</th>
                <th className="px-6 py-3 text-center font-bold text-gray-700">Desempenho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {metricas.porTouro.map((touro, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{touro.nome}</td>
                  <td className="px-6 py-4 text-center">{touro.total}</td>
                  <td className="px-6 py-4 text-center font-bold text-green-600">{touro.prenhes}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-lg font-bold ${
                      touro.taxa >= 50 ? 'text-green-600' : touro.taxa >= 40 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {touro.taxa}%
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          touro.taxa >= 50 ? 'bg-green-500' : touro.taxa >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`} 
                        style={{ width: `${touro.taxa}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {metricas.porTouro.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Sem dados de inseminação no período.
            </div>
          )}
        </div>
      )}

      {aba === "fila" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-bold text-lg mb-4">Animais Aguardando Ação</h3>
          <div className="space-y-2">
            {animais
              .filter(a => !a.status || a.status === "vazia" || (a.status === "inseminada" && !a.status?.includes("dg")))
              .slice(0, 20)
              .map(animal => (
                <div key={animal.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-bold">{animal.numero}</span>
                    <span className="text-sm text-gray-500 ml-2">({animal.brinco})</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    !animal.ultima_ia ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {!animal.ultima_ia ? "Disponível para Protocolo" : "Aguardando DG"}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}