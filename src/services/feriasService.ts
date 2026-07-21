import { supabase } from '../lib/supabase';
import type { FeriasGozo, EscalaFerias, EscalaFeriasItem, FeriasAlerta } from '../types/ferias';
import type { Bombeiro, Equipe, Cargo } from '../types/bombeiro';

const TABLE_GOZO = 'ferias';
const TABLE_ESCALA = 'ferias_escala';
const TABLE_ITEM = 'ferias_escala_item';

function getDb() {
  if (!supabase) throw new Error('Supabase não configurado');
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

// ── Helpers: snake_case ↔ camelCase ──────────────────────────────────

function rowToGozo(row: Record<string, unknown>): FeriasGozo {
  return {
    id: row.id as string,
    funcionarioId: row.funcionario_id as string,
    funcionarioNome: row.funcionario_nome as string,
    equipe: row.equipe as Equipe,
    periodoNumero: row.periodo_numero as number,
    dataInicio: row.data_inicio as string,
    dataFim: row.data_fim as string,
    dias: row.dias as number,
    status: row.status as FeriasGozo['status'],
    substitutoId: row.substituto_id as string,
    substitutoNome: row.substituto_nome as string,
    funcaoSubstituicao: row.funcao_substituicao as Cargo | '',
    observacoes: row.observacoes as string,
    modificadoPor: row.modificado_por as string,
    bloqueado: row.bloqueado as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function gozoToRow(data: Partial<FeriasGozo>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.funcionarioId !== undefined) row.funcionario_id = data.funcionarioId;
  if (data.funcionarioNome !== undefined) row.funcionario_nome = data.funcionarioNome;
  if (data.equipe !== undefined) row.equipe = data.equipe;
  if (data.periodoNumero !== undefined) row.periodo_numero = data.periodoNumero;
  if (data.dataInicio !== undefined) row.data_inicio = data.dataInicio;
  if (data.dataFim !== undefined) row.data_fim = data.dataFim;
  if (data.dias !== undefined) row.dias = data.dias;
  if (data.status !== undefined) row.status = data.status;
  if (data.substitutoId !== undefined) row.substituto_id = data.substitutoId;
  if (data.substitutoNome !== undefined) row.substituto_nome = data.substitutoNome;
  if (data.funcaoSubstituicao !== undefined) row.funcao_substituicao = data.funcaoSubstituicao;
  if (data.observacoes !== undefined) row.observacoes = data.observacoes;
  if (data.modificadoPor !== undefined) row.modificado_por = data.modificadoPor;
  if (data.bloqueado !== undefined) row.bloqueado = data.bloqueado;
  return row;
}

function rowToEscala(row: Record<string, unknown>): EscalaFerias {
  return {
    id: row.id as string,
    equipe: row.equipe as Equipe,
    ano: row.ano as number,
    chefeId: row.chefe_id as string,
    chefeNome: row.chefe_nome as string,
    status: row.status as EscalaFerias['status'],
    observacoesRejeicao: row.observacoes_rejeicao as string,
    aprovadoPor: row.aprovado_por as string,
    aprovadoPorNome: row.aprovado_por_nome as string,
    aprovadoEm: row.aprovado_em as string,
    enviadoEm: row.enviado_em as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function escalaToRow(data: Partial<EscalaFerias>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.equipe !== undefined) row.equipe = data.equipe;
  if (data.ano !== undefined) row.ano = data.ano;
  if (data.chefeId !== undefined) row.chefe_id = data.chefeId;
  if (data.chefeNome !== undefined) row.chefe_nome = data.chefeNome;
  if (data.status !== undefined) row.status = data.status;
  if (data.observacoesRejeicao !== undefined) row.observacoes_rejeicao = data.observacoesRejeicao;
  if (data.aprovadoPor !== undefined) row.aprovado_por = data.aprovadoPor;
  if (data.aprovadoPorNome !== undefined) row.aprovado_por_nome = data.aprovadoPorNome;
  if (data.aprovadoEm !== undefined) row.aprovado_em = data.aprovadoEm;
  if (data.enviadoEm !== undefined) row.enviado_em = data.enviadoEm;
  return row;
}

function rowToItem(row: Record<string, unknown>): EscalaFeriasItem {
  return {
    id: row.id as string,
    escalaId: row.escala_id as string,
    mes: row.mes as number,
    funcionarioId: row.funcionario_id as string,
    funcionarioNome: row.funcionario_nome as string,
    funcao: row.funcao as Cargo,
    dias: row.dias as number,
    dataInicio: row.data_inicio as string,
    dataFim: row.data_fim as string,
    substitutoId: row.substituto_id as string,
    substitutoNome: row.substituto_nome as string,
    funcaoSubstituicao: row.funcao_substituicao as Cargo | '',
    feristaId: row.ferista_id as string,
    feristaNome: row.ferista_nome as string,
    periodoNumero: (row.periodo_numero as number) || 0,
    rejeitado: (row.rejeitado as boolean) || false,
    motivoRejeicao: (row.motivo_rejeicao as string) || '',
    rejeitadoPor: (row.rejeitado_por as string) || '',
    rejeitadoEm: (row.rejeitado_em as string) || '',
    enviado: (row.enviado as boolean) || false,
    createdAt: row.created_at as string,
  };
}

function itemToRow(data: Partial<EscalaFeriasItem>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.enviado !== undefined) row.enviado = data.enviado;
  if (data.escalaId !== undefined) row.escala_id = data.escalaId;
  if (data.mes !== undefined) row.mes = data.mes;
  if (data.funcionarioId !== undefined) row.funcionario_id = data.funcionarioId;
  if (data.funcionarioNome !== undefined) row.funcionario_nome = data.funcionarioNome;
  if (data.funcao !== undefined) row.funcao = data.funcao;
  if (data.dias !== undefined) row.dias = data.dias;
  if (data.dataInicio !== undefined) row.data_inicio = data.dataInicio;
  if (data.dataFim !== undefined) row.data_fim = data.dataFim;
  if (data.substitutoId !== undefined) row.substituto_id = data.substitutoId;
  if (data.substitutoNome !== undefined) row.substituto_nome = data.substitutoNome;
  if (data.funcaoSubstituicao !== undefined) row.funcao_substituicao = data.funcaoSubstituicao;
  if (data.feristaId !== undefined) row.ferista_id = data.feristaId;
  if (data.feristaNome !== undefined) row.ferista_nome = data.feristaNome;
  if (data.periodoNumero !== undefined) row.periodo_numero = data.periodoNumero;
  if (data.rejeitado !== undefined) row.rejeitado = data.rejeitado;
  if (data.motivoRejeicao !== undefined) row.motivo_rejeicao = data.motivoRejeicao;
  if (data.rejeitadoPor !== undefined) row.rejeitado_por = data.rejeitadoPor;
  if (data.rejeitadoEm !== undefined) row.rejeitado_em = data.rejeitadoEm;
  return row;
}

// ── Ferias Gozo CRUD ─────────────────────────────────────────────────

export async function listarFeriasGozo(): Promise<FeriasGozo[]> {
  const db = getDb();
  const { data, error } = await db
    .from(TABLE_GOZO)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data || []).map(rowToGozo);
}

export async function feriasPorFuncionario(funcionarioId: string): Promise<FeriasGozo[]> {
  const db = getDb();
  const { data, error } = await db
    .from(TABLE_GOZO)
    .select('*')
    .eq('funcionario_id', funcionarioId)
    .order('data_inicio', { ascending: true });
  if (error) handleSupabaseError(error);
  return (data || []).map(rowToGozo);
}

export async function criarFeriasGozo(
  data: Omit<FeriasGozo, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<FeriasGozo> {
  const db = getDb();
  const now = new Date().toISOString();
  const row = {
    ...gozoToRow(data),
    created_at: now,
    updated_at: now,
  };
  const { data: created, error } = await db
    .from(TABLE_GOZO)
    .insert(row)
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return rowToGozo(created);
}

export async function atualizarFeriasGozo(
  id: string,
  data: Partial<FeriasGozo>,
): Promise<FeriasGozo | null> {
  const db = getDb();
  const row = { ...gozoToRow(data), updated_at: new Date().toISOString() };
  const { data: updated, error } = await db
    .from(TABLE_GOZO)
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return updated ? rowToGozo(updated) : null;
}

export async function excluirFeriasGozo(id: string): Promise<boolean> {
  const db = getDb();
  const { error } = await db.from(TABLE_GOZO).delete().eq('id', id);
  if (error) handleSupabaseError(error);
  return true;
}

// ── Escala CRUD ──────────────────────────────────────────────────────

export async function listarEscalas(
  equipe?: string,
  ano?: number,
): Promise<EscalaFerias[]> {
  const db = getDb();
  let query = db.from(TABLE_ESCALA).select('*');
  if (equipe) query = query.eq('equipe', equipe);
  if (ano) query = query.eq('ano', ano);
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) handleSupabaseError(error);
  return (data || []).map(rowToEscala);
}

export async function obterEscala(id: string): Promise<EscalaFerias | null> {
  const db = getDb();
  const { data, error } = await db
    .from(TABLE_ESCALA)
    .select('*')
    .eq('id', id)
    .single();
  if (error) handleSupabaseError(error);
  return data ? rowToEscala(data) : null;
}

export async function criarEscala(
  data: Omit<EscalaFerias, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<EscalaFerias> {
  const db = getDb();
  const now = new Date().toISOString();
  const row = {
    ...escalaToRow(data),
    created_at: now,
    updated_at: now,
  };
  const { data: created, error } = await db
    .from(TABLE_ESCALA)
    .insert(row)
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return rowToEscala(created);
}

export async function atualizarEscala(
  id: string,
  data: Partial<EscalaFerias>,
): Promise<EscalaFerias | null> {
  const db = getDb();
  const row = { ...escalaToRow(data), updated_at: new Date().toISOString() };
  const { data: updated, error } = await db
    .from(TABLE_ESCALA)
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return updated ? rowToEscala(updated) : null;
}

export async function excluirEscala(id: string): Promise<boolean> {
  const db = getDb();
  await excluirItensEscala(id);
  const { error } = await db.from(TABLE_ESCALA).delete().eq('id', id);
  if (error) handleSupabaseError(error);
  return true;
}

export async function enviarEscala(id: string): Promise<EscalaFerias | null> {
  const now = new Date().toISOString();
  return atualizarEscala(id, { status: 'Enviado', enviadoEm: now });
}

export async function aprovarEscala(
  id: string,
  aprovadoPor: string,
  aprovadoPorNome: string,
): Promise<EscalaFerias | null> {
  const now = new Date().toISOString();
  return atualizarEscala(id, {
    status: 'Aprovado',
    aprovadoPor,
    aprovadoPorNome,
    aprovadoEm: now,
  });
}

export async function aprovarEscalaEGerarGozos(
  id: string,
  aprovadoPor: string,
  aprovadoPorNome: string,
): Promise<EscalaFerias | null> {
  const escala = await aprovarEscala(id, aprovadoPor, aprovadoPorNome);
  if (!escala) return null;
  const itens = await listarItensEscala(id);
  const existentes = await listarFeriasGozo();
  const db = getDb();
  const now = new Date().toISOString();
  for (const item of itens) {
    if (item.rejeitado) continue;
    const jaExiste = existentes.some(
      g => g.funcionarioId === item.funcionarioId && g.periodoNumero === item.periodoNumero
    );
    if (jaExiste) continue;
    const row = gozoToRow({
      funcionarioId: item.funcionarioId,
      funcionarioNome: item.funcionarioNome,
      equipe: escala.equipe,
      periodoNumero: item.periodoNumero,
      dataInicio: item.dataInicio,
      dataFim: item.dataFim,
      dias: item.dias,
      status: 'Programadas',
      substitutoId: item.substitutoId,
      substitutoNome: item.substitutoNome,
      funcaoSubstituicao: item.funcaoSubstituicao,
      observacoes: item.feristaNome ? `Ferista: ${item.feristaNome}` : '',
      modificadoPor: aprovadoPor,
      bloqueado: false,
    });
    const { error } = await db.from(TABLE_GOZO).insert({
      ...row,
      created_at: now,
      updated_at: now,
    });
    if (error) handleSupabaseError(error);
  }
  return escala;
}

export async function rejeitarEscala(
  id: string,
  observacoes: string,
): Promise<EscalaFerias | null> {
  return atualizarEscala(id, {
    status: 'Rejeitado',
    observacoesRejeicao: observacoes,
  });
}

// ── Escala Items CRUD ────────────────────────────────────────────────

export async function listarItensEscala(
  escalaId: string,
): Promise<EscalaFeriasItem[]> {
  const db = getDb();
  const { data, error } = await db
    .from(TABLE_ITEM)
    .select('*')
    .eq('escala_id', escalaId)
    .order('mes', { ascending: true });
  if (error) handleSupabaseError(error);
  return (data || []).map(rowToItem);
}

export async function criarItemEscala(
  data: Omit<EscalaFeriasItem, 'id' | 'createdAt'>,
): Promise<EscalaFeriasItem> {
  const db = getDb();
  const row = {
    ...itemToRow(data),
    created_at: new Date().toISOString(),
  };
  const { data: created, error } = await db
    .from(TABLE_ITEM)
    .insert(row)
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return rowToItem(created);
}

export async function atualizarItemEscala(
  id: string,
  data: Partial<EscalaFeriasItem>,
): Promise<EscalaFeriasItem | null> {
  const db = getDb();
  const row = itemToRow(data);
  const { data: updated, error } = await db
    .from(TABLE_ITEM)
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return updated ? rowToItem(updated) : null;
}

export async function excluirItemEscala(id: string): Promise<boolean> {
  const db = getDb();
  const { error } = await db.from(TABLE_ITEM).delete().eq('id', id);
  if (error) handleSupabaseError(error);
  return true;
}

export async function excluirItensEscala(escalaId: string): Promise<void> {
  const db = getDb();
  const { error } = await db.from(TABLE_ITEM).delete().eq('escala_id', escalaId);
  if (error) handleSupabaseError(error);
}

export async function rejeitarItemEscala(
  id: string,
  motivo: string,
  rejeitadoPor: string,
): Promise<EscalaFeriasItem | null> {
  const db = getDb();
  const now = new Date().toISOString();
  const { data: updated, error } = await db
    .from(TABLE_ITEM)
    .update({
      rejeitado: true,
      motivo_rejeicao: motivo,
      rejeitado_por: rejeitadoPor,
      rejeitado_em: now,
    })
    .eq('id', id)
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return updated ? rowToItem(updated) : null;
}

export async function enviarItemEscala(id: string): Promise<EscalaFeriasItem | null> {
  const db = getDb();
  const { data: updated, error } = await db
    .from(TABLE_ITEM)
    .update({ enviado: true })
    .eq('id', id)
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return updated ? rowToItem(updated) : null;
}

export async function aprovarItemEscala(id: string): Promise<EscalaFeriasItem | null> {
  const db = getDb();
  const { data: updated, error } = await db
    .from(TABLE_ITEM)
    .update({
      rejeitado: false,
      motivo_rejeicao: '',
      rejeitado_por: '',
      rejeitado_em: '',
    })
    .eq('id', id)
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return updated ? rowToItem(updated) : null;
}

// ── Alerts ───────────────────────────────────────────────────────────

export async function alertasFerias(
  bombeiros: Bombeiro[],
): Promise<FeriasAlerta[]> {
  const agora = new Date();
  const alertas: FeriasAlerta[] = [];

  for (const b of bombeiros) {
    if (!b.dataAdmissao) continue;
    const admissao = new Date(b.dataAdmissao);
    const diffAnos = (agora.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const periodoAtual = Math.floor(diffAnos / 2) + 1;

    const inicioVigencia = new Date(admissao);
    inicioVigencia.setFullYear(inicioVigencia.getFullYear() + (periodoAtual - 1) * 2);
    const fimVigencia = new Date(inicioVigencia);
    fimVigencia.setFullYear(fimVigencia.getFullYear() + 2);
    const diffMs = fimVigencia.getTime() - agora.getTime();
    const diasParaVencer = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diasParaVencer > 0) {
      let nivel: FeriasAlerta['nivel'] = 'ok';
      if (diasParaVencer <= 30) nivel = 'critico';
      else if (diasParaVencer <= 60) nivel = 'perigo';
      else if (diasParaVencer <= 90) nivel = 'alerta';

      alertas.push({
        funcionarioId: b.id,
        funcionarioNome: b.nomeCompleto,
        equipe: b.equipe,
        dataAdmissao: b.dataAdmissao,
        periodoNumero: periodoAtual,
        diasParaVencer,
        nivel,
      });
    }
  }

  return alertas.sort((a, b) => a.diasParaVencer - b.diasParaVencer);
}

// ── Legacy compatibility ─────────────────────────────────────────────

export function listarFerias(): any[] {
  return [];
}

export function alertasVencimento(_meses: number): Promise<any[]> {
  return Promise.resolve([]);
}

export function criarFerias(data: any): any {
  return data;
}

export function atualizarFerias(_id: string, data: any): any {
  return data;
}

export function excluirFerias(_id: string): void {}
