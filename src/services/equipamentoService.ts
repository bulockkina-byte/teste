import type { Equipamento } from '../types/equipamento';

const STORAGE_KEY = 'sescinc-equipamentos';

function getStored(): Equipamento[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveStored(list: Equipamento[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarEquipamentos(): Equipamento[] {
  return getStored();
}

export function equipamentosPorCategoria(categoria: string): Equipamento[] {
  return getStored().filter(e => e.categoria === categoria);
}

export function criarEquipamento(data: Omit<Equipamento, 'id' | 'createdAt' | 'updatedAt'>): Equipamento {
  const now = new Date().toISOString();
  const item: Equipamento = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const all = getStored();
  all.push(item);
  saveStored(all);
  return item;
}

export function atualizarEquipamento(id: string, data: Partial<Omit<Equipamento, 'id' | 'createdAt' | 'updatedAt'>>): void {
  const all = getStored();
  const idx = all.findIndex(e => e.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
    saveStored(all);
  }
}

export function excluirEquipamento(id: string): void {
  saveStored(getStored().filter(e => e.id !== id));
}
