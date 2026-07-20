import { supabase } from '../lib/supabase';
import type { SubstituicaoTemporaria } from '../types/substituicaoTemporaria';

const TABLE = 'substituicoes_temporarias';

function getDb() {
  if (!supabase) throw new Error('Supabase não configurado. Verifique as credenciais no arquivo .env');
  return supabase;
}

function handleSupabaseError(err: unknown): never {
  console.error('Erro Supabase:', err);
  const msg =
    err instanceof Error ? err.message :
    err && typeof err === 'object' && 'message' in err ? String((err as any).message) :
    'Erro inesperado no banco de dados';
  throw new Error(msg);
}

function rowToSubstituicao(row: Record<string, unknown>): SubstituicaoTemporaria {
  return {
    id: row.id as string,
    funcionarioId: row.funcionario_id as string,
    funcionarioNome: row.funcionario_nome as string,
    funcionarioCargo: row.funcionario_cargo as string,
    substitutoId: row.substituto_id as string,
    substitutoNome: row.substituto_nome as string,
    substitutoCargo: row.substituto_cargo as string,
    tipo: (row.tipo as SubstituicaoTemporaria['tipo']) || 'Substituição',
    motivo: row.motivo as SubstituicaoTemporaria['motivo'],
    motivoOutro: row.motivo_outro as string,
    plantaoExtra: (row.plantao_extra as SubstituicaoTemporaria['plantaoExtra']) || '',
    dataInicio: row.data_inicio as string,
    dataFim: row.data_fim as string,
    dias: row.dias as number,
    status: row.status as SubstituicaoTemporaria['status'],
    observacoesRejeicao: row.observacoes_rejeicao as string,
    criadoPor: row.criado_por as string,
    criadoPorNome: row.criado_por_nome as string,
    aprovadoPor: row.aprovado_por as string,
    aprovadoPorNome: row.aprovado_por_nome as string,
    aprovadoEm: row.aprovado_em as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function substituicaoToRow(data: Partial<SubstituicaoTemporaria>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.funcionarioId !== undefined) row.funcionario_id = data.funcionarioId;
  if (data.funcionarioNome !== undefined) row.funcionario_nome = data.funcionarioNome;
  if (data.funcionarioCargo !== undefined) row.funcionario_cargo = data.funcionarioCargo;
  if (data.substitutoId !== undefined) row.substituto_id = data.substitutoId;
  if (data.substitutoNome !== undefined) row.substituto_nome = data.substitutoNome;
  if (data.substitutoCargo !== undefined) row.substituto_cargo = data.substitutoCargo;
  if (data.tipo !== undefined) row.tipo = data.tipo;
  if (data.plantaoExtra !== undefined) row.plantao_extra = data.plantaoExtra;
  if (data.motivo !== undefined) row.motivo = data.motivo;
  if (data.motivoOutro !== undefined) row.motivo_outro = data.motivoOutro;
  if (data.dataInicio !== undefined) row.data_inicio = data.dataInicio;
  if (data.dataFim !== undefined) row.data_fim = data.dataFim;
  if (data.dias !== undefined) row.dias = data.dias;
  if (data.status !== undefined) row.status = data.status;
  if (data.observacoesRejeicao !== undefined) row.observacoes_rejeicao = data.observacoesRejeicao;
  if (data.criadoPor !== undefined) row.criado_por = data.criadoPor;
  if (data.criadoPorNome !== undefined) row.criado_por_nome = data.criadoPorNome;
  if (data.aprovadoPor !== undefined) row.aprovado_por = data.aprovadoPor;
  if (data.aprovadoPorNome !== undefined) row.aprovado_por_nome = data.aprovadoPorNome;
  if (data.aprovadoEm !== undefined) row.aprovado_em = data.aprovadoEm;
  return row;
}

export async function listarSubstituicoesTemporarias(): Promise<SubstituicaoTemporaria[]> {
  const db = getDb();
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data || []).map(rowToSubstituicao);
}

export async function criarSubstituicaoTemporaria(
  data: Omit<SubstituicaoTemporaria, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<SubstituicaoTemporaria> {
  const db = getDb();
  const now = new Date().toISOString();
  const row = {
    ...substituicaoToRow(data),
    created_at: now,
    updated_at: now,
  };
  const { data: created, error } = await db
    .from(TABLE)
    .insert(row)
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return rowToSubstituicao(created);
}

export async function aprovarSubstituicaoTemporaria(
  id: string,
  aprovadoPor: string,
  aprovadoPorNome: string,
): Promise<SubstituicaoTemporaria | null> {
  const db = getDb();
  const now = new Date().toISOString();
  const row = {
    status: 'Aprovada',
    aprovado_por: aprovadoPor,
    aprovado_por_nome: aprovadoPorNome,
    aprovado_em: now,
    updated_at: now,
  };
  const { data: updated, error } = await db
    .from(TABLE)
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return updated ? rowToSubstituicao(updated) : null;
}

export async function rejeitarSubstituicaoTemporaria(
  id: string,
  aprovadoPor: string,
  aprovadoPorNome: string,
  observacoes: string,
): Promise<SubstituicaoTemporaria | null> {
  const db = getDb();
  const now = new Date().toISOString();
  const row = {
    status: 'Rejeitada',
    aprovado_por: aprovadoPor,
    aprovado_por_nome: aprovadoPorNome,
    observacoes_rejeicao: observacoes,
    aprovado_em: now,
    updated_at: now,
  };
  const { data: updated, error } = await db
    .from(TABLE)
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return updated ? rowToSubstituicao(updated) : null;
}

export async function excluirSubstituicaoTemporaria(id: string): Promise<boolean> {
  const db = getDb();
  const { error } = await db.from(TABLE).delete().eq('id', id);
  if (error) handleSupabaseError(error);
  return true;
}
