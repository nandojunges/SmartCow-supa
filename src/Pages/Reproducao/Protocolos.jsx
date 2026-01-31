import { useState } from "react";
import { format, addDays } from "date-fns";

const TEMPLATES = {
  iatf: [
    { dia: 0, descricao: "GnRH + Inserir DIU", tipo: "inicio" },
    { dia: 7, descricao: "PGF2α + Retirar DIU", tipo: "meio" },
    { dia: 9, descricao: "Inseminação + GnRH", tipo: "fim" }
  ],
  presync: [
    { dia: 0, descricao: "GnRH", tipo: "inicio" },
    { dia: 7, descricao: "PGF2α", tipo: "fim" }
  ]
};

export default function Protocolos({ protocolos, animais, onUpdate }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [protocoloEdit, setProtocoloEdit] = useState(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ nome: "", tipo: "IATF", etapas: [] });

  const aplicarTemplate = (tipo) => {
    setForm({
      ...form,
      tipo: tipo.toUpperCase(),
      etapas: TEMPLATES[tipo].map((e, i) => ({ ...e, id: i }))
    });
  };

  const adicionarEtapa = () => {
    setForm({
      ...form,
      etapas: [...form.etapas, { dia: form.etapas.length, descricao: "", tipo: "acoes" }]
    });
  };

  const removerEtapa = (index) => {
    setForm({
      ...form,
      etapas: form.etapas.filter((_, i) => i !== index)
    });
  };

  const salvar = () => {
    if (!form.nome) return alert("Informe o nome do protocolo");
    
    const novoProtocolo = {
      id: protocoloEdit?.id || crypto.randomUUID(),
      ...form
    };

    if (protocoloEdit) {
      onUpdate(protocolos.map(p => p.id === protocoloEdit.id ? novoProtocolo : p));
    } else {
      onUpdate([...protocolos, novoProtocolo]);
    }
    
    fecharModal();
  };

  const fecharModal = () => {
    setModalAberto(false);
    setProtocoloEdit(null);
    setForm({ nome: "", tipo: "IATF", etapas: [] });
    setStep(1);
  };

  const excluir = (id) => {
    if (!confirm("Excluir este protocolo?")) return;
    onUpdate(protocolos.filter(p => p.id !== id));
  };

  const animaisPorProtocolo = (protocoloId) => {
    return animais.filter(a => a.protocolo_aplicado === protocoloId).length;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Protocolos de Sincronização</h2>
        <button 
          onClick={() => { setModalAberto(true); setStep(1); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <span>+</span> Novo Protocolo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {protocolos.map(protocolo => (
          <div key={protocolo.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className={`h-2 ${protocolo.tipo === 'IATF' ? 'bg-purple-500' : 'bg-orange-500'}`} />
            <div className="p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    protocolo.tipo === 'IATF' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {protocolo.tipo}
                  </span>
                  <h3 className="font-bold text-lg text-gray-900 mt-2">{protocolo.nome}</h3>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setProtocoloEdit(protocolo); setForm(protocolo); setModalAberto(true); }} className="p-1 text-gray-400 hover:text-blue-600">
                    ✏️
                  </button>
                  <button onClick={() => excluir(protocolo.id)} className="p-1 text-gray-400 hover:text-red-600">
                    🗑️
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {protocolo.etapas?.map((etapa, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 text-xs">
                      D{etapa.dia}
                    </span>
                    <span className="text-gray-700">{etapa.descricao}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                <span className="text-gray-500">
                  {protocolo.etapas?.length || 0} etapas
                </span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                  {animaisPorProtocolo(protocolo.id)} animais
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {protocolos.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-gray-500">Nenhum protocolo cadastrado. Crie o primeiro!</p>
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">
                {protocoloEdit ? "Editar" : "Novo"} Protocolo
              </h3>
              <button onClick={fecharModal} className="text-white/80 hover:text-white">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Protocolo</label>
                    <input 
                      className="w-full rounded-lg border-gray-300"
                      value={form.nome}
                      onChange={e => setForm({...form, nome: e.target.value})}
                      placeholder="Ex: IATF 9 dias - High Conception"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                    <div className="flex gap-3">
                      {['IATF', 'PRESYNC'].map(tipo => (
                        <button
                          key={tipo}
                          onClick={() => setForm({...form, tipo})}
                          className={`flex-1 py-3 rounded-lg border-2 font-medium transition-all ${
                            form.tipo === tipo 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {tipo === 'IATF' ? 'IATF (Inseminação)' : 'Pré-sincronização'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-3">Usar template rápido:</p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => aplicarTemplate('iatf')}
                        className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
                      >
                        IATF Padrão
                      </button>
                      <button 
                        onClick={() => aplicarTemplate('presync')}
                        className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
                      >
                        Presync Simples
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-gray-700">Etapas do Protocolo</h4>
                    <button onClick={adicionarEtapa} className="text-blue-600 text-sm font-medium hover:underline">
                      + Adicionar Etapa
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.etapas.map((etapa, idx) => (
                      <div key={idx} className="flex gap-3 items-center bg-gray-50 p-3 rounded-lg">
                        <input 
                          type="number"
                          className="w-20 rounded border-gray-300 text-center"
                          value={etapa.dia}
                          onChange={e => {
                            const newEtapas = [...form.etapas];
                            newEtapas[idx].dia = Number(e.target.value);
                            setForm({...form, etapas: newEtapas});
                          }}
                          placeholder="Dia"
                        />
                        <input 
                          className="flex-1 rounded border-gray-300"
                          value={etapa.descricao}
                          onChange={e => {
                            const newEtapas = [...form.etapas];
                            newEtapas[idx].descricao = e.target.value;
                            setForm({...form, etapas: newEtapas});
                          }}
                          placeholder="Descrição (ex: GnRH + DIU)"
                        />
                        <button onClick={() => removerEtapa(idx)} className="text-red-500 hover:text-red-700">
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-between bg-gray-50">
              <button 
                onClick={() => step > 1 ? setStep(step - 1) : fecharModal()}
                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg"
              >
                {step === 1 ? "Cancelar" : "Voltar"}
              </button>
              
              {step === 1 ? (
                <button 
                  onClick={() => setStep(2)}
                  disabled={!form.nome}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Próximo →
                </button>
              ) : (
                <button 
                  onClick={salvar}
                  disabled={form.etapas.length === 0}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  💾 Salvar Protocolo
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}