import type { Bombeiro } from '../types/bombeiro';

const STORAGE_KEY = 'sescinc-bombeiros';

function getAll(): Bombeiro[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: Bombeiro[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarBombeiros(): Bombeiro[] {
  return getAll();
}

export function buscarBombeiro(termo: string): Bombeiro[] {
  const t = termo.toLowerCase();
  return getAll().filter(
    b =>
      b.matricula.toLowerCase().includes(t) ||
      b.nomeCompleto.toLowerCase().includes(t) ||
      b.nomeGuerra.toLowerCase().includes(t) ||
      b.cpf.includes(t) ||
      b.equipe.toLowerCase().includes(t),
  );
}

export function obterBombeiro(id: string): Bombeiro | undefined {
  return getAll().find(b => b.id === id);
}

export function listarAtivos(): Bombeiro[] {
  return getAll().filter(b => !b.dataDesligamento);
}

export function criarBombeiro(data: Omit<Bombeiro, 'id' | 'createdAt' | 'updatedAt'>): Bombeiro {
  const list = getAll();
  const novo: Bombeiro = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  list.push(novo);
  saveAll(list);
  return novo;
}

export function atualizarBombeiro(id: string, data: Partial<Bombeiro>): Bombeiro | null {
  const list = getAll();
  const idx = list.findIndex(b => b.id === id);
  if (idx === -1) return null;
  list[idx] = { ...list[idx], ...data, updatedAt: new Date().toISOString() };
  saveAll(list);
  return list[idx];
}

export function excluirBombeiro(id: string): boolean {
  const list = getAll();
  const idx = list.findIndex(b => b.id === id);
  if (idx === -1) return false;
  list.splice(idx, 1);
  saveAll(list);
  return true;
}
