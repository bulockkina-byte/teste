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
  observacoes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_FERIAS: StatusFerias[] = ['Programadas', 'Em Gozo', 'Gozadas', 'Indisponível'];

export const STATUS_FERIAS_COLORS: Record<StatusFerias, string> = {
  'Programadas': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  'Em Gozo': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  'Gozadas': 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  'Indisponível': 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};
