import type { EscalaMensalConfig, EscalaMensalCompleta, PessoaEscala, PlantaoGerado, VeiculosPlantao, RadioSlot } from '../types/escalaMensal';
import { LOCAIS_FAXINA, SLOTS_RADIO } from '../types/escalaMensal';

function buildVeiculos(pessoas: PessoaEscala[]): VeiculosPlantao {
  const g = (v: string, f: string) => pessoas.find(p => p.veiculo === v && p.funcaoNoVeiculo === f)?.nomeGuerra || '-';
  return {
    crs: { baMc: g('crs','BaMc'), baLr: g('crs','BaLr'), ba2_1: g('crs','Ba2-1'), ba2_2: g('crs','Ba2-2') },
    cciF2: { baMc: g('cciF2','BaMc'), baCe: g('cciF2','BaCe'), ba2: g('cciF2','Ba2') },
    cciF3: { baMc: g('cciF3','BaMc'), ba2_1: g('cciF3','Ba2-1'), ba2_2: g('cciF3','Ba2-2') },
  };
}

function diasPlantao(mes: number, ano: number, paridade: 'par' | 'impar'): number[] {
  const dias: number[] = [];
  const total = new Date(ano, mes, 0).getDate();
  const inicio = paridade === 'impar' ? 1 : 2;
  for (let d = inicio; d <= total; d += 2) dias.push(d);
  return dias;
}

function fmtDate(dia: number, mes: number, ano: number) {
  return `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
}

function rotateArray<T>(arr: T[], shift: number): T[] {
  const s = shift % arr.length;
  return [...arr.slice(s), ...arr.slice(0, s)];
}

function gerarRadioPlantao(pessoas: PessoaEscala[], idxPlantao: number): RadioSlot[] {
  const pool = pessoas.filter(p => p.funcao !== 'chefe' && p.funcao !== 'lider');
  const bookendIdx = pool.findIndex(p => p.isRadioFixo);
  const bookend = pool[bookendIdx];
  const poolSemBookend = pool.filter((_, i) => i !== bookendIdx);
  const rotSem = rotateArray(poolSemBookend, idxPlantao - 1);
  const bookendNaNoite = idxPlantao % 2 === 1;
  const posNoite = Math.floor((idxPlantao + 3) / 2) % 4;
  const posMadrugada = Math.floor(idxPlantao / 2) % 4;
  const pos = bookendNaNoite ? posNoite : posMadrugada;
  let grupo20: PessoaEscala[], grupo06: PessoaEscala[];
  if (bookendNaNoite) {
    grupo20 = [...rotSem.slice(0, 3)]; grupo20.splice(pos, 0, bookend);
    grupo06 = rotSem.slice(3, 7);
  } else {
    grupo20 = rotSem.slice(0, 4);
    grupo06 = [...rotSem.slice(4, 7)]; grupo06.splice(pos, 0, bookend);
  }
  const result: RadioSlot[] = [];
  let i20 = 0, i06 = 0;
  for (const slot of SLOTS_RADIO) {
    if (slot.horario === '19:00' || slot.horario === '06:00') {
      result.push({ horario: slot.horario, horarioFim: slot.horarioFim, pessoaNome: bookend.nome, pessoaNomeGuerra: bookend.nomeGuerra, fixo: true });
    } else {
      const is20 = i20 < 4;
      const p = is20 ? grupo20[i20++] : grupo06[i06++];
      result.push({ horario: slot.horario, horarioFim: slot.horarioFim, pessoaNome: p.nome, pessoaNomeGuerra: p.nomeGuerra, fixo: false });
    }
  }
  return result;
}

function gerarFaxinaMensal(pessoas: PessoaEscala[], mes: number) {
  const faxineiros = pessoas.filter(p => p.funcao !== 'chefe' && p.funcao !== 'lider');
  const locais = LOCAIS_FAXINA.filter(l => l !== 'Sala e WC Liderança' && l !== 'Lixo');
  const offset = (mes - 1) % faxineiros.length;
  const rotacionados = rotateArray(faxineiros, offset);
  const result: { local: string; pessoaNome: string; pessoaNomeGuerra: string }[] = [];
  for (let i = 0; i < locais.length; i++) {
    const p = rotacionados[i % rotacionados.length];
    result.push({ local: locais[i], pessoaNome: p.nome, pessoaNomeGuerra: p.nomeGuerra });
  }
  const chefe = pessoas.find(p => p.funcao === 'chefe');
  const lider = pessoas.find(p => p.funcao === 'lider');
  if (chefe) result.push({ local: 'Sala e WC Liderança', pessoaNome: chefe.nome, pessoaNomeGuerra: chefe.nomeGuerra });
  if (lider) result.push({ local: 'Lixo', pessoaNome: lider.nome, pessoaNomeGuerra: lider.nomeGuerra });
  return result;
}

function gerarResponsabilidades(pessoas: PessoaEscala[], faxina: { local: string; pessoaNome: string; pessoaNomeGuerra: string }[]) {
  const corredor = faxina.find(f => f.local === 'Corredores / Academia');
  const cozinha = faxina.find(f => f.local === 'Cozinha / Refeitório');
  const lixo = faxina.find(f => f.local === 'Lixo');
  const lider = pessoas.find(p => p.funcao === 'lider');
  return [
    { descricao: 'Controle e abastecimento do cilindro (EPRA)', pessoaNome: corredor?.pessoaNome || '', pessoaNomeGuerra: corredor?.pessoaNomeGuerra || '-' },
    { descricao: 'Controle de abastecimento de RTI inferior e superior', pessoaNome: cozinha?.pessoaNome || '', pessoaNomeGuerra: cozinha?.pessoaNomeGuerra || '-' },
    { descricao: 'Check list almoxarifado (controle de materiais)', pessoaNome: lixo?.pessoaNome || '', pessoaNomeGuerra: lixo?.pessoaNomeGuerra || '-' },
    { descricao: 'Acompanhamento de manutenções', pessoaNome: lider?.nome || '', pessoaNomeGuerra: lider?.nomeGuerra || '-' },
    { descricao: 'Limpeza dos CCI', pessoaNome: pessoas.filter(p => p.funcaoNoVeiculo === 'BaMc').map(p => p.nomeGuerra).join(', '), pessoaNomeGuerra: pessoas.filter(p => p.funcaoNoVeiculo === 'BaMc').map(p => `BA-MC (${p.veiculo === 'crs' ? 'CRS' : p.veiculo === 'cciF2' ? 'CCI F2' : 'CCI F3'})`).join(', ') },
  ];
}

export function gerarEscalaMensal(config: EscalaMensalConfig): EscalaMensalCompleta {
  const { mes, ano, paridade, pessoas } = config;
  const dias = diasPlantao(mes, ano, paridade);
  const faxinaMensal = gerarFaxinaMensal(pessoas, mes);
  const responsabilidades = gerarResponsabilidades(pessoas, faxinaMensal);
  const paradas: PlantaoGerado[] = dias.map((dia, idx) => ({
    dia,
    data: fmtDate(dia, mes, ano),
    veiculos: buildVeiculos(pessoas),
    radio: gerarRadioPlantao(pessoas, idx + 1),
  }));
  return { config, paradas, faxinaMensal, responsabilidades };
}
