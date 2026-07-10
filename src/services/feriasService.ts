import type { Ferias } from '../types/ferias';

const STORAGE_KEY = 'sescinc-ferias';

function getAll(): Ferias[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: Ferias[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarFerias(): Ferias[] {
  return getAll();
}

export function feriasPorFuncionario(funcionarioId: string): Ferias[] {
  return getAll().filter(f => f.funcionarioId === funcionarioId);
}

export function criarFerias(data: Omit<Ferias, 'id' | 'createdAt' | 'updatedAt'>): Ferias {
  const all = getAll();
  const now = new Date().toISOString();
  const nova: Ferias = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  all.push(nova);
  saveAll(all);
  return nova;
}

export function atualizarFerias(id: string, data: Partial<Ferias>): Ferias | null {
  const all = getAll();
  const idx = all.findIndex(f => f.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
  saveAll(all);
  return all[idx];
}

export function excluirFerias(id: string) {
  saveAll(getAll().filter(f => f.id !== id));
}
