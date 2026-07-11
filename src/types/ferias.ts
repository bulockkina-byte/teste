import type { Cargo, Equipe } from './bombeiro';

export type StatusFerias = 'Programadas' | 'Em Gozo' | 'Gozadas' | 'Indisponível';

export interface Ferias {
  id: string;
  funcionarioId: string;
  funcionarioNome: string;
  periodo: string;
  dataInicio: string;
  dataFim: string;
  dias: number;
  status: StatusFerias;
  substitutoId: string;
  substitutoNome: string;
  funcaoSubstituicao: Cargo | '';
  observacoes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertaVencimento {
  funcionarioId: string;
  funcionarioNome: string;
  equipe: Equipe;
  dataAdmissao: string;
  diasParaVencer: number;
  nivel: 'ok' | 'alerta' | 'perigo' | 'critico';
}

export interface SubstituicaoAtiva {
  id: string;
  feriasId: string;
  funcionarioId: string;
  funcionarioNome: string;
  substitutoId: string;
  substitutoNome: string;
  funcaoSubstituicao: Cargo;
  dataInicio: string;
  dataFim: string;
  ativa: boolean;
  createdAt: string;
}

export const STATUS_FERIAS: StatusFerias[] = ['Programadas', 'Em Gozo', 'Gozadas', 'Indisponível'];

export const STATUS_FERIAS_COLORS: Record<StatusFerias, string> = {
  'Programadas': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  'Em Gozo': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  'Gozadas': 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  'Indisponível': 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

export const FUNCOES_SUBSTITUICAO: { value: Cargo; label: string }[] = [
  { value: 'BA-CE', label: 'Chefe de Equipe' },
  { value: 'BA-LR', label: 'Líder de Resgate' },
  { value: 'BA-MC', label: 'Motorista/Operador de CCI' },
  { value: 'BA-RE', label: 'Resgate' },
  { value: 'BA-2', label: 'Bombeiro de Aeródromo' },
  { value: 'OC', label: 'Operador de Comunicações' },
];
