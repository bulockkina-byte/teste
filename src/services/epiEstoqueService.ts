import { supabase } from '../lib/supabase';
import type { EPIEstoque } from '../types/epi';

function getDb() {
  if (!supabase) throw new Error('Supabase não configurado. Verifique as credenciais no arquivo .env');
  return supabase;
}

function mapRow(row: Record<string, unknown>): EPIEstoque {
  return {
    id: row.id as string,
    nome: row.nome as string,
    descricao: row.descricao as string,
    ca: row.ca as string,
    fornecedor: row.fornecedor as string,
    quantidade: row.quantidade as number,
    dataFabricacao: row.data_fabricacao as string,
    tempoValidadeMeses: row.tempo_validade_meses as number,
    dataValidade: row.data_validade as string,
    tamanho: row.tamanho as string,
    numeroSerie: row.numero_serie as string,
    estado: (row.estado as EPIEstoque['estado']) || 'Novo',
    notas: row.notas as string,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function toRow(data: Partial<EPIEstoque>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.nome !== undefined) row.nome = data.nome;
  if (data.descricao !== undefined) row.descricao = data.descricao;
  if (data.ca !== undefined) row.ca = data.ca;
  if (data.fornecedor !== undefined) row.fornecedor = data.fornecedor;
  if (data.quantidade !== undefined) row.quantidade = data.quantidade;
  if (data.dataFabricacao !== undefined) row.data_fabricacao = data.dataFabricacao;
  if (data.tempoValidadeMeses !== undefined) row.tempo_validade_meses = data.tempoValidadeMeses;
  if (data.dataValidade !== undefined) row.data_validade = data.dataValidade;
  if (data.tamanho !== undefined) row.tamanho = data.tamanho;
  if (data.numeroSerie !== undefined) row.numero_serie = data.numeroSerie;
  if (data.estado !== undefined) row.estado = data.estado;
  if (data.notas !== undefined) row.notas = data.notas;
  row.updated_at = new Date().toISOString();
  return row;
}

export async function listarEstoque(): Promise<EPIEstoque[]> {
  const { data, error } = await getDb()
    .from('epis_estoque')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Erro ao listar estoque:', error);
    return [];
  }
  return (data || []).map(mapRow);
}

export async function criarEstoque(
  data: Omit<EPIEstoque, 'id' | 'createdAt' | 'updatedAt'>
): Promise<EPIEstoque | null> {
  const row: Record<string, unknown> = {
    nome: data.nome,
    descricao: data.descricao,
    ca: data.ca,
    fornecedor: data.fornecedor,
    quantidade: data.quantidade,
    data_fabricacao: data.dataFabricacao,
    tempo_validade_meses: data.tempoValidadeMeses,
    data_validade: data.dataValidade,
    tamanho: data.tamanho,
    numero_serie: data.numeroSerie,
    estado: data.estado,
    notas: data.notas,
    created_by: data.createdBy,
  };
  const { data: result, error } = await getDb()
    .from('epis_estoque')
    .insert(row)
    .select()
    .single();
  if (error) {
    console.error('Erro ao criar estoque:', error);
    return null;
  }
  return mapRow(result);
}

export async function atualizarEstoque(id: string, data: Partial<EPIEstoque>): Promise<EPIEstoque | null> {
  const { data: result, error } = await getDb()
    .from('epis_estoque')
    .update(toRow(data))
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Erro ao atualizar estoque:', error);
    return null;
  }
  return mapRow(result);
}

export async function excluirEstoque(id: string): Promise<void> {
  const { error } = await getDb().from('epis_estoque').delete().eq('id', id);
  if (error) console.error('Erro ao excluir estoque:', error);
}

export async function baixarEstoque(id: string, quantidade: number = 1): Promise<EPIEstoque | null> {
  const itens = await listarEstoque();
  const item = itens.find(e => e.id === id);
  if (!item) return null;
  const novaQuantidade = Math.max(0, item.quantidade - quantidade);
  return atualizarEstoque(id, { quantidade: novaQuantidade });
}

export async function reporEstoque(id: string, quantidade: number = 1): Promise<EPIEstoque | null> {
  const itens = await listarEstoque();
  const item = itens.find(e => e.id === id);
  if (!item) return null;
  return atualizarEstoque(id, { quantidade: item.quantidade + quantidade });
}
