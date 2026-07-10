import type { APOC } from '../types/apoc';

const STORAGE_KEY = 'sescinc-apoc';

function getAll(): APOC[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: APOC[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarAPOCs(): APOC[] {
  return getAll();
}

export function buscarAPOC(termo: string): APOC[] {
  const t = termo.toLowerCase();
  return getAll().filter(
    a =>
      a.nomeCompleto.toLowerCase().includes(t) ||
      a.nomeGuerra.toLowerCase().includes(t) ||
      a.email.toLowerCase().includes(t),
  );
}

export function criarAPOC(data: Omit<APOC, 'id' | 'createdAt' | 'updatedAt' | 'funcao'>): APOC {
  const list = getAll();
  const novo: APOC = {
    ...data,
    funcao: 'MOTIVA',
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(novo);
  saveAll(list);
  return novo;
}

export function atualizarAPOC(id: string, data: Partial<APOC>): APOC | null {
  const list = getAll();
  const idx = list.findIndex(a => a.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data, funcao: 'MOTIVA', updatedAt: new Date().toISOString() };
  saveAll(list);
  return list[idx];
}

export function excluirAPOC(id: string): boolean {
  const list = getAll();
  const idx = list.findIndex(a => a.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  saveAll(list);
  return true;
}
