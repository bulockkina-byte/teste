import type { CertificacaoNR } from '../types/certificacao';

const STORAGE_KEY = 'sescinc-certificacoes';

function getAll(): CertificacaoNR[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: CertificacaoNR[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarCertificacoes(): CertificacaoNR[] {
  return getAll();
}

export function certificacoesPorFuncionario(funcionarioId: string): CertificacaoNR[] {
  return getAll().filter(c => c.funcionarioId === funcionarioId);
}

export function criarCertificacao(data: Omit<CertificacaoNR, 'id' | 'createdAt' | 'updatedAt'>): CertificacaoNR {
  const all = getAll();
  const now = new Date().toISOString();
  const nova: CertificacaoNR = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  all.push(nova);
  saveAll(all);
  return nova;
}

export function atualizarCertificacao(id: string, data: Partial<CertificacaoNR>): CertificacaoNR | null {
  const all = getAll();
  const idx = all.findIndex(c => c.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...data, updatedAt: new Date().toISOString() };
  saveAll(all);
  return all[idx];
}

export function excluirCertificacao(id: string) {
  saveAll(getAll().filter(c => c.id !== id));
}
