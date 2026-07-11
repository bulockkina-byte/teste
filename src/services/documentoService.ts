import { supabase } from '../lib/supabase';
import type { Document, DocumentField, DocumentSigner, DocumentFill, DocumentWithFields } from '../types/document';

// =====================================================
// DOCUMENTOS (TEMPLATES)
// =====================================================

export async function listarDocumentos(): Promise<Document[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function buscarDocumento(id: string): Promise<DocumentWithFields | null> {
  const { data, error } = await supabase
    .from('documents')
    .select(`
      *,
      document_fields (*),
      document_signers (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function criarDocumento(doc: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .insert(doc)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function atualizarDocumento(id: string, updates: Partial<Document>): Promise<Document> {
  const { data, error } = await supabase
    .from('documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// CAMPOS DO DOCUMENTO
// =====================================================

export async function listarCampos(documentId: string): Promise<DocumentField[]> {
  const { data, error } = await supabase
    .from('document_fields')
    .select('*')
    .eq('document_id', documentId)
    .order('order_index');

  if (error) throw error;
  return data || [];
}

export async function criarCampo(field: Omit<DocumentField, 'id' | 'created_at'>): Promise<DocumentField> {
  const { data, error } = await supabase
    .from('document_fields')
    .insert(field)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function atualizarCampo(id: string, updates: Partial<DocumentField>): Promise<DocumentField> {
  const { data, error } = await supabase
    .from('document_fields')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function excluirCampo(id: string): Promise<void> {
  const { error } = await supabase
    .from('document_fields')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// =====================================================
// SIGNATÁRIOS
// =====================================================

export async function listarSignatarios(documentId: string): Promise<DocumentSigner[]> {
  const { data, error } = await supabase
    .from('document_signers')
    .select('*')
    .eq('document_id', documentId)
    .order('order_index');

  if (error) throw error;
  return data || [];
}

export async function criarSignatario(signer: Omit<DocumentSigner, 'id' | 'created_at'>): Promise<DocumentSigner> {
  const { data, error } = await supabase
    .from('document_signers')
    .insert(signer)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// PREENCHIMENTOS
// =====================================================

export async function criarPreenchimento(fill: Omit<DocumentFill, 'id' | 'created_at' | 'updated_at'>): Promise<DocumentFill> {
  const { data, error } = await supabase
    .from('document_fills')
    .insert(fill)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listarPreenchimentos(documentId?: string): Promise<DocumentFill[]> {
  let query = supabase
    .from('document_fills')
    .select('*')
    .order('created_at', { ascending: false });

  if (documentId) {
    query = query.eq('document_id', documentId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function atualizarPreenchimento(id: string, updates: Partial<DocumentFill>): Promise<DocumentFill> {
  const { data, error } = await supabase
    .from('document_fills')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =====================================================
// STORAGE (para PDFs)
// =====================================================

export async function uploadPDF(file: File, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, file, {
      contentType: 'application/pdf',
      upsert: true
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(data.path);

  return urlData.publicUrl;
}

export async function downloadPDF(path: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage
    .from('documents')
    .download(path);

  if (error) throw error;
  return data;
}
