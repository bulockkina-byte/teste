import type { EscalaDiaria } from '../types/escala';

const STORAGE_KEY = 'sescinc-escalas-diarias';

function getAll(): EscalaDiaria[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: EscalaDiaria[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarEscalas(): EscalaDiaria[] {
  return getAll();
}

export function listarEscalasPorUsuario(username: string): EscalaDiaria[] {
  return getAll().filter(e => e.createdBy === username);
}

export function obterEscala(id: string): EscalaDiaria | undefined {
  return getAll().find(e => e.id === id);
}

export function criarEscala(data: Omit<EscalaDiaria, 'id' | 'createdAt' | 'updatedAt'>): EscalaDiaria {
  const list = getAll();
  const nova: EscalaDiaria = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(nova);
  saveAll(list);
  return nova;
}

export function atualizarEscala(id: string, data: Partial<EscalaDiaria>): EscalaDiaria | null {
  const list = getAll();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
  saveAll(list);
  return list[idx];
}

export function excluirEscala(id: string): boolean {
  const list = getAll();
  const idx = list.findIndex(e => e.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  saveAll(list);
  return true;
}
