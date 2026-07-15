import { supabase } from '../lib/supabase';
import type { UserRole } from '../context/AuthContext';

const TABLE = 'usuarios';

function getDb() {
  if (!supabase) throw new Error('Supabase não configurado. Verifique as credenciais no arquivo .env');
  return supabase;
}

function handleSupabaseError(err: unknown): never {
  console.error('Erro Supabase:', err);
  const msg = err instanceof Error ? err.message : 'Erro inesperado no banco de dados';
  throw new Error(msg);
}

export interface Usuario {
  id: string;
  username: string;
  name: string;
  password: string;
  role: UserRole;
  previousRole?: UserRole;
  personId?: string;
  personType?: 'bombeiro' | 'apoc';
  createdAt: string;
  updatedAt: string;
}

function rowToUsuario(row: Record<string, unknown>): Usuario {
  return {
    id: row.id as string,
    username: row.username as string,
    name: row.name as string,
    password: row.password as string,
    role: row.role as UserRole,
    previousRole: row.previous_role as UserRole | undefined,
    personId: row.person_id as string | undefined,
    personType: row.person_type as 'bombeiro' | 'apoc' | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function usuarioToRow(data: Partial<Usuario>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.username !== undefined) row.username = data.username;
  if (data.name !== undefined) row.name = data.name;
  if (data.password !== undefined) row.password = data.password;
  if (data.role !== undefined) row.role = data.role;
  if (data.previousRole !== undefined) row.previous_role = data.previousRole;
  if (data.personId !== undefined) row.person_id = data.personId;
  if (data.personType !== undefined) row.person_type = data.personType;
  row.updated_at = new Date().toISOString();
  return row;
}

export async function listarUsuarios(): Promise<Usuario[]> {
  const db = getDb();
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data || []).map(rowToUsuario);
}

export async function buscarUsuarioPorUsername(username: string): Promise<Usuario | null> {
  const db = getDb();
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('username', username)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    handleSupabaseError(error);
  }
  return data ? rowToUsuario(data) : null;
}

export async function criarUsuario(data: Omit<Usuario, 'id' | 'createdAt' | 'updatedAt'>): Promise<Usuario> {
  const db = getDb();
  const row = usuarioToRow(data);
  const { data: created, error } = await db
    .from(TABLE)
    .upsert(row, { onConflict: 'username' })
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return rowToUsuario(created);
}

export async function atualizarUsuario(username: string, data: Partial<Usuario>): Promise<Usuario | null> {
  const db = getDb();
  const row = usuarioToRow(data);
  const { data: updated, error } = await db
    .from(TABLE)
    .upsert({ ...row, username }, { onConflict: 'username' })
    .select()
    .single();
  if (error) handleSupabaseError(error);
  return updated ? rowToUsuario(updated) : null;
}

export async function excluirUsuario(username: string): Promise<boolean> {
  const db = getDb();
  const { error } = await db.from(TABLE).delete().eq('username', username);
  if (error) handleSupabaseError(error);
  return true;
}
