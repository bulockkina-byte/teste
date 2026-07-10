export interface PTRBParticipante {
  funcao: string;
  nomeCompleto: string;
  situacao: string;
}

export interface PTRB {
  id: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  data: string;
  horaInicio: string;
  horaTermino: string;
  duracao: string;
  equipe: string;
  turno: string;
  participantes: PTRBParticipante[];
  observacoes: string;
  instrutor: string;
  assuntoMinistrado: string;
  descricao: string;
  informacoesComplementares: string;
  fotos: string[];
}

export const EQUIPES = ['Alfa', 'Bravo', 'Charlie', 'Delta'] as const;
export const SITUACOES = ['A', 'INSTR', 'OC', 'P'] as const;
export const ASSUNTOS = [
  '01. FAMILIARIZAÇÃO COM AERÓDROMO',
  '02. FAMILIARIZAÇÃO COM AS AERONAVES QUE OPERAM NO AERÓDROMO',
] as const;
