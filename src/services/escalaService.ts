import { supabase } from '../lib/supabase';
import type { EscalaDiaria } from '../types/escala';

const TABLE = 'escalas_diarias';

function getDb() {
  if (!supabase) throw new Error('Supabase não configurado.');
  return supabase;
}

function rowToEscala(row: Record<string, unknown>): EscalaDiaria {
  return {
    id: row.id as string,
    createdBy: (row.created_by as string) || '',
    createdAt: (row.created_at as string) || '',
    updatedAt: (row.updated_at as string) || '',
    equipe: (row.equipe as string) || '',
    chefeEquipe: (row.chefe_equipe as string) || '',
    dataPlantao: (row.data_plantao as string) || '',
    horarioInicio: (row.horario_inicio as string) || '',
    horarioTermino: (row.horario_termino as string) || '',
    turno: (row.turno as string) || '',
    guarnicoes: (row.guarnicoes as any) || { cci02: {}, cci03: {}, crs: {} },
    bds: (row.bds as any) || {},
    ptr1: (row.ptr1 as any) || {},
    ptr2: (row.ptr2 as any) || {},
    atestados: (row.atestados as string[]) || [],
    trocas: (row.trocas as any[]) || [],
    radio: (row.radio as any[]) || [],
  };
}

export async function listarEscalas(): Promise<EscalaDiaria[]> {
  const db = getDb();
  const { data, error } = await db.from(TABLE).select('*');
  if (error) throw error;
  return (data || []).map(rowToEscala);
}

export async function listarEscalasPorUsuario(username: string): Promise<EscalaDiaria[]> {
  const db = getDb();
  const { data, error } = await db.from(TABLE).select('*').eq('created_by', username);
  if (error) throw error;
  return (data || []).map(rowToEscala);
}

export async function obterEscala(id: string): Promise<EscalaDiaria | null> {
  const db = getDb();
  const { data, error } = await db.from(TABLE).select('*').eq('id', id).single();
  if (error) return null;
  return data ? rowToEscala(data) : null;
}

export async function criarEscala(data: Omit<EscalaDiaria, 'id' | 'createdAt' | 'updatedAt'>): Promise<EscalaDiaria> {
  const db = getDb();
  const now = new Date().toISOString();
  const row = {
    created_by: data.createdBy, created_at: now, updated_at: now,
    equipe: data.equipe, chefe_equipe: data.chefeEquipe,
    data_plantao: data.dataPlantao, horario_inicio: data.horarioInicio,
    horario_termino: data.horarioTermino, turno: data.turno,
    guarnicoes: JSON.stringify(data.guarnicoes), bds: JSON.stringify(data.bds),
    ptr1: JSON.stringify(data.ptr1), ptr2: JSON.stringify(data.ptr2),
    atestados: JSON.stringify(data.atestados), trocas: JSON.stringify(data.trocas),
    radio: JSON.stringify(data.radio),
  };
  const { data: created, error } = await db.from(TABLE).insert(row).select().single();
  if (error) throw error;
  return rowToEscala(created);
}

export async function atualizarEscala(id: string, data: Partial<EscalaDiaria>): Promise<EscalaDiaria | null> {
  const db = getDb();
  const r: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.equipe !== undefined) r.equipe = data.equipe;
  if (data.chefeEquipe !== undefined) r.chefe_equipe = data.chefeEquipe;
  if (data.dataPlantao !== undefined) r.data_plantao = data.dataPlantao;
  if (data.horarioInicio !== undefined) r.horario_inicio = data.horarioInicio;
  if (data.horarioTermino !== undefined) r.horario_termino = data.horarioTermino;
  if (data.turno !== undefined) r.turno = data.turno;
  if (data.guarnicoes !== undefined) r.guarnicoes = JSON.stringify(data.guarnicoes);
  if (data.bds !== undefined) r.bds = JSON.stringify(data.bds);
  if (data.ptr1 !== undefined) r.ptr1 = JSON.stringify(data.ptr1);
  if (data.ptr2 !== undefined) r.ptr2 = JSON.stringify(data.ptr2);
  if (data.atestados !== undefined) r.atestados = JSON.stringify(data.atestados);
  if (data.trocas !== undefined) r.trocas = JSON.stringify(data.trocas);
  if (data.radio !== undefined) r.radio = JSON.stringify(data.radio);
  const { data: updated, error } = await db.from(TABLE).update(r).eq('id', id).select().single();
  if (error) throw error;
  return updated ? rowToEscala(updated) : null;
}

export async function excluirEscala(id: string): Promise<boolean> {
  const db = getDb();
  const { error } = await db.from(TABLE).delete().eq('id', id);
  if (error) throw error;
  return true;
}
