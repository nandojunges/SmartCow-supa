import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useEffect, useState } from 'react';

const TIPOS_ICONS = {
  sucesso: CheckCircle2,
  erro: AlertCircle,
  info: Info,
  aviso: Bell,
};

const TIPOS_CORES = {
  sucesso: '#10b981',
  erro: '#ef4444',
  info: '#3b82f6',
  aviso: '#f59e0b',
};

export function Notificacoes({ notificacoes, onRemover }) {
  return (
    <div className="container-notificacoes">
      <AnimatePresence>
        {notificacoes.map((notif) => {
          const Icon = TIPOS_ICONS[notif.tipo] || Info;
          const cor = TIPOS_CORES[notif.tipo] || '#3b82f6';

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="notificacao"
              style={{ borderLeftColor: cor }}
            >
              <div className="notif-icon" style={{ color: cor }}>
                <Icon size={20} />
              </div>
              <div className="notif-conteudo">
                {notif.titulo && <span className="notif-titulo">{notif.titulo}</span>}
                <span className="notif-mensagem">{notif.mensagem}</span>
              </div>
              <button
                onClick={() => onRemover(notif.id)}
                className="notif-fechar"
              >
                <X size={16} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

// Hook para gerenciar notificações toast
export function useToast() {
  const [notificacoes, setNotificacoes] = useState([]);

  const adicionar = (mensagem, tipo = 'info', titulo = '', duracao = 5000) => {
    const id = Date.now().toString();
    const notif = { id, mensagem, tipo, titulo };

    setNotificacoes(prev => [...prev, notif]);

    if (duracao > 0) {
      setTimeout(() => {
        remover(id);
      }, duracao);
    }

    return id;
  };

  const remover = (id) => {
    setNotificacoes(prev => prev.filter(n => n.id !== id));
  };

  const sucesso = (mensagem, titulo = '') => adicionar(mensagem, 'sucesso', titulo);
  const erro = (mensagem, titulo = '') => adicionar(mensagem, 'erro', titulo);
  const info = (mensagem, titulo = '') => adicionar(mensagem, 'info', titulo);
  const aviso = (mensagem, titulo = '') => adicionar(mensagem, 'aviso', titulo);

  return {
    notificacoes,
    adicionar,
    remover,
    sucesso,
    erro,
    info,
    aviso,
  };
}
