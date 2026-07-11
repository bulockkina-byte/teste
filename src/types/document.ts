export interface Document {
  id: string;
  name: string;
  description: string | null;
  category: string;
  template_pdf_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentField {
  id: string;
  document_id: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  placeholder: string | null;
  options: string[] | null;
  order_index: number;
  created_at: string;
}

export interface DocumentSigner {
  id: string;
  document_id: string;
  signer_name: string;
  signer_role: string;
  order_index: number;
  required: boolean;
  created_at: string;
}

export interface DocumentFill {
  id: string;
  document_id: string;
  filled_by: string | null;
  filled_data: Record<string, any>;
  status: 'draft' | 'pending' | 'signed' | 'cancelled';
  autentique_document_id: string | null;
  autentique_link: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentWithFields extends Document {
  document_fields: DocumentField[];
  document_signers: DocumentSigner[];
}

export type DocumentCategory = 'operacional' | 'administrativo' | 'treinamento' | 'geral';
