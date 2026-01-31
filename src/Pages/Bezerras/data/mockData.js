export const mockBezerras = [
  {
    id: '1',
    nome: 'Estrela',
    brinco: 'B-2024-001',
    dataNascimento: '2024-01-15',
    pesoNascimento: 38,
    pesoAtual: 95,
    categoria: 'transicao',
    status: 'saudavel',
    origem: 'Mimosa',
    lote: '2024-A',
    updatedAt: '2024-03-20',
    manejos: [
      { id: 'm1', tipo: 'cura_umbigo', data: '2024-01-15', status: 'realizado', protocolo: 'Iodo 10% - dias 0, 1 e 2', responsavel: 'João' },
      { id: 'm2', tipo: 'identificacao', data: '2024-01-16', status: 'realizado', responsavel: 'Maria' },
      { id: 'm3', tipo: 'vacina', data: '2024-01-30', status: 'realizado', protocolo: 'Vacina contra diarreia neonatal (Rotavec Corona)' },
      { id: 'm4', tipo: 'mocha', data: '2024-02-01', status: 'realizado' },
      { id: 'm5', tipo: 'desverminacao', data: '2024-03-01', status: 'pendente' }
    ],
    pesagens: [
      { data: '2024-01-15', peso: 38, idadeDias: 0, gmd: 0 },
      { data: '2024-01-30', peso: 48, idadeDias: 15, gmd: 0.67 },
      { data: '2024-02-14', peso: 58, idadeDias: 30, gmd: 0.67 },
      { data: '2024-03-01', peso: 75, idadeDias: 45, gmd: 1.13 },
      { data: '2024-03-20', peso: 95, idadeDias: 65, gmd: 1.11 }
    ],
    ocorrencias: []
  },
  {
    id: '2',
    nome: 'Luna',
    brinco: 'B-2024-015',
    dataNascimento: '2024-01-28',
    pesoNascimento: 35,
    pesoAtual: 52,
    categoria: 'aleitamento',
    status: 'tratamento',
    origem: 'Estrela da Manhã',
    lote: '2024-A',
    updatedAt: '2024-03-18',
    manejos: [
      { id: 'm6', tipo: 'cura_umbigo', data: '2024-01-28', status: 'realizado' }
    ],
    pesagens: [
      { data: '2024-01-28', peso: 35, idadeDias: 0, gmd: 0 },
      { data: '2024-02-13', peso: 40, idadeDias: 16, gmd: 0.31 },
      { data: '2024-03-01', peso: 48, idadeDias: 32, gmd: 0.50 },
      { data: '2024-03-18', peso: 52, idadeDias: 50, gmd: 0.22 }
    ],
    ocorrencias: [
      { 
        id: 'o1', 
        tipo: 'diarreia', 
        gravidade: 'moderada', 
        dataInicio: '2024-02-10',
        dataFim: '2024-02-18',
        sintomas: ['fezes aquosas', 'apetite reduzido', 'depressão leve'],
        tratamento: 'Soro oral + probiótico + anti-inflamatório',
        custo: 150.00,
        impactoPeso: 2.5,
        veterinario: 'Dr. Silva'
      },
      {
        id: 'o2',
        tipo: 'pneumonia',
        gravidade: 'leve',
        dataInicio: '2024-03-15',
        sintomas: ['tosse leve', 'secreção nasal'],
        tratamento: 'Antibiótico (Oxitetraciclina)',
        custo: 85.00,
        impactoPeso: 0.8,
        veterinario: 'Dr. Silva'
      }
    ]
  },
  {
    id: '3',
    nome: 'Princesa',
    brinco: 'B-2024-023',
    dataNascimento: '2024-02-01',
    pesoNascimento: 42,
    pesoAtual: 48,
    categoria: 'neonatal',
    status: 'alerta',
    origem: 'Bela',
    lote: '2024-B',
    updatedAt: '2024-02-05',
    manejos: [
      { id: 'm7', tipo: 'cura_umbigo', data: '2024-02-01', status: 'atrasado', protocolo: 'Iodo 10% imersão completa - URGENTE' },
      { id: 'm8', tipo: 'identificacao', data: '2024-02-03', status: 'pendente' }
    ],
    pesagens: [
      { data: '2024-02-01', peso: 42, idadeDias: 0, gmd: 0 },
      { data: '2024-02-03', peso: 43.5, idadeDias: 2, gmd: 0.75 }
    ],
    ocorrencias: []
  },
  {
    id: '4',
    nome: 'Julia',
    brinco: 'B-2024-045',
    dataNascimento: '2024-02-15',
    pesoNascimento: 40,
    pesoAtual: 110,
    categoria: 'desmamada',
    status: 'saudavel',
    origem: 'Malhada',
    lote: '2024-A',
    updatedAt: '2024-05-20',
    manejos: [
      { id: 'm9', tipo: 'cura_umbigo', data: '2024-02-15', status: 'realizado' },
      { id: 'm10', tipo: 'desmama', data: '2024-05-15', status: 'realizado' }
    ],
    pesagens: [
      { data: '2024-02-15', peso: 40, idadeDias: 0 },
      { data: '2024-03-01', peso: 55, idadeDias: 14 },
      { data: '2024-04-01', peso: 85, idadeDias: 45 },
      { data: '2024-05-20', peso: 110, idadeDias: 95 }
    ],
    ocorrencias: []
  }
];

export const mockEstatisticas = {
  totalBezerras: 124,
  mortalidade: 3.2,
  morbidade: 12.5,
  gmdMedio: 0.78,
  custoMedio: 285.00
};
