export interface EPI {
  id: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  nome: string;
  descricao: string;
  responsavel: string;
  dataPagamento: string;
  dataValidade: string;
  valor: string;
  fornecedor: string;
  notas: string;
}

export const CATEGORIAS_EPI = [
  'Capacete', 'Óculos de Proteção', 'Protetor Auricular', 'Luva',
  'Botina', 'Cinto paraquedista', 'Respirador', 'Vestimenta',
  'Protetor Facial', 'Luva Isolante', 'Outros',
] as const;
