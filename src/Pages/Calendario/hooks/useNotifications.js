import { useState, useEffect, useCallback } from 'react';

export function useNotifications() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [permissao, setPermissao] = useState('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermissao(Notification.permission);
    }
  }, []);

  const solicitarPermissao = useCallback(async () => {
    if (!('Notification' in window)) return false;
    const resultado = await Notification.requestPermission();
    setPermissao(resultado);
    return resultado === 'granted';
  }, []);

  const agendarNotificacao = useCallback((titulo, options = {}, delay = 0) => {
    if (permissao !== 'granted') return null;

    const id = Date.now().toString();
    const timeoutId = setTimeout(() => {
      new Notification(titulo, {
        icon: '/calendar-icon.png',
        badge: '/calendar-icon.png',
        tag: id,
        requireInteraction: options.requireInteraction || false,
        ...options,
      });

      setNotificacoes(prev => prev.filter(n => n.id !== id));
    }, delay);

    const notificacao = {
      id,
      titulo,
      options,
      agendadaPara: new Date(Date.now() + delay).toISOString(),
      timeoutId,
    };

    setNotificacoes(prev => [...prev, notificacao]);
    return id;
  }, [permissao]);

  const cancelarNotificacao = useCallback((id) => {
    setNotificacoes(prev => {
      const notificacao = prev.find(n => n.id === id);
      if (notificacao) {
        clearTimeout(notificacao.timeoutId);
      }
      return prev.filter(n => n.id !== id);
    });
  }, []);

  const notificarTarefa = useCallback((tarefa, data, minutosAntes = 15) => {
    if (!tarefa.horario) return null;

    const [horas, minutos] = tarefa.horario.split(':').map(Number);
    const dataTarefa = new Date(data);
    dataTarefa.setHours(horas, minutos, 0, 0);

    const agora = new Date();
    const delay = dataTarefa.getTime() - agora.getTime() - (minutosAntes * 60000);

    if (delay <= 0) return null;

    return agendarNotificacao(
      `⏰ ${tarefa.titulo}`,
      {
        body: `Sua tarefa começa às ${tarefa.horario}`,
        requireInteraction: true,
        actions: [
          { action: 'concluir', title: '✓ Concluir' },
          { action: 'adiar', title: '⏳ Adiar 10min' },

        ],
      },
      delay
    );
  }, [agendarNotificacao]);

  return {
    notificacoes,
    permissao,
    solicitarPermissao,
    agendarNotificacao,
    cancelarNotificacao,
    notificarTarefa,
  };
}
