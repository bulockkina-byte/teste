export type TipoDocumento = 'BONA' | 'RAE';

export const TIPO_DOCUMENTO: Record<TipoDocumento, string> = {
  BONA: 'BOLETIM DE OCORRÊNCIA NÃO AERONÁUTICO',
  RAE: 'RELATÓRIO DE ATENDIMENTO A EMERGÊNCIA',
};

export type CategoriaOcorrencia =
  | 'Incêndio'
  | 'Resgate'
  | 'Emergência Aeronáutica'
  | 'Vazamento'
  | 'Equipamento'
  | 'Infraestrutura'
  | 'Treinamento'
  | 'Outros';

export interface Ocorrencia {
  id: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  tipoDocumento: TipoDocumento;
  numero: string;
  data: string;
  hora: string;
  equipe: string;
  turno: string;
  categoria: CategoriaOcorrencia;
  titulo: string;
  descricao: string;
  local: string;
  envolvidos: string;
  acoesTomadas: string;
  status: 'Aberta' | 'Em Andamento' | 'Fechada';
  fotos: string[];
}

export const CATEGORIAS_OCORRENCIA: CategoriaOcorrencia[] = [
  'Incêndio', 'Resgate', 'Emergência Aeronáutica', 'Vazamento',
  'Equipamento', 'Infraestrutura', 'Treinamento', 'Outros',
];

export const STATUS_OCORRENCIA = ['Aberta', 'Em Andamento', 'Fechada'] as const;

export const EQUIPES = ['Alfa', 'Bravo', 'Charlie', 'Delta'] as const;
