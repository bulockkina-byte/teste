import { supabase } from '../lib/supabase';
import type { EPI } from '../types/epi';

function mapRow(row: Record<string, unknown>): EPI {
  return {
    id: row.id as string,
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    nome: row.nome as string,
    descricao: row.descricao as string,
    colaborador: row.colaborador as string,
    colaboradorId: row.colaborador_id as string,
    entreguePor: row.entregue_por as string,
    ca: row.ca as string,
    dataPagamento: row.data_pagamento as string,
    dataValidade: row.data_validade as string,
    fornecedor: row.fornecedor as string,
    notas: row.notas as string,
    status: (row.status as EPI['status']) || 'entregue',
    dataEnvioAutentique: row.data_envio_autentique as string,
    dataAssinatura: row.data_assinatura as string,
    dataDevolucao: row.data_devolucao as string,
  };
}

function toRow(data: Partial<EPI>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (data.nome !== undefined) row.nome = data.nome;
  if (data.descricao !== undefined) row.descricao = data.descricao;
  if (data.colaborador !== undefined) row.colaborador = data.colaborador;
  if (data.colaboradorId !== undefined) row.colaborador_id = data.colaboradorId;
  if (data.entreguePor !== undefined) row.entregue_por = data.entreguePor;
  if (data.ca !== undefined) row.ca = data.ca;
  if (data.dataPagamento !== undefined) row.data_pagamento = data.dataPagamento;
  if (data.dataValidade !== undefined) row.data_validade = data.dataValidade;
  if (data.fornecedor !== undefined) row.fornecedor = data.fornecedor;
  if (data.notas !== undefined) row.notas = data.notas;
  if (data.status !== undefined) row.status = data.status;
  if (data.dataEnvioAutentique !== undefined) row.data_envio_autentique = data.dataEnvioAutentique;
  if (data.dataAssinatura !== undefined) row.data_assinatura = data.dataAssinatura;
  if (data.dataDevolucao !== undefined) row.data_devolucao = data.dataDevolucao;
  row.updated_at = new Date().toISOString();
  return row;
}

export async function listarEPIs(): Promise<EPI[]> {
  const { data, error } = await supabase
    .from('epis')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Erro ao listar EPIs:', error);
    return [];
  }
  return (data || []).map(mapRow);
}

export async function criarEPI(
  data: Omit<EPI, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'dataEnvioAutentique' | 'dataAssinatura' | 'dataDevolucao'>
): Promise<EPI | null> {
  const row: Record<string, unknown> = {
    created_by: data.createdBy,
    nome: data.nome,
    descricao: data.descricao,
    colaborador: data.colaborador,
    colaborador_id: data.colaboradorId,
    entregue_por: data.entreguePor,
    ca: data.ca,
    data_pagamento: data.dataPagamento,
    data_validade: data.dataValidade,
    fornecedor: data.fornecedor,
    notas: data.notas,
    status: 'entregue',
    data_envio_autentique: '',
    data_assinatura: '',
    data_devolucao: '',
  };
  const { data: result, error } = await supabase
    .from('epis')
    .insert(row)
    .select()
    .single();
  if (error) {
    console.error('Erro ao criar EPI:', error);
    return null;
  }
  return mapRow(result);
}

export async function atualizarEPI(id: string, data: Partial<EPI>): Promise<EPI | null> {
  const { data: result, error } = await supabase
    .from('epis')
    .update(toRow(data))
    .eq('id', id)
    .select()
    .single();
  if (error) {
    console.error('Erro ao atualizar EPI:', error);
    return null;
  }
  return mapRow(result);
}

export async function excluirEPI(id: string): Promise<void> {
  const { error } = await supabase.from('epis').delete().eq('id', id);
  if (error) console.error('Erro ao excluir EPI:', error);
}

export async function pagarEPI(id: string): Promise<EPI | null> {
  return atualizarEPI(id, {
    status: 'pago',
    dataPagamento: new Date().toISOString().split('T')[0],
  });
}

export async function enviarAutentiqueEPI(id: string): Promise<EPI | null> {
  return atualizarEPI(id, {
    status: 'enviado_autentique',
    dataEnvioAutentique: new Date().toISOString().split('T')[0],
  });
}

export async function assinarEPI(id: string): Promise<EPI | null> {
  return atualizarEPI(id, {
    status: 'assinado',
    dataAssinatura: new Date().toISOString().split('T')[0],
  });
}

export async function devolverEPI(id: string): Promise<EPI | null> {
  return atualizarEPI(id, {
    status: 'devolvido',
    dataDevolucao: new Date().toISOString().split('T')[0],
  });
}
