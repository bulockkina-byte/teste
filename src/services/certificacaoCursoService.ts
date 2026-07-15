import type { CertificacaoCurso } from '../types/certificacaoCurso';

const STORAGE_KEY = 'sescinc-certificacoes-cursos';

function getAll(): CertificacaoCurso[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveAll(list: CertificacaoCurso[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function listarCertificacoesCursos(): CertificacaoCurso[] {
  return getAll();
}

export function certificacoesCursosPorFuncionario(funcionarioId: string): CertificacaoCurso[] {
  return getAll().filter(c => c.funcionarioId === funcionarioId);
}

export function criarCertificacaoCurso(data: Omit<CertificacaoCurso, 'id' | 'createdAt' | 'updatedAt'>): CertificacaoCurso {
  const all = getAll();
  const now = new Date().toISOString();
  const nova: CertificacaoCurso = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  all.push(nova);
  saveAll(all);
  return nova;
}

export function excluirCertificacaoCurso(id: string) {
  saveAll(getAll().filter(c => c.id !== id));
}
