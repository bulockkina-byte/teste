import type { LRO } from '../types/lro';

const STORAGE_KEY = 'sescinc-lros';

function getAll(): LRO[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: LRO[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarLROs(): LRO[] {
  return getAll();
}

export function listarLROsPorUsuario(username: string): LRO[] {
  return getAll().filter(e => e.createdBy === username);
}

export function obterLRO(id: string): LRO | undefined {
  return getAll().find(e => e.id === id);
}

export function criarLRO(data: Omit<LRO, 'id' | 'createdAt' | 'updatedAt'>): LRO {
  const list = getAll();
  const nova: LRO = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(nova);
  saveAll(list);
  return nova;
}

export function atualizarLRO(id: string, data: Partial<LRO>): LRO | null {
  const list = getAll();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
  saveAll(list);
  return list[idx];
}

export function excluirLRO(id: string): boolean {
  const list = getAll();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  saveAll(list);
  return true;
}
