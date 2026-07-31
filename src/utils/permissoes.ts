import type { Bombeiro, Cargo, Equipe } from '../types/bombeiro';
import { listarAtivos, obterBombeiro } from '../services/bombeiroService';
import { listarVigencias } from '../services/vigenciaSubstituicaoService';

const EQUIPES: readonly Equipe[] = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Ferista', 'Embaixador'];
const CARGOS_RESPONSAVEIS_EQUIPE: readonly Cargo[] = ['BA-CE', 'BA-LR'];

export type CadastroModuloRestrito = 'equipamentos' | 'viaturas' | 'extintores' | 'hidrantes';

export type AuthUserPermissao = {
  role?: string;
  name?: string;
  username?: string;
  pessoa?: {
    id?: string;
    nomeGuerra?: string;
    personType?: string;
    funcao?: string;
    equipe?: string;
  };
} | null;

export interface ContextoOperacionalPermissao {
  equipe: Equipe | null;
  cargo: string | null;
  canManageGlobal: boolean;
  isAdministradorSistema: boolean;
  bombeiroId: string | null;
}

export function isAdministradorSistema(user: AuthUserPermissao): boolean {
  return user?.role === 'desenvolvedor' || user?.role === 'admin';
}

export function isGSBase(user: AuthUserPermissao): boolean {
  return user?.pessoa?.personType === 'bombeiro' && user.pessoa.funcao === 'GS';
}

export function podeVerCadastroCompletoBase(user: AuthUserPermissao): boolean {
  return isAdministradorSistema(user) || isGSBase(user);
}

function equipeValida(equipe: string | undefined | null): Equipe | null {
  return equipe && (EQUIPES as readonly string[]).includes(equipe) ? equipe as Equipe : null;
}

function contextoBase(user: AuthUserPermissao): ContextoOperacionalPermissao {
  const admin = isAdministradorSistema(user);
  return {
    equipe: equipeValida(user?.pessoa?.equipe),
    cargo: user?.pessoa?.funcao || null,
    canManageGlobal: admin || isGSBase(user),
    isAdministradorSistema: admin,
    bombeiroId: user?.pessoa?.personType === 'bombeiro' ? user.pessoa.id || null : null,
  };
}

async function resolverBombeiroVinculado(user: AuthUserPermissao): Promise<Bombeiro | null> {
  if (!user || user.pessoa?.personType !== 'bombeiro') return null;

  const pessoaId = user.pessoa?.id;
  if (pessoaId) {
    try {
      return await obterBombeiro(pessoaId);
    } catch {
      // Continua para fallback por nome/equipe.
    }
  }

  try {
    const equipeBase = equipeValida(user.pessoa?.equipe);
    const ativos = equipeBase ? await listarAtivos({ equipe: equipeBase }) : await listarAtivos();
    return ativos.find(b =>
      b.id === pessoaId ||
      b.nomeCompleto === user.name ||
      b.nomeGuerra === user.pessoa?.nomeGuerra
    ) || null;
  } catch {
    return null;
  }
}

export async function resolverContextoOperacional(user: AuthUserPermissao): Promise<ContextoOperacionalPermissao> {
  const base = contextoBase(user);

  if (!user || base.isAdministradorSistema || user.pessoa?.personType !== 'bombeiro') {
    return base;
  }

  const bombeiro = await resolverBombeiroVinculado(user);
  if (!bombeiro) return base;

  const hoje = new Date().toISOString().split('T')[0];
  try {
    const vigencias = await listarVigencias({
      ativa: true,
      substitutoId: bombeiro.id,
      dataInicio: hoje,
      dataFim: hoje,
    });

    const vigenciaAtual = vigencias.find(v =>
      v.substitutoId !== v.funcionarioOriginalId &&
      v.dataInicio <= hoje &&
      hoje <= v.dataFim
    );

    const cargoEfetivo = vigenciaAtual?.cargoExercido || bombeiro.cargo;
    const equipeEfetiva = equipeValida(vigenciaAtual?.equipe) || bombeiro.equipe;

    return {
      equipe: equipeEfetiva,
      cargo: cargoEfetivo,
      canManageGlobal: cargoEfetivo === 'GS',
      isAdministradorSistema: false,
      bombeiroId: bombeiro.id,
    };
  } catch {
    return {
      equipe: bombeiro.equipe,
      cargo: bombeiro.cargo,
      canManageGlobal: bombeiro.cargo === 'GS',
      isAdministradorSistema: false,
      bombeiroId: bombeiro.id,
    };
  }
}

export function canGerenciarCadastroModulo(
  contexto: ContextoOperacionalPermissao,
  modulo: CadastroModuloRestrito,
): boolean {
  if (contexto.isAdministradorSistema || contexto.canManageGlobal) return true;
  if (!contexto.cargo || !CARGOS_RESPONSAVEIS_EQUIPE.includes(contexto.cargo as Cargo)) return false;

  if (modulo === 'equipamentos' || modulo === 'viaturas') {
    return contexto.equipe === 'Bravo';
  }

  return contexto.equipe === 'Alfa';
}
