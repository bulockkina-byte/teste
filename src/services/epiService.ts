import type { EPI } from '../types/epi';

const STORAGE_KEY = 'sescinc-epis';

function getAll(): EPI[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: EPI[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarEPIs(): EPI[] {
  return getAll();
}

export function criarEPI(data: Omit<EPI, 'id' | 'createdAt' | 'updatedAt'>): EPI {
  const all = getAll();
  const now = new Date().toISOString();
  const novo: EPI = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  all.push(novo);
  saveAll(all);
  return novo;
}

export function atualizarEPI(id: string, data: Partial<EPI>): EPI | null {
  const all = getAll();
  const idx = all.findIndex(e => e.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
  saveAll(all);
  return all[idx];
}

export function excluirEPI(id: string): void {
  saveAll(getAll().filter(e => e.id !== id));
}
