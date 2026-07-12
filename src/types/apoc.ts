export type FuncaoAPOC = 'APOC' | 'supervisor';

export const FUNCAO_APOC_OPTIONS: { value: FuncaoAPOC; label: string }[] = [
  { value: 'APOC', label: 'APOC' },
  { value: 'supervisor', label: 'Supervisor' },
];
export const EQUIPE_APOC = 'MOTIVA';

export interface APOC {
  id: string;
  nomeCompleto: string;
  nomeGuerra: string;
  email: string;
  funcao: FuncaoAPOC;
  equipe: string;
  createdAt: string;
  updatedAt: string;
}
