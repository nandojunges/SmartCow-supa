import { useState } from "react";
import { Plus, Edit2, Trash2, Package } from "lucide-react"; // Você pode usar SVG ou emojis se preferir

const CardEntidade = ({ titulo, icon, cor }) => (
  <div className={`flex items-center gap-3 p-4 rounded-t-xl ${cor} text-white`}>
    <span className="text-2xl">{icon}</span>
    <h3 className="font-bold text-lg">{titulo}</h3>
  </div>
);

export default function Cadastro({ touros, inseminadores, onUpdate }) {
  const [aba, setAba] = useState("touros");
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({});

  const handleSalvar = () => {
    const tipo = aba === "touros" ? "touros" : "inseminadores";
    const lista = aba === "touros" ? touros : inseminadores;
    
    if (editando) {
      const novaLista = lista.map(item => item.id === editando.id ? { ...form, id: editando.id } : item);
      onUpdate(tipo, novaLista);
    } else {
      const novoItem = { ...form, id: crypto.randomUUID() };
      onUpdate(tipo, [...lista, novoItem]);
    }
    
    setEditando(null);
    setForm({});
  };

  const handleExcluir = (id) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    const tipo = aba === "touros" ? "touros" : "inseminadores";
    const lista = aba === "touros" ? touros : inseminadores;
    onUpdate(tipo, lista.filter(item => item.id !== id));
  };

  const renderForm = () => {
    if (aba === "touros") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 bg-white p-6 rounded-b-xl border border-t-0 border-gray-200 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Touro *</label>
            <input 
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={form.nome || ""}
              onChange={e => setForm({...form, nome: e.target.value})}
              placeholder="Ex: Alta Legend"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código/Raça</label>
            <input 
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={form.codigo || ""}
              onChange={e => setForm({...form, codigo: e.target.value})}
              placeholder="Ex: ABS-001 / Holandês"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Doses Disponíveis</label>
            <input 
              type="number"
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={form.doses_restantes || ""}
              onChange={e => setForm({...form, doses_restantes: Number(e.target.value)})}
            />
          </div>
          <div className="md:col-span-3 flex justify-end gap-2">
            {editando && (
              <button 
                onClick={() => { setEditando(null); setForm({}); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
            )}
            <button 
              onClick={handleSalvar}
              disabled={!form.nome}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
            >
              {editando ? "Atualizar" : "Adicionar"} Touro
            </button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 bg-white p-6 rounded-b-xl border border-t-0 border-gray-200 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input 
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={form.nome || ""}
              onChange={e => setForm({...form, nome: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Registro Profissional</label>
            <input 
              className="w-full rounded-lg border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={form.registro || ""}
              onChange={e => setForm({...form, registro: e.target.value})}
              placeholder="Ex: CRMV-1234"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            {editando && (
              <button 
                onClick={() => { setEditando(null); setForm({}); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
            )}
            <button 
              onClick={handleSalvar}
              disabled={!form.nome}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {editando ? "Atualizar" : "Adicionar"} Inseminador
            </button>
          </div>
        </div>
      );
    }
  };

  const dados = aba === "touros" ? touros : inseminadores;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setAba("touros")}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            aba === "touros" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          🐂 Touros ({touros?.length || 0})
        </button>
        <button
          onClick={() => setAba("inseminadores")}
          className={`px-6 py-3 font-medium border-b-2 transition-colors ${
            aba === "inseminadores" 
              ? "border-green-600 text-green-600" 
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          👤 Inseminadores ({inseminadores?.length || 0})
        </button>
      </div>

      <div className="space-y-6">
        {renderForm()}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-gray-700">Nome</th>
                {aba === "touros" ? (
                  <>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Código</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Estoque</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-700">Status</th>
                  </>
                ) : (
                  <th className="px-6 py-3 text-left font-semibold text-gray-700">Registro</th>
                )}
                <th className="px-6 py-3 text-right font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dados.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.nome}</td>
                  {aba === "touros" ? (
                    <>
                      <td className="px-6 py-4 text-gray-600">{item.codigo || "---"}</td>
                      <td className="px-6 py-4">
                        {item.doses_restantes !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${item.doses_restantes < 10 ? 'bg-red-500' : 'bg-blue-500'}`}
                                style={{ width: `${Math.min(100, (item.doses_restantes / 50) * 100)}%` }}
                              />
                            </div>
                            <span className="text-sm">{item.doses_restantes}</span>
                          </div>
                        ) : "---"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          item.doses_restantes > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                        }`}>
                          {item.doses_restantes > 0 ? "Ativo" : "Sem Estoque"}
                        </span>
                      </td>
                    </>
                  ) : (
                    <td className="px-6 py-4 text-gray-600">{item.registro || "---"}</td>
                  )}
                  <td className="px-6 py-4 text-right space-x-2">
                    <button 
                      onClick={() => { setEditando(item); setForm(item); }}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button 
                      onClick={() => handleExcluir(item.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                      title="Excluir"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {dados.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum {aba === "touros" ? "touro" : "inseminador"} cadastrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}