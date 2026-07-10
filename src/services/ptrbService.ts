import type { PTRB } from '../types/ptrb';

const STORAGE_KEY = 'sescinc-ptrbs';

function getAll(): PTRB[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: PTRB[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarPTRBs(): PTRB[] {
  return getAll();
}

export function listarPTRBsPorUsuario(username: string): PTRB[] {
  return getAll().filter(e => e.createdBy === username);
}

export function obterPTRB(id: string): PTRB | undefined {
  return getAll().find(e => e.id === id);
}

export function criarPTRB(data: Omit<PTRB, 'id' | 'createdAt' | 'updatedAt'>): PTRB {
  const list = getAll();
  const nova: PTRB = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(nova);
  saveAll(list);
  return nova;
}

export function atualizarPTRB(id: string, data: Partial<PTRB>): PTRB | null {
  const list = getAll();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
  saveAll(list);
  return list[idx];
}

export function excluirPTRB(id: string): boolean {
  const list = getAll();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  saveAll(list);
  return true;
}
