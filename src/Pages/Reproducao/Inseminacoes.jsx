import { useState, useMemo } from "react";
import { format, parseISO, isWithinInterval, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Inseminacoes({ animais, onRegistrar }) {
  const [filtro, setFiltro] = useState({ periodo: 30, touro: "", busca: "" });
  const [showModal, setShowModal] = useState(false);

  // Filtra animais inseminados no período
  const inseminados = useMemo(() => {
    const hoje = new Date();
    const periodoInicio = subDays(hoje, Number(filtro.periodo));
    
    return animais.filter(animal => {
      if (!animal.ultima_ia) return false;
      
      const dataIA = parseISO(animal.ultima_ia);
      const noPeriodo = filtro.periodo === 0 || isWithinInterval(dataIA, { start: periodoInicio, end: hoje });
      const matchBusca = !filtro.busca || 
        animal.numero.toLowerCase().includes(filtro.busca.toLowerCase()) ||
        animal.brinco.toLowerCase().includes(filtro.busca.toLowerCase());
      
      return noPeriodo && matchBusca;
    }).sort((a, b) => new Date(b.ultima_ia) - new Date(a.ultima_ia));
  }, [animais, filtro]);

  const stats = {
    total: inseminados.length,
    prenhes: inseminados.filter(a => a.status === "prenhe").length,
    pendentes: inseminados.filter(a => a.status === "inseminada").length,
    taxa: inseminados.length > 0 
      ? Math.round((inseminados.filter(a => a.status === "prenhe").length / inseminados.length) * 100) 
      : 0
  };

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Total IAs", value: stats.total, cor: "blue" },
          { label: "Prenhes", value: stats.prenhes, cor: "green" },
          { label: "Pendentes DG", value: stats.pendentes, cor: "orange" },
          { label: "Taxa Concepção", value: `${stats.taxa}%`, cor: "purple" }
        ].map((stat, i) => (
          <div key={i} className={`bg-${stat.cor}-50 border-l-4 border-${stat.cor}-500 p-4 rounded-r-lg shadow-sm`}>
            <div className="text-sm text-gray-600 font-medium">{stat.label}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Período</label>
          <select 
            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={filtro.periodo}
            onChange={e => setFiltro({...filtro, periodo: Number(e.target.value)})}
          >
            <option value={30}>Últimos 30 dias</option>
            <option value={60}>Últimos 60 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={0}>Todo o período</option>
          </select>
        </div>
        
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Buscar</label>
          <input 
            type="text"
            placeholder="Número ou brinco..."
            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            value={filtro.busca}
            onChange={e => setFiltro({...filtro, busca: e.target.value})}
          />
        </div>

        <button 
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
        >
          🖨️ Imprimir
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-6 py-4 font-bold">Data</th>
                <th className="px-6 py-4 font-bold">Animal</th>
                <th className="px-6 py-4 font-bold">Dias p/ Parto</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {inseminados.map(animal => {
                const dataIA = parseISO(animal.ultima_ia);
                const proxDG = new Date(dataIA);
                proxDG.setDate(proxDG.getDate() + 30);
                
                return (
                  <tr key={animal.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium">
                      {format(dataIA, "dd/MM/yyyy", { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{animal.numero}</div>
                      <div className="text-xs text-gray-500">Brinco: {animal.brinco}</div>
                    </td>
                    <td className="px-6 py-4">
                      {animal.status === "prenhe" && animal.previsao_parto ? (
                        <span className="text-green-600 font-medium">
                          {Math.ceil((new Date(animal.previsao_parto) - new Date()) / (1000 * 60 * 60 * 24))} dias
                        </span>
                      ) : (
                        <span className="text-gray-400">---</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`
                        px-3 py-1 rounded-full text-xs font-bold
                        ${animal.status === "prenhe" ? "bg-green-100 text-green-800" : 
                          animal.status === "inseminada" ? "bg-yellow-100 text-yellow-800" : 
                          "bg-gray-100 text-gray-800"}
                      `}>
                        {animal.status === "prenhe" ? "Prenhe" : 
                         animal.status === "inseminada" ? "Aguardando DG" : "Vazia"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-800 font-medium text-sm">
                        Ver Ficha →
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {inseminados.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Nenhuma inseminação encontrada no período selecionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}