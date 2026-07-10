import type { Ocorrencia } from '../types/ocorrencia';

function getByKey(key: string): Ocorrencia[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function saveByKey(key: string, list: Ocorrencia[]): void {
  localStorage.setItem(key, JSON.stringify(list));
}

export function listarOcorrencias(storageKey = 'sescinc-ocorrencias'): Ocorrencia[] {
  return getByKey(storageKey);
}

export function criarOcorrencia(data: Omit<Ocorrencia, 'id' | 'createdAt' | 'updatedAt'>, storageKey = 'sescinc-ocorrencias'): Ocorrencia {
  const all = getByKey(storageKey);
  const now = new Date().toISOString();
  const nova: Ocorrencia = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  all.push(nova);
  saveByKey(storageKey, all);
  return nova;
}

export function atualizarOcorrencia(id: string, data: Partial<Ocorrencia>, storageKey = 'sescinc-ocorrencias'): Ocorrencia | null {
  const all = getByKey(storageKey);
  const idx = all.findIndex(e => e.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
  saveByKey(storageKey, all);
  return all[idx];
}

export function excluirOcorrencia(id: string, storageKey = 'sescinc-ocorrencias'): void {
  saveByKey(storageKey, getByKey(storageKey).filter(e => e.id !== id));
}
