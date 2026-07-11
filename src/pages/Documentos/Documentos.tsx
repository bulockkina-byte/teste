import { useState, useEffect } from 'react';
import {
  FileText, Plus, Search, Send, Eye, Upload, Loader2,
  ChevronDown, ChevronUp, Edit3, CheckCircle,
  Trash2, Download, FileUp
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import {
  listarDocumentos,
  buscarDocumento,
  criarDocumento,
  atualizarDocumento,
  criarCampo,
  excluirCampo,
  criarPreenchimento,
  listarPreenchimentos,
  uploadPDF,
} from '../../services/documentoService';
import { lerCamposPdfDeUrl, preencherPdf, downloadPdf } from '../../services/pdfService';
import type { Document, DocumentWithFields, DocumentFill, DocumentField } from '../../types/document';
import { useAuth } from '../../context/AuthContext';

type ViewState = 'list' | 'fill' | 'preview' | 'admin';

export function Documentos() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin';

  const [documentos, setDocumentos] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentWithFields | null>(null);
  const [preenchimentos, setPreenchimentos] = useState<DocumentFill[]>([]);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<ViewState>('list');
  const [expandedFill, setExpandedFill] = useState<string | null>(null);

  // Admin state
  const [newDocName, setNewDocName] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('operacional');
  const [scanningFields, setScanningFields] = useState(false);

  useEffect(() => {
    loadDocumentos();
  }, []);

  async function loadDocumentos() {
    try {
      const docs = await listarDocumentos();
      setDocumentos(docs);
    } catch (err) {
      console.error('Erro ao carregar documentos:', err);
    } finally {
      setLoading(false);
    }
  }

  async function selectDocument(doc: Document) {
    try {
      setLoading(true);
      const fullDoc = await buscarDocumento(doc.id);
      setSelectedDoc(fullDoc);
      const fills = await listarPreenchimentos(doc.id);
      setPreenchimentos(fills);
      setFormData({});
      setView('fill');
    } catch (err) {
      console.error('Erro ao carregar documento:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleFieldChange(fieldName: string, value: any) {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  }

  function validateForm(): boolean {
    if (!selectedDoc) return false;
    for (const field of selectedDoc.document_fields) {
      if (field.required && !formData[field.field_name]) {
        alert(`Preencha o campo: ${field.field_label}`);
        return false;
      }
    }
    return true;
  }

  async function handleSaveDraft() {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      const fill = await criarPreenchimento({
        document_id: selectedDoc.id,
        filled_by: user?.username || null,
        filled_data: formData,
        status: 'draft',
        autentique_document_id: null,
        autentique_link: null,
      });
      setPreenchimentos(prev => [fill, ...prev]);
      alert('Rascunho salvo!');
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar rascunho');
    } finally {
      setSaving(false);
    }
  }

  async function handleGerarPdf() {
    if (!selectedDoc || !validateForm()) return;
    setSaving(true);
    try {
      // Se tem template PDF, preenche os campos
      if (selectedDoc.template_pdf_url) {
        const response = await fetch(selectedDoc.template_pdf_url);
        const pdfBytes = await response.arrayBuffer();

        // Converte dados para string
        const dadosStr: Record<string, string> = {};
        for (const [key, value] of Object.entries(formData)) {
          dadosStr[key] = String(value || '');
        }

        const pdfBlob = await preencherPdf(pdfBytes, dadosStr);
        const nomeArquivo = `${selectedDoc.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        downloadPdf(pdfBlob, nomeArquivo);
      } else {
        alert('Este documento não tem template PDF vinculado. Faça upload primeiro.');
      }
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      alert('Erro ao gerar PDF');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendToAutentique() {
    if (!selectedDoc || !validateForm()) return;
    setSaving(true);
    try {
      // Gera o PDF preenchido
      if (selectedDoc.template_pdf_url) {
        const response = await fetch(selectedDoc.template_pdf_url);
        const pdfBytes = await response.arrayBuffer();

        const dadosStr: Record<string, string> = {};
        for (const [key, value] of Object.entries(formData)) {
          dadosStr[key] = String(value || '');
        }

        const pdfBlob = await preencherPdf(pdfBytes, dadosStr);
        const nomeArquivo = `${selectedDoc.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

        // Upload do PDF preenchido
        const path = `filled/${selectedDoc.id}/${nomeArquivo}`;
        const filledUrl = await uploadPDF(new File([pdfBlob], nomeArquivo, { type: 'application/pdf' }), path);

        // Salva o preenchimento
        const fill = await criarPreenchimento({
          document_id: selectedDoc.id,
          filled_by: user?.username || null,
          filled_data: formData,
          status: 'pending',
          autentique_document_id: null,
          autentique_link: filledUrl,
        });
        setPreenchimentos(prev => [fill, ...prev]);

        alert('PDF gerado e enviado! Link: ' + filledUrl);
        setView('preview');
      } else {
        alert('Este documento não tem template PDF vinculado.');
      }
    } catch (err) {
      console.error('Erro ao enviar:', err);
      alert('Erro ao enviar documento');
    } finally {
      setSaving(false);
    }
  }

  // ADMIN: Criar novo documento
  async function handleCreateDocument() {
    if (!newDocName.trim()) {
      alert('Digite o nome do documento');
      return;
    }
    setSaving(true);
    try {
      const doc = await criarDocumento({
        name: newDocName,
        description: newDocDesc || null,
        category: newDocCategory,
        template_pdf_url: null,
        active: true,
      });
      setDocumentos(prev => [...prev, doc]);
      setNewDocName('');
      setNewDocDesc('');
      alert('Documento criado! Agora faça upload do PDF.');
    } catch (err) {
      console.error('Erro ao criar:', err);
      alert('Erro ao criar documento');
    } finally {
      setSaving(false);
    }
  }

  // ADMIN: Upload de PDF e detecção automática de campos
  async function handleUploadPdf(docId: string, file: File) {
    setSaving(true);
    setScanningFields(true);
    try {
      const path = `templates/${docId}/${file.name}`;
      const url = await uploadPDF(file, path);

      // Detecta campos do PDF
      let camposDetectados: string[] = [];
      try {
        camposDetectados = await lerCamposPdfDeUrl(url);
      } catch (err) {
        console.warn('Não foi possível detectar campos do PDF:', err);
      }

      // Atualiza o documento com a URL do PDF
      await atualizarDocumento(docId, { template_pdf_url: url });
      setDocumentos(prev =>
        prev.map(d => d.id === docId ? { ...d, template_pdf_url: url } : d)
      );

      // Se detectou campos, cria automaticamente
      if (camposDetectados.length > 0) {
        // Cria campos no banco
        for (const fieldName of camposDetectados) {
          await criarCampo({
            document_id: docId,
            field_name: fieldName,
            field_label: fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            field_type: 'text',
            required: true,
            placeholder: null,
            options: null,
            order_index: 0,
          });
        }

        // Atualiza o documento selecionado
        const fullDoc = await buscarDocumento(docId);
        setSelectedDoc(fullDoc);

        alert(`${camposDetectados.length} campo(s) detectado(s) e criado(s) automaticamente!`);
      } else {
        alert('PDF enviado! Adicione os campos manualmente.');
      }
    } catch (err) {
      console.error('Erro ao upload:', err);
      alert('Erro ao fazer upload do PDF');
    } finally {
      setSaving(false);
      setScanningFields(false);
    }
  }

  // ADMIN: Excluir campo
  async function handleDeleteField(fieldId: string) {
    if (!confirm('Excluir este campo?')) return;
    if (!selectedDoc) return;
    try {
      await excluirCampo(fieldId);
      const fullDoc = await buscarDocumento(selectedDoc.id);
      setSelectedDoc(fullDoc);
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  }

  function renderField(field: DocumentField) {
    const value = formData[field.field_name] || '';

    switch (field.field_type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2.5 text-sm text-graphite-900 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100"
          >
            <option value="">{field.placeholder || 'Selecione...'}</option>
            {field.options?.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
            placeholder={field.placeholder || ''}
            rows={3}
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2.5 text-sm text-graphite-900 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100"
          />
        );
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2.5 text-sm text-graphite-900 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100"
          />
        );
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
            placeholder={field.placeholder || ''}
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2.5 text-sm text-graphite-900 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100"
          />
        );
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
            placeholder={field.placeholder || ''}
            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2.5 text-sm text-graphite-900 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100"
          />
        );
    }
  }

  // ═══ VIEW: LISTA DE DOCUMENTOS ═══
  if (view === 'list') {
    return (
      <PageContainer>
        <div className="flex items-center justify-between">
          <PageTitle icon={FileText} title="Documentos" />
          {isAdmin && (
            <button
              onClick={() => setView('admin')}
              className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white hover:bg-aviation-700"
            >
              <Plus className="h-4 w-4" />
              Novo Documento
            </button>
          )}
        </div>

        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
            <input
              type="text"
              placeholder="Buscar documentos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-graphite-200 bg-white py-2.5 pl-10 pr-4 text-sm dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-aviation-500" />
          </div>
        ) : documentos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-graphite-300 bg-graphite-50 py-12 text-center dark:border-graphite-700 dark:bg-graphite-800/50">
            <FileText className="mx-auto mb-3 h-12 w-12 text-graphite-300" />
            <p className="text-graphite-500">Nenhum documento encontrado</p>
            {isAdmin && (
              <p className="mt-2 text-sm text-graphite-400">
                Clique em "Novo Documento" para começar
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documentos
              .filter(d => d.name.toLowerCase().includes(search.toLowerCase()))
              .map(doc => (
                <button
                  key={doc.id}
                  onClick={() => selectDocument(doc)}
                  className="group rounded-xl border border-graphite-200 bg-white p-5 text-left transition-all hover:border-aviation-300 hover:shadow-md dark:border-graphite-700 dark:bg-graphite-800 dark:hover:border-aviation-600"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="rounded-lg bg-aviation-50 p-2 dark:bg-aviation-900/30">
                      <FileText className="h-5 w-5 text-aviation-600 dark:text-aviation-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-graphite-900 dark:text-graphite-100">{doc.name}</h3>
                      <span className="text-xs text-graphite-500">{doc.category}</span>
                    </div>
                    {doc.template_pdf_url && (
                      <span title="PDF vinculado">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      </span>
                    )}
                  </div>
                  {doc.description && (
                    <p className="text-sm text-graphite-600 dark:text-graphite-400">{doc.description}</p>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-aviation-600 group-hover:text-aviation-700 dark:text-aviation-400">
                      Clique para preencher →
                    </span>
                    {!doc.template_pdf_url && (
                      <span className="text-xs text-yellow-600">Sem PDF</span>
                    )}
                  </div>
                </button>
              ))}
          </div>
        )}
      </PageContainer>
    );
  }

  // ═══ VIEW: ADMIN - GERENCIAR DOCUMENTO ═══
  if (view === 'admin') {
    return (
      <PageContainer>
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => { setView('list'); setSelectedDoc(null); }}
            className="rounded-lg border border-graphite-200 px-3 py-1.5 text-sm hover:bg-graphite-50 dark:border-graphite-700 dark:hover:bg-graphite-800"
          >
            ← Voltar
          </button>
          <PageTitle icon={Edit3} title="Gerenciar Documentos" />
        </div>

        <div className="mx-auto max-w-2xl space-y-6">
          {/* CRIAR NOVO DOCUMENTO */}
          <div className="rounded-xl border border-graphite-200 bg-white p-6 shadow-sm dark:border-graphite-700 dark:bg-graphite-800">
            <h3 className="mb-4 text-lg font-semibold text-graphite-900 dark:text-graphite-100">
              Criar Novo Documento
            </h3>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
                  Nome do Documento *
                </label>
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Ex: Troca de Serviço"
                  className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2.5 text-sm dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
                  Descrição
                </label>
                <input
                  type="text"
                  value={newDocDesc}
                  onChange={(e) => setNewDocDesc(e.target.value)}
                  placeholder="Descrição do documento"
                  className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2.5 text-sm dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
                  Categoria
                </label>
                <select
                  value={newDocCategory}
                  onChange={(e) => setNewDocCategory(e.target.value)}
                  className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2.5 text-sm dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100"
                >
                  <option value="operacional">Operacional</option>
                  <option value="administrativo">Administrativo</option>
                  <option value="treinamento">Treinamento</option>
                  <option value="geral">Geral</option>
                </select>
              </div>

              <button
                onClick={handleCreateDocument}
                disabled={saving || !newDocName.trim()}
                className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-aviation-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Criar Documento
              </button>
            </div>
          </div>

          {/* LISTA DE DOCUMENTOS EXISTENTES */}
          <div className="rounded-xl border border-graphite-200 bg-white p-6 shadow-sm dark:border-graphite-700 dark:bg-graphite-800">
            <h3 className="mb-4 text-lg font-semibold text-graphite-900 dark:text-graphite-100">
              Documentos Existentes ({documentos.length})
            </h3>

            <div className="space-y-3">
              {documentos.map(doc => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-lg border border-graphite-100 p-4 dark:border-graphite-700"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-graphite-400" />
                    <div>
                      <p className="font-medium text-graphite-900 dark:text-graphite-100">{doc.name}</p>
                      <p className="text-xs text-graphite-500">{doc.category}</p>
                    </div>
                    {doc.template_pdf_url ? (
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="h-3 w-3" /> PDF
                      </span>
                    ) : (
                      <span className="text-xs text-yellow-600">Sem PDF</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadPdf(doc.id, file);
                        }}
                      />
                      <span className="flex items-center gap-1 rounded-lg border border-graphite-200 px-3 py-1.5 text-xs font-medium text-graphite-600 hover:bg-graphite-50 dark:border-graphite-700 dark:hover:bg-graphite-800">
                        {scanningFields ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Upload className="h-3 w-3" />
                        )}
                        {doc.template_pdf_url ? 'Trocar PDF' : 'Upload PDF'}
                      </span>
                    </label>
                    <button
                      onClick={() => selectDocument(doc)}
                      className="flex items-center gap-1 rounded-lg border border-graphite-200 px-3 py-1.5 text-xs font-medium text-graphite-600 hover:bg-graphite-50 dark:border-graphite-700 dark:hover:bg-graphite-800"
                    >
                      <Edit3 className="h-3 w-3" /> Campos
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INSTRUÇÕES */}
          <div className="rounded-xl border border-dashed border-aviation-300 bg-aviation-50/50 p-6 dark:border-aviation-700 dark:bg-aviation-900/20">
            <h4 className="mb-2 text-sm font-semibold text-graphite-900 dark:text-graphite-100">
              Como funciona:
            </h4>
            <ol className="space-y-2 text-sm text-graphite-600 dark:text-graphite-400">
              <li>1. Crie o documento com nome e descrição</li>
              <li>2. Faça upload do PDF (com campos de formulário AcroForm)</li>
              <li>3. O sistema detecta os campos automaticamente</li>
              <li>4. Ajuste os campos se necessário (label, tipo, obrigatório)</li>
              <li>5. Pronto! Os usuários preenchem e o PDF é gerado</li>
            </ol>
          </div>
        </div>
      </PageContainer>
    );
  }

  // ═══ VIEW: FORMULÁRIO DE PREENCHIMENTO ═══
  if (view === 'fill' && selectedDoc) {
    return (
      <PageContainer>
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => { setView('list'); setSelectedDoc(null); }}
            className="rounded-lg border border-graphite-200 px-3 py-1.5 text-sm hover:bg-graphite-50 dark:border-graphite-700 dark:hover:bg-graphite-800"
          >
            ← Voltar
          </button>
          <PageTitle icon={FileText} title={selectedDoc.name} />
        </div>

        {selectedDoc.description && (
          <p className="mb-6 text-sm text-graphite-600 dark:text-graphite-400">{selectedDoc.description}</p>
        )}

        <div className="mx-auto max-w-2xl space-y-4">
          {/* FORMULÁRIO */}
          <div className="rounded-xl border border-graphite-200 bg-white p-6 shadow-sm dark:border-graphite-700 dark:bg-graphite-800">
            <h3 className="mb-4 text-lg font-semibold text-graphite-900 dark:text-graphite-100">
              Preencher Documento
            </h3>

            {selectedDoc.document_fields.length === 0 ? (
              <p className="text-sm text-graphite-500">
                Nenhum campo configurado.
                {isAdmin && ' Faça upload do PDF no painel administrativo para detectar campos automaticamente.'}
              </p>
            ) : (
              <div className="space-y-4">
                {selectedDoc.document_fields
                  .sort((a, b) => a.order_index - b.order_index)
                  .map(field => (
                    <div key={field.id} className="flex items-start gap-2">
                      <div className="flex-1">
                        <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
                          {field.field_label}
                          {field.required && <span className="ml-1 text-red-500">*</span>}
                        </label>
                        {renderField(field)}
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          className="mt-7 rounded p-1.5 text-graphite-400 hover:bg-red-50 hover:text-red-500"
                          title="Excluir campo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleSaveDraft}
                disabled={saving || selectedDoc.document_fields.length === 0}
                className="flex items-center gap-2 rounded-lg border border-graphite-200 px-4 py-2.5 text-sm font-medium hover:bg-graphite-50 disabled:opacity-50 dark:border-graphite-700 dark:hover:bg-graphite-800"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                Salvar Rascunho
              </button>
              <button
                onClick={handleGerarPdf}
                disabled={saving || !selectedDoc.template_pdf_url}
                className="flex items-center gap-2 rounded-lg border border-graphite-200 px-4 py-2.5 text-sm font-medium hover:bg-graphite-50 disabled:opacity-50 dark:border-graphite-700 dark:hover:bg-graphite-800"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Gerar PDF Preenchido
              </button>
              <button
                onClick={handleSendToAutentique}
                disabled={saving || !selectedDoc.template_pdf_url || selectedDoc.document_fields.length === 0}
                className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-aviation-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Enviar para Assinatura
              </button>
            </div>
          </div>

          {/* LINK DO PDF */}
          {selectedDoc.template_pdf_url && (
            <div className="rounded-xl border border-graphite-200 bg-white p-4 dark:border-graphite-700 dark:bg-graphite-800">
              <h4 className="mb-2 text-sm font-semibold text-graphite-900 dark:text-graphite-100">
                Template PDF
              </h4>
              <a
                href={selectedDoc.template_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-aviation-600 hover:text-aviation-700"
              >
                <FileText className="h-4 w-4" />
                Abrir PDF do template
              </a>
            </div>
          )}

          {/* SIGNATÁRIOS */}
          {selectedDoc.document_signers.length > 0 && (
            <div className="rounded-xl border border-graphite-200 bg-white p-4 dark:border-graphite-700 dark:bg-graphite-800">
              <h4 className="mb-3 text-sm font-semibold text-graphite-900 dark:text-graphite-100">
                Signatários necessários
              </h4>
              <div className="space-y-2">
                {selectedDoc.document_signers
                  .sort((a, b) => a.order_index - b.order_index)
                  .map(signer => (
                    <div
                      key={signer.id}
                      className="flex items-center gap-2 text-sm text-graphite-600 dark:text-graphite-400"
                    >
                      <span className="font-medium text-graphite-900 dark:text-graphite-100">
                        {signer.order_index}º
                      </span>
                      {signer.signer_name}
                      <span className="text-xs text-graphite-400">({signer.signer_role})</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* HISTÓRICO */}
          {preenchimentos.length > 0 && (
            <div className="rounded-xl border border-graphite-200 bg-white p-4 dark:border-graphite-700 dark:bg-graphite-800">
              <h4 className="mb-3 text-sm font-semibold text-graphite-900 dark:text-graphite-100">
                Histórico de Preenchimentos
              </h4>
              <div className="space-y-2">
                {preenchimentos.map(fill => (
                  <div
                    key={fill.id}
                    className="rounded-lg border border-graphite-100 p-3 dark:border-graphite-700"
                  >
                    <button
                      onClick={() => setExpandedFill(expandedFill === fill.id ? null : fill.id)}
                      className="flex w-full items-center justify-between"
                    >
                      <span className="text-sm text-graphite-900 dark:text-graphite-100">
                        {new Date(fill.created_at).toLocaleDateString('pt-BR')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          fill.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          fill.status === 'pending' ? 'bg-blue-100 text-blue-700' :
                          fill.status === 'signed' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {fill.status === 'draft' ? 'Rascunho' :
                           fill.status === 'pending' ? 'Pendente' :
                           fill.status === 'signed' ? 'Assinado' : 'Cancelado'}
                        </span>
                        {expandedFill === fill.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>
                    {expandedFill === fill.id && (
                      <div className="mt-3 border-t border-graphite-100 pt-3 dark:border-graphite-700">
                        <pre className="text-xs text-graphite-600 dark:text-graphite-400 whitespace-pre-wrap">
                          {JSON.stringify(fill.filled_data, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    );
  }

  // ═══ VIEW: PRÉ-VISUALIZAÇÃO ═══
  if (view === 'preview' && selectedDoc) {
    return (
      <PageContainer>
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setView('fill')}
            className="rounded-lg border border-graphite-200 px-3 py-1.5 text-sm hover:bg-graphite-50 dark:border-graphite-700 dark:hover:bg-graphite-800"
          >
            ← Voltar ao Formulário
          </button>
          <PageTitle icon={Eye} title="Pré-visualização" />
        </div>

        <div className="mx-auto max-w-2xl">
          <div className="rounded-xl border border-graphite-200 bg-white p-8 shadow-sm dark:border-graphite-700 dark:bg-graphite-800">
            <div className="mb-6 text-center">
              <h2 className="text-xl font-bold text-graphite-900 dark:text-graphite-100">
                {selectedDoc.name}
              </h2>
              <p className="text-sm text-graphite-500">Documento preenchido</p>
            </div>

            <div className="space-y-3">
              {selectedDoc.document_fields
                .sort((a, b) => a.order_index - b.order_index)
                .map(field => (
                  <div key={field.id} className="flex justify-between border-b border-graphite-100 pb-2 dark:border-graphite-700">
                    <span className="text-sm text-graphite-600 dark:text-graphite-400">{field.field_label}:</span>
                    <span className="text-sm font-medium text-graphite-900 dark:text-graphite-100">
                      {formData[field.field_name] || '—'}
                    </span>
                  </div>
                ))}
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={handleGerarPdf}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-graphite-200 px-4 py-2.5 text-sm font-medium hover:bg-graphite-50 dark:border-graphite-700 dark:hover:bg-graphite-800"
              >
                <Download className="h-4 w-4" />
                Baixar PDF Preenchido
              </button>
            </div>
          </div>
        </div>
      </PageContainer>
    );
  }

  return null;
}
