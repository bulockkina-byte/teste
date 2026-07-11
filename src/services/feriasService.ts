import type { Ferias, AlertaVencimento } from '../types/ferias';
import type { Equipe } from '../types/bombeiro';
import { listarBombeiros, listarAtivos } from './bombeiroService';

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

export function feriasPorEquipe(equipe: Equipe): Ferias[] {
  const bombeiros = listarBombeiros().filter(b => b.equipe === equipe);
  const ids = new Set(bombeiros.map(b => b.id));
  return getAll().filter(f => ids.has(f.funcionarioId));
}

export function alertasVencimento(meses: 3 | 6 | 12): AlertaVencimento[] {
  const agora = new Date();
  const bombeiros = listarAtivos();
  const alertas: AlertaVencimento[] = [];

  for (const b of bombeiros) {
    if (!b.dataAdmissao) continue;
    const admissao = new Date(b.dataAdmissao);
    const vencimento = new Date(admissao);
    vencimento.setFullYear(vencimento.getFullYear() + 2);
    const diffMs = vencimento.getTime() - agora.getTime();
    const diasParaVencer = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diasParaVencer <= meses * 30 && diasParaVencer > 0) {
      let nivel: AlertaVencimento['nivel'] = 'ok';
      if (diasParaVencer <= 30) nivel = 'critico';
      else if (diasParaVencer <= 60) nivel = 'perigo';
      else if (diasParaVencer <= 90) nivel = 'alerta';

      alertas.push({
        funcionarioId: b.id,
        funcionarioNome: b.nomeCompleto,
        equipe: b.equipe,
        dataAdmissao: b.dataAdmissao,
        diasParaVencer,
        nivel,
      });
    }
  }

  return alertas.sort((a, b) => a.diasParaVencer - b.diasParaVencer);
}

export function criarFerias(data: Omit<Ferias, 'id' | 'createdAt' | 'updatedAt'>): Ferias {
  const all = getAll();
  const now = new Date().toISOString();
  const nova: Ferias = {
    ...data,
    substitutoId: data.substitutoId || '',
    substitutoNome: data.substitutoNome || '',
    funcaoSubstituicao: data.funcaoSubstituicao || '',
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
