import type { Ocorrencia } from '../types/ocorrencia';

const STORAGE_KEY = 'sescinc-ocorrencias';

function getAll(): Ocorrencia[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: Ocorrencia[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarOcorrencias(): Ocorrencia[] {
  return getAll();
}

export function criarOcorrencia(data: Omit<Ocorrencia, 'id' | 'createdAt' | 'updatedAt'>): Ocorrencia {
  const all = getAll();
  const now = new Date().toISOString();
  const nova: Ocorrencia = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  all.push(nova);
  saveAll(all);
  return nova;
}

export function atualizarOcorrencia(id: string, data: Partial<Ocorrencia>): Ocorrencia | null {
  const all = getAll();
  const idx = all.findIndex(e => e.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
  saveAll(all);
  return all[idx];
}

export function excluirOcorrencia(id: string): void {
  saveAll(getAll().filter(e => e.id !== id));
}
