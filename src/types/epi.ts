export type EPIStatus = 'entregue' | 'pago' | 'enviado_autentique' | 'assinado' | 'devolvido';

export interface EPI {
  id: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  nome: string;
  descricao: string;
  colaborador: string;
  colaboradorId: string;
  entreguePor: string;
  ca: string;
  dataPagamento: string;
  dataValidade: string;
  fornecedor: string;
  notas: string;
  status: EPIStatus;
  dataEnvioAutentique: string;
  dataAssinatura: string;
  dataDevolucao: string;
}

export const EPI_STATUS_LABELS: Record<EPIStatus, string> = {
  entregue: 'Entregue',
  pago: 'Pago',
  enviado_autentique: 'Enviado Autentique',
  assinado: 'Assinado',
  devolvido: 'Devolvido',
};

export const EPI_STATUS_COLORS: Record<EPIStatus, string> = {
  entregue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  pago: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  enviado_autentique: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  assinado: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  devolvido: 'bg-graphite-100 text-graphite-600 dark:bg-graphite-700 dark:text-graphite-400',
};

export const CATEGORIAS_EPI = [
  'Capacete', 'Óculos de Proteção', 'Protetor Auricular', 'Luva',
  'Botina', 'Cinto paraquedista', 'Respirador', 'Vestimenta',
  'Protetor Facial', 'Luva Isolante', 'Outros',
] as const;
