import { supabase } from '../lib/supabase';

const TABLE = 'lro_drafts';

function getDb() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

export type LRODraftStatus = 'rascunho' | 'aguardando' | 'assinado' | 'cancelado';

export interface LRODraft {
  id: string;
  equipe: string;
  data_plantao: string;
  status: LRODraftStatus;
  autentique_doc_id?: string;
  dados: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

function rowToDraft(row: Record<string, unknown>): LRODraft {
  return {
    id: row.id as string,
    equipe: (row.equipe as string) || '',
    data_plantao: (row.data_plantao as string) || '',
    status: (row.status as LRODraftStatus) || 'rascunho',
    autentique_doc_id: row.autentique_doc_id as string | undefined,
    dados: (row.dados as Record<string, unknown>) || {},
    created_by: (row.created_by as string) || '',
    created_at: (row.created_at as string) || '',
    updated_at: (row.updated_at as string) || '',
    expires_at: (row.expires_at as string) || '',
  };
}

export async function listarDrafts(createdBy: string): Promise<LRODraft[]> {
  const db = getDb();
  let query = db.from(TABLE).select('*');
  if (createdBy) query = query.eq('created_by', createdBy);
  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(rowToDraft);
}

export async function obterDraft(id: string): Promise<LRODraft | null> {
  const db = getDb();
  const { data, error } = await db.from(TABLE).select('*').eq('id', id).single();
  if (error) return null;
  return data ? rowToDraft(data) : null;
}

export async function salvarDraft(
  dados: Record<string, unknown>,
  equipe: string,
  data_plantao: string,
  createdBy: string,
  draftId?: string,
): Promise<LRODraft> {
  const db = getDb();
  const now = new Date().toISOString();
  const row = {
    equipe,
    data_plantao,
    dados,
    created_by: createdBy,
    updated_at: now,
  };

  if (draftId) {
    const { data, error } = await db.from(TABLE).update(row).eq('id', draftId).select().single();
    if (error) throw error;
    return rowToDraft(data);
  }

  const { data, error } = await db.from(TABLE).insert({ ...row, created_at: now, status: 'rascunho' }).select().single();
  if (error) throw error;
  return rowToDraft(data);
}

export async function atualizarStatus(id: string, status: LRODraftStatus, autentiqueDocId?: string): Promise<void> {
  const db = getDb();
  const r: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (autentiqueDocId) r.autentique_doc_id = autentiqueDocId;
  await db.from(TABLE).update(r).eq('id', id);
}

export async function excluirDraft(id: string): Promise<void> {
  const db = getDb();
  await db.from(TABLE).delete().eq('id', id);
}
