export type Cargo =
  | 'BA-2'
  | 'BA-MC'
  | 'BA-CE'
  | 'BA-LR'
  | 'BA-RE'
  | 'GS'
  | 'OC';

export type Equipe = 'Alfa' | 'Bravo' | 'Charlie' | 'Delta' | 'Feirista';
export type Turno = 'Diurno' | 'Noturno' | 'Feirista';
export type CatCNH = 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE';

export interface Bombeiro {
  id: string;
  matricula: string;
  nomeCompleto: string;
  nomeGuerra: string;
  email: string;
  dataNascimento: string;
  idade: number;
  dataAdmissao: string;
  cargo: Cargo;
  equipe: Equipe;
  turno: Turno;
  tipoSanguineo: string;
  cpf: string;
  rg: string;
  cnhNumero: string;
  cnhCategoria: CatCNH;
  cnhValidade: string;
  foto: string;
  dataDesligamento: string;
  createdAt: string;
  updatedAt: string;
}

export const CARGO_OPTIONS: { value: Cargo; label: string }[] = [
  { value: 'BA-2', label: 'BA-2 - Bombeiro de Aeródromo' },
  { value: 'BA-MC', label: 'BA-MC - Motorista/Operador de CCI' },
  { value: 'BA-CE', label: 'BA-CE - Chefe de Equipe' },
  { value: 'BA-LR', label: 'BA-LR - Líder de Resgate' },
  { value: 'BA-RE', label: 'BA-RE - Resgate' },
  { value: 'GS', label: 'GS - Gerente de Seção Contra Incêndio' },
  { value: 'OC', label: 'OC - Operador de Comunicações' },
];

export const EQUIPE_OPTIONS: Equipe[] = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Feirista'];
export const TURNO_OPTIONS: Turno[] = ['Diurno', 'Noturno', 'Feirista'];
export const CNH_OPTIONS: CatCNH[] = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];

export function turnoAutoPorEquipe(equipe: Equipe): Turno {
  if (equipe === 'Alfa' || equipe === 'Charlie') return 'Diurno';
  if (equipe === 'Bravo' || equipe === 'Delta') return 'Noturno';
  if (equipe === 'Feirista') return 'Feirista';
  return 'Diurno';
}
