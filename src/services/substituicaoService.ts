import type { SubstituicaoAtiva } from '../types/ferias';

const STORAGE_KEY = 'sescinc-substituicoes';

function getAll(): SubstituicaoAtiva[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: SubstituicaoAtiva[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarSubstituicoes(): SubstituicaoAtiva[] {
  return getAll();
}

export function substituicoesAtivas(): SubstituicaoAtiva[] {
  const agora = new Date().toISOString().slice(0, 10);
  return getAll().filter(s => s.ativa && s.dataFim >= agora);
}

export function substituicaoPorSubstituto(substitutoId: string): SubstituicaoAtiva | null {
  const agora = new Date().toISOString().slice(0, 10);
  return getAll().find(s =>
    s.substitutoId === substitutoId && s.ativa && s.dataFim >= agora
  ) || null;
}

export function substituicaoPorFuncionario(funcionarioId: string): SubstituicaoAtiva | null {
  const agora = new Date().toISOString().slice(0, 10);
  return getAll().find(s =>
    s.funcionarioId === funcionarioId && s.ativa && s.dataFim >= agora
  ) || null;
}

export function criarSubstituicao(data: {
  feriasId: string;
  funcionarioId: string;
  funcionarioNome: string;
  substitutoId: string;
  substitutoNome: string;
  funcaoSubstituicao: string;
  dataInicio: string;
  dataFim: string;
}): SubstituicaoAtiva {
  const all = getAll();
  const nova: SubstituicaoAtiva = {
    id: crypto.randomUUID(),
    ...data,
    funcaoSubstituicao: data.funcaoSubstituicao as SubstituicaoAtiva['funcaoSubstituicao'],
    ativa: true,
    createdAt: new Date().toISOString(),
  };
  all.push(nova);
  saveAll(all);
  return nova;
}

export function encerrarSubstituicao(id: string): SubstituicaoAtiva | null {
  const all = getAll();
  const idx = all.findIndex(s => s.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ativa: false };
  saveAll(all);
  return all[idx];
}

export function excluirSubstituicao(id: string) {
  saveAll(getAll().filter(s => s.id !== id));
}
