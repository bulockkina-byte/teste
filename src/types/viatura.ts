export type TipoViatura = 'CCI' | 'CRS' | 'Utilitário' | 'Apoio' | 'Resgate' | 'Ambulância';
export type SituacaoViatura = 'Ativa' | 'Inativa' | 'Em Manutenção';

export interface Viatura {
  id: string;
  prefixo: string;
  placa: string;
  tipo: TipoViatura;
  marca: string;
  modelo: string;
  ano: string;
  cor: string;
  situacao: SituacaoViatura;
  equipe: string;
  observacoes: string;
  createdAt: string;
  updatedAt: string;
}

export const TIPO_VIATURA_OPTIONS: TipoViatura[] = ['CCI', 'CRS', 'Utilitário', 'Apoio', 'Resgate', 'Ambulância'];
export const SITUACAO_VIATURA_OPTIONS: SituacaoViatura[] = ['Ativa', 'Inativa', 'Em Manutenção'];
