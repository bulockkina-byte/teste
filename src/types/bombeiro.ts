export type Cargo =
  | 'BA-2'
  | 'BA-MC'
  | 'BA-CE'
  | 'BA-LR'
  | 'BA-RE'
  | 'GS'
  | 'OC';

export type Equipe = 'Alfa' | 'Bravo' | 'Charlie' | 'Delta' | 'Feirista' | 'Embaixador';
export type Turno = 'Diurno' | 'Noturno' | 'Feirista' | 'Administrativo';
export type CatCNH = 'A' | 'B' | 'C' | 'D' | 'E' | 'AB' | 'AC' | 'AD' | 'AE';
export type Sexo = 'M' | 'F';

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
  endereco: string;
  numeroEndereco: string;
  complemento: string;
  cep: string;
  uf: string;
  municipio: string;
  celular: string;
  sexo: Sexo;
  cursoChefeEquipe: boolean;
  cursoMotoristaCCI: boolean;
  createdAt: string;
  updatedAt: string;
}

export const CARGO_OPTIONS: { value: Cargo; label: string }[] = [
  { value: 'BA-2', label: 'BA-2 - Bombeiro de Aeródromo' },
  { value: 'BA-MC', label: 'BA-MC - Motorista/Operador de CCI' },
  { value: 'BA-CE', label: 'BA-CE - Chefe de Equipe' },
  { value: 'BA-LR', label: 'BA-LR - Líder de Resgate' },
  { value: 'BA-RE', label: 'BA-RE - Resgatista' },
  { value: 'GS', label: 'GS - Gerente de Seção Contra Incêndio' },
  { value: 'OC', label: 'OC - Operador de Comunicações' },
];

export const EQUIPE_OPTIONS: Equipe[] = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Feirista', 'Embaixador'];
export const TURNO_OPTIONS: Turno[] = ['Diurno', 'Noturno', 'Feirista', 'Administrativo'];
export const CNH_OPTIONS: CatCNH[] = ['A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'];
export const SEXO_OPTIONS: { value: Sexo; label: string }[] = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
];
export const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export function turnoAutoPorEquipe(equipe: Equipe, cargo?: Cargo): Turno {
  if (cargo === 'GS' || equipe === 'Embaixador') return 'Administrativo';
  if (equipe === 'Alfa' || equipe === 'Charlie') return 'Diurno';
  if (equipe === 'Bravo' || equipe === 'Delta') return 'Noturno';
  if (equipe === 'Feirista') return 'Feirista';
  return 'Diurno';
}
