import type { Bombeiro } from '../types/bombeiro';
import { supabase } from '../lib/supabase';

const TABLE = 'bombeiros';

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

function rowToBombeiro(row: Record<string, unknown>): Bombeiro {
  return {
    id: row.id as string,
    matricula: row.matricula as string,
    nomeCompleto: row.nome_completo as string,
    nomeGuerra: row.nome_guerra as string,
    email: row.email as string,
    dataNascimento: row.data_nascimento as string,
    idade: row.idade as number,
    dataAdmissao: row.data_admissao as string,
    cargo: row.cargo as Bombeiro['cargo'],
    equipe: row.equipe as Bombeiro['equipe'],
    turno: row.turno as Bombeiro['turno'],
    tipoSanguineo: row.tipo_sanguineo as string,
    cpf: row.cpf as string,
    rg: row.rg as string,
    cnhNumero: row.cnh_numero as string,
    cnhCategoria: row.cnh_categoria as Bombeiro['cnhCategoria'],
    cnhValidade: row.cnh_validade as string,
    credencialValidade: row.credencial_validade as string,
    foto: row.foto as string,
    dataDesligamento: row.data_desligamento as string,
    endereco: row.endereco as string,
    numeroEndereco: row.numero_endereco as string,
    complemento: row.complemento as string,
    cep: row.cep as string,
    uf: row.uf as string,
    municipio: row.municipio as string,
    celular: row.celular as string,
    sexo: row.sexo as Bombeiro['sexo'],
    cursoChefeEquipe: row.curso_chefe_equipe as boolean,
    cursoMotoristaCCI: row.curso_motorista_cci as boolean,
    cursoCVE: false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function bombeiroToRow(data: Omit<Bombeiro, 'id' | 'createdAt' | 'updatedAt'>): Record<string, unknown> {
  return {
    matricula: data.matricula,
    nome_completo: data.nomeCompleto,
    nome_guerra: data.nomeGuerra,
    email: data.email,
    data_nascimento: data.dataNascimento,
    idade: data.idade,
    data_admissao: data.dataAdmissao,
    cargo: data.cargo,
    equipe: data.equipe,
    turno: data.turno,
    tipo_sanguineo: data.tipoSanguineo,
    cpf: data.cpf,
    rg: data.rg,
    cnh_numero: data.cnhNumero,
    cnh_categoria: data.cnhCategoria,
    cnh_validade: data.cnhValidade,
    credencial_validade: data.credencialValidade,
    foto: data.foto,
    data_desligamento: data.dataDesligamento,
    endereco: data.endereco,
    numero_endereco: data.numeroEndereco,
    complemento: data.complemento,
    cep: data.cep,
    uf: data.uf,
    municipio: data.municipio,
    celular: data.celular,
    sexo: data.sexo,
    curso_chefe_equipe: data.cursoChefeEquipe,
    curso_motorista_cci: data.cursoMotoristaCCI,
  };
}

export async function listarBombeiros(): Promise<Bombeiro[]> {
  const db = getDb();
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data || []).map(rowToBombeiro);
}

export async function buscarBombeiro(termo: string): Promise<Bombeiro[]> {
  const t = termo.toLowerCase();
  const db = getDb();
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .or(`nome_completo.ilike.%${t}%,nome_guerra.ilike.%${t}%,cpf.ilike.%${t}%,matricula.ilike.%${t}%,equipe.ilike.%${t}%`);
  if (error) handleSupabaseError(error);
  return (data || []).map(rowToBombeiro);
}

export async function obterBombeiro(id: string): Promise<Bombeiro | null> {
  const db = getDb();
  const { data, error } = await db.from(TABLE).select('*').eq('id', id).single();
  if (error) handleSupabaseError(error);
  return data ? rowToBombeiro(data) : null;
}

export async function listarAtivos(): Promise<Bombeiro[]> {
  const db = getDb();
  const { data, error } = await db
    .from(TABLE)
    .select('*')
    .eq('data_desligamento', '')
    .order('nome_completo');
  if (error) handleSupabaseError(error);
  return (data || []).map(rowToBombeiro);
}

export async function criarBombeiro(data: Omit<Bombeiro, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bombeiro> {
  const db = getDb();
  const row = bombeiroToRow(data);
  const { data: created, error } = await db.from(TABLE).insert(row).select().single();
  if (error) handleSupabaseError(error);
  return rowToBombeiro(created);
}

export async function atualizarBombeiro(id: string, data: Partial<Bombeiro>): Promise<Bombeiro | null> {
  const db = getDb();
  const row: Record<string, unknown> = {};
  if (data.matricula !== undefined) row.matricula = data.matricula;
  if (data.nomeCompleto !== undefined) row.nome_completo = data.nomeCompleto;
  if (data.nomeGuerra !== undefined) row.nome_guerra = data.nomeGuerra;
  if (data.email !== undefined) row.email = data.email;
  if (data.dataNascimento !== undefined) row.data_nascimento = data.dataNascimento;
  if (data.idade !== undefined) row.idade = data.idade;
  if (data.dataAdmissao !== undefined) row.data_admissao = data.dataAdmissao;
  if (data.cargo !== undefined) row.cargo = data.cargo;
  if (data.equipe !== undefined) row.equipe = data.equipe;
  if (data.turno !== undefined) row.turno = data.turno;
  if (data.tipoSanguineo !== undefined) row.tipo_sanguineo = data.tipoSanguineo;
  if (data.cpf !== undefined) row.cpf = data.cpf;
  if (data.rg !== undefined) row.rg = data.rg;
  if (data.cnhNumero !== undefined) row.cnh_numero = data.cnhNumero;
  if (data.cnhCategoria !== undefined) row.cnh_categoria = data.cnhCategoria;
  if (data.cnhValidade !== undefined) row.cnh_validade = data.cnhValidade;
  if (data.foto !== undefined) row.foto = data.foto;
  if (data.dataDesligamento !== undefined) row.data_desligamento = data.dataDesligamento;
  if (data.endereco !== undefined) row.endereco = data.endereco;
  if (data.numeroEndereco !== undefined) row.numero_endereco = data.numeroEndereco;
  if (data.complemento !== undefined) row.complemento = data.complemento;
  if (data.cep !== undefined) row.cep = data.cep;
  if (data.uf !== undefined) row.uf = data.uf;
  if (data.municipio !== undefined) row.municipio = data.municipio;
  if (data.celular !== undefined) row.celular = data.celular;
  if (data.sexo !== undefined) row.sexo = data.sexo;
  if (data.cursoChefeEquipe !== undefined) row.curso_chefe_equipe = data.cursoChefeEquipe;
  if (data.cursoMotoristaCCI !== undefined) row.curso_motorista_cci = data.cursoMotoristaCCI;
  row.updated_at = new Date().toISOString();

  const { data: updated, error } = await db.from(TABLE).update(row).eq('id', id).select().single();
  if (error) handleSupabaseError(error);
  return updated ? rowToBombeiro(updated) : null;
}

export async function excluirBombeiro(id: string): Promise<boolean> {
  const db = getDb();
  const { error } = await db.from(TABLE).delete().eq('id', id);
  if (error) handleSupabaseError(error);
  return true;
}
