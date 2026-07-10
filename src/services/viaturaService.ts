import type { Viatura } from '../types/viatura';

const STORAGE_KEY = 'sescinc-viaturas';

function getAll(): Viatura[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: Viatura[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarViaturas(): Viatura[] {
  return getAll();
}

export function buscarViatura(termo: string): Viatura[] {
  const t = termo.toLowerCase();
  return getAll().filter(
    v =>
      v.prefixo.toLowerCase().includes(t) ||
      v.placa.toLowerCase().includes(t) ||
      v.marca.toLowerCase().includes(t) ||
      v.modelo.toLowerCase().includes(t) ||
      v.equipe.toLowerCase().includes(t),
  );
}

export function criarViatura(data: Omit<Viatura, 'id' | 'createdAt' | 'updatedAt'>): Viatura {
  const list = getAll();
  const novo: Viatura = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(novo);
  saveAll(list);
  return novo;
}

export function atualizarViatura(id: string, data: Partial<Viatura>): Viatura | null {
  const list = getAll();
  const idx = list.findIndex(v => v.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
  saveAll(list);
  return list[idx];
}

export function excluirViatura(id: string): boolean {
  const list = getAll();
  const idx = list.findIndex(v => v.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  saveAll(list);
  return true;
}
