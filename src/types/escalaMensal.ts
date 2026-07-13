export type FuncaoPessoa = 'chefe' | 'lider' | 'ba-mc' | 'ba-2';
export type Veiculo = 'crs' | 'cciF2' | 'cciF3';
export type FuncaoVeiculo = 'BaMc' | 'BaCe' | 'BaLr' | 'Ba2' | 'Ba2-1' | 'Ba2-2';

export interface PessoaEscala {
  id: string;
  nome: string;
  nomeGuerra: string;
  funcao: FuncaoPessoa;
  veiculo: Veiculo;
  funcaoNoVeiculo: FuncaoVeiculo;
  isRadioFixo: boolean;
}

export interface VeiculosPlantao {
  crs: { baMc: string; baLr: string; ba2_1: string; ba2_2: string };
  cciF2: { baMc: string; baCe: string; ba2: string };
  cciF3: { baMc: string; ba2_1: string; ba2_2: string };
}

export interface RadioSlot {
  horario: string;
  horarioFim: string;
  pessoaNome: string;
  pessoaNomeGuerra: string;
  fixo: boolean;
}

export interface PlantaoGerado {
  dia: number;
  data: string;
  veiculos: VeiculosPlantao;
  radio: RadioSlot[];
}

export interface EscalaMensalConfig {
  id: string;
  equipe: string;
  mes: number;
  ano: number;
  paridade: 'par' | 'impar';
  pessoas: PessoaEscala[];
  createdAt: string;
  updatedAt: string;
}

export interface EscalaMensalCompleta {
  config: EscalaMensalConfig;
  paradas: PlantaoGerado[];
  faxinaMensal: { local: string; pessoaNome: string; pessoaNomeGuerra: string }[];
  responsabilidades: { descricao: string; pessoaNome: string; pessoaNomeGuerra: string }[];
}

export const LOCAIS_FAXINA = [
  'Cozinha / Refeitório',
  'Sala de Comunicação / Aloj. Fem. / WC Fem.',
  'Vestiário Masc. / WC Vest. Masc.',
  'Corredores / Academia',
  'Garagem',
  'Auditório / Sala de TV',
  'Alojamento Masculino / WC Aloj.',
  "WC's Piso Térreo / WC Auditório",
  'Sala e WC Liderança',
  'Lixo',
] as const;

export const SLOTS_RADIO = [
  { horario: '19:00', horarioFim: '20:00', fixo: true },
  { horario: '20:00', horarioFim: '21:00', fixo: false },
  { horario: '21:00', horarioFim: '22:00', fixo: false },
  { horario: '22:00', horarioFim: '23:00', fixo: false },
  { horario: '23:00', horarioFim: '00:00', fixo: false },
  { horario: '00:00', horarioFim: '01:30', fixo: false },
  { horario: '01:30', horarioFim: '03:00', fixo: false },
  { horario: '03:00', horarioFim: '04:30', fixo: false },
  { horario: '04:30', horarioFim: '06:00', fixo: false },
  { horario: '06:00', horarioFim: '07:00', fixo: true },
] as const;
