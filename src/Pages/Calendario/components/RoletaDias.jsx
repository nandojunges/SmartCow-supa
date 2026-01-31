import { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function RoletaDias({
  dias,
  dataSelecionada,
  onSelecionarDia,
  tarefas,
  formatarDataChave,
}) {
  const roletaRef = useRef(null);
  const [estaArrastando, setEstaArrastando] = useState(false);
  const [posicaoInicial, setPosicaoInicial] = useState(0);
  const [scrollInicial, setScrollInicial] = useState(0);
  const [velocidade, setVelocidade] = useState(0);
  const ultimaPosicaoRef = useRef(0);
  const ultimoTempoRef = useRef(Date.now());

  const ehHoje = useCallback((data) => {
    const hoje = new Date();
    return data.toDateString() === hoje.toDateString();
  }, []);

  const estaSelecionado = useCallback((data) => {
    return data.toDateString() === dataSelecionada.toDateString();
  }, [dataSelecionada]);

  const temTarefas = useCallback((data) => {
    const tarefasDoDia = tarefas[formatarDataChave(data)] || [];
    return tarefasDoDia.length > 0;
  }, [tarefas, formatarDataChave]);

  const contarTarefasPendentes = useCallback((data) => {
    const tarefasDoDia = tarefas[formatarDataChave(data)] || [];
    return tarefasDoDia.filter(t => !t.concluida).length;
  }, [tarefas, formatarDataChave]);

  // Scroll suave para o dia selecionado
  useEffect(() => {
    if (roletaRef.current && !estaArrastando) {
      const diaElement = roletaRef.current.querySelector(`[data-dia="${dataSelecionada.toDateString()}"]`);
      if (diaElement) {
        diaElement.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [dataSelecionada, estaArrastando]);

  // Inércia do scroll
  useEffect(() => {
    if (!estaArrastando && Math.abs(velocidade) > 0.5) {
      const intervalo = setInterval(() => {
        if (roletaRef.current) {
          roletaRef.current.scrollLeft += velocidade;
          setVelocidade(v => v * 0.95);
        }
      }, 16);

      const timeout = setTimeout(() => {
        clearInterval(intervalo);
        setVelocidade(0);
      }, 500);

      return () => {
        clearInterval(intervalo);
        clearTimeout(timeout);
      };
    }
  }, [estaArrastando, velocidade]);

  const iniciarArrasto = useCallback((e) => {
    setEstaArrastando(true);
    const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
    setPosicaoInicial(clientX);
    setScrollInicial(roletaRef.current?.scrollLeft || 0);
    ultimaPosicaoRef.current = clientX;
    ultimoTempoRef.current = Date.now();
    setVelocidade(0);
  }, []);

  const arrastar = useCallback((e) => {
    if (!estaArrastando || !roletaRef.current) return;
    e.preventDefault();

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const diferenca = clientX - posicaoInicial;
    roletaRef.current.scrollLeft = scrollInicial - diferenca;

    // Calcular velocidade para inércia
    const agora = Date.now();
    const deltaTempo = agora - ultimoTempoRef.current;
    if (deltaTempo > 0) {
      const deltaPosicao = clientX - ultimaPosicaoRef.current;
      setVelocidade(deltaPosicao / deltaTempo * 16);
    }
    ultimaPosicaoRef.current = clientX;
    ultimoTempoRef.current = agora;
  }, [estaArrastando, posicaoInicial, scrollInicial]);

  const finalizarArrasto = useCallback(() => {
    setEstaArrastando(false);
  }, []);

  return (
    <div
      ref={roletaRef}
      className="roleta-dias"
      onMouseDown={iniciarArrasto}
      onMouseMove={arrastar}
      onMouseUp={finalizarArrasto}
      onMouseLeave={finalizarArrasto}
      onTouchStart={iniciarArrasto}
      onTouchMove={arrastar}
      onTouchEnd={finalizarArrasto}
    >
      {dias.map(({ data, foraDoMes }, index) => {
        const selecionado = estaSelecionado(data);
        const hoje = ehHoje(data);
        const temTarefa = temTarefas(data);
        const pendentes = contarTarefasPendentes(data);

        return (
          <motion.div
            key={index}
            data-dia={data.toDateString()}
            onClick={() => onSelecionarDia(data)}
            className={`dia-card ${selecionado ? 'selecionado' : ''} ${hoje ? 'hoje' : ''} ${foraDoMes ? 'fora-mes' : ''}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={selecionado ? { scale: 1.05 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <span className="dia-semana">{diasSemana[data.getDay()]}</span>
            <span className="numero-dia">{data.getDate()}</span>

            {temTarefa && (
              <div className="indicadores">
                {pendentes > 0 && (
                  <span className="badge-pendentes">{pendentes}</span>
                )}
                <div className="indicador-tarefa" />
              </div>
            )}

            {selecionado && (
              <motion.div
                className="glow"
                layoutId="glow"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
