import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FileText, Plus, Search, Eye, Loader2,
  ChevronDown, ChevronUp, Edit3, CheckCircle,
  Trash2, Download, Upload, Shield, Save, ArrowLeft,
  AlertTriangle, Package,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { PdfFieldEditor } from '../../components/documentos/PdfFieldEditor';
import { PdfPreview } from '../../components/documentos/PdfPreview';
import { FieldPropertiesPanel } from '../../components/documentos/FieldPropertiesPanel';
import { Autocomplete } from '../../components/documentos/Autocomplete';
import {
  listarDocumentos, buscarDocumento, criarDocumento, atualizarDocumento,
  excluirDocumento, criarCampo, criarCamposEmLote, atualizarCampo, excluirCampo,
  criarSignatario, excluirSignatario,
  criarPreenchimento, listarPreenchimentos,
  uploadPDF, getPdfBlob,
} from '../../services/documentoService';
import { preencherPdf, downloadPdf } from '../../services/pdfService';
import type { Document, DocumentWithFields, DocumentField, DocumentFill } from '../../types/document';
import { useAuth } from '../../context/AuthContext';
import { listarBombeiros } from '../../services/bombeiroService';
import { listarAPOCs } from '../../services/apocService';
import { findTemplate } from '../../data/documentTemplates';

type View = 'list' | 'admin' | 'manage' | 'fill';

export function Documentos() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin';

  const [documentos, setDocumentos] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentWithFields | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('list');
  const [expandedFill, setExpandedFill] = useState<string | null>(null);
  const [fills, setFills] = useState<DocumentFill[]>([]);

  // Admin
  const [newDocName, setNewDocName] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [newDocCategory, setNewDocCategory] = useState('operacional');

  // Editor
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [signerName, setSignerName] = useState('');
  const [signerRole, setSignerRole] = useState('');
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'props' | 'signers' | 'tray'>('props');

  // Confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPdfFile, setPendingPdfFile] = useState<File | null>(null);

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<DocumentWithFields | null>(null);
  const [previewPdfData, setPreviewPdfData] = useState<ArrayBuffer | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => { loadDocumentos(); }, []);

  async function loadDocumentos() {
    try {
      setDocumentos(await listarDocumentos());
    } catch (err: any) {
      alert('Erro inesperado ao carregar documentos. Contate o administrador.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // ═══ DOCUMENTO ═══
  async function selectDocument(doc: Document) {
    try {
      const full = await buscarDocumento(doc.id);
      setSelectedDoc(full);
      setFormData({});
      await loadPdfData(full);
      const docFills = await listarPreenchimentos(doc.id);
      setFills(docFills);
      setView('fill');
    } catch {
      alert('Erro inesperado ao abrir documento. Contate o administrador.');
    }
  }

  async function openManage(doc: Document) {
    try {
      const full = await buscarDocumento(doc.id);
      setSelectedDoc(full);
      setSelectedFieldId(null);
      await loadPdfData(full);
      setView('manage');
    } catch {
      alert('Erro inesperado ao abrir configuracao. Contate o administrador.');
    }
  }

  async function openPreview(doc: Document) {
    try {
      const full = await buscarDocumento(doc.id);
      if (!full) return;
      setPreviewDoc(full);
      setPreviewLoading(true);
      if (full.template_pdf_url) {
        const blob = await getPdfBlob(full.template_pdf_url);
        if (blob) {
          const buf = await blob.arrayBuffer();
          setPreviewPdfData(buf);
        } else {
          setPreviewPdfData(null);
        }
      } else {
        setPreviewPdfData(null);
      }
    } catch {
      alert('Erro inesperado ao carregar preview. Contate o administrador.');
      setPreviewPdfData(null);
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreviewDoc(null);
    setPreviewPdfData(null);
  }

  function getAllFuncionarios() {
    const bombeiros = listarBombeiros();
    const apocs = listarAPOCs();
    return [
      ...bombeiros.map(b => ({ label: b.nomeCompleto, sublabel: `${b.cargo} - ${b.email}` })),
      ...apocs.map(a => ({ label: a.nomeCompleto, sublabel: `APOC - ${a.email}` })),
    ];
  }

  async function loadPdfData(doc: DocumentWithFields | null) {
    if (doc?.template_pdf_url) {
      try {
        const blob = await getPdfBlob(doc.template_pdf_url);
        if (blob) {
          const buf = await blob.arrayBuffer();
          setPdfData(buf);
          return;
        }
      } catch { /* ignore */ }
    }
    setPdfData(null);
  }

  async function handleCreateDocument() {
    if (!newDocName.trim()) return;
    try {
      const doc = await criarDocumento({
        name: newDocName, description: newDocDesc || null,
        category: newDocCategory, template_pdf_url: null, active: true,
        template_pdf_pages: 0, template_pdf_width: 0, template_pdf_height: 0,
      });

      const template = findTemplate(newDocName);
      if (template) {
        const fieldsToCreate = template.fields.map((tf, i) => ({
          document_id: doc.id,
          field_name: tf.field_name,
          field_label: tf.field_label,
          field_type: tf.field_type,
          required: tf.required,
          placeholder: tf.placeholder,
          options: tf.options,
          order_index: i,
          page: 1,
          x: 0,
          y: 0,
          width: tf.width,
          height: tf.height,
          font_size: tf.font_size,
          data_source: tf.data_source,
          is_signature: tf.is_signature,
          signer_role: tf.signer_role,
          read_only: tf.read_only,
          conditional_on: tf.conditional_on,
        }));
        await criarCamposEmLote(doc.id, fieldsToCreate);

        for (const ts of template.signers) {
          await criarSignatario({
            document_id: doc.id,
            signer_name: ts.signer_name,
            signer_role: ts.signer_role,
            order_index: ts.order_index,
            required: true,
          });
        }
      }

      setDocumentos(await listarDocumentos());
      setNewDocName(''); setNewDocDesc('');
      await openManage(doc);
    } catch {
      alert('Erro inesperado ao criar documento. Contate o administrador.');
    }
  }

  async function handleDeleteDocument(id: string) {
    if (!confirm('Excluir este documento e todos os campos/signatarios?')) return;
    try {
      await excluirDocumento(id);
      setDocumentos(await listarDocumentos());
    } catch {
      alert('Erro inesperado ao excluir documento. Contate o administrador.');
    }
  }

  // ═══ UPLOAD PDF ═══
  async function handleUploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedDoc) return;

    if (pdfData) {
      setPendingPdfFile(file);
      setShowConfirmModal(true);
    } else {
      await doUploadPdf(file);
    }
    if (e.target) e.target.value = '';
  }

  async function doUploadPdf(file: File) {
    if (!selectedDoc) return;

    if (file.size > 4 * 1024 * 1024) {
      alert('O arquivo e muito grande. O limite e de 4MB. Tente comprimir o PDF.');
      return;
    }

    setSaving(true);
    try {
      const key = await uploadPDF(selectedDoc.id, file);
      await atualizarDocumento(selectedDoc.id, { template_pdf_url: key });

      const existingFields = selectedDoc.document_fields;
      if (existingFields.length > 0) {
        await Promise.all(existingFields.map(f => atualizarCampo(f.id, { x: 0, y: 0 })));
      }

      const full = await buscarDocumento(selectedDoc.id);
      if (full) {
        setSelectedDoc(full);
        await loadPdfData(full);
      }
      setDocumentos(await listarDocumentos());
      setActiveTab('tray');
    } catch (err) {
      console.error('Erro no upload:', err);
      alert('Erro inesperado ao fazer upload do PDF. Contate o administrador.');
    } finally {
      setSaving(false);
    }
  }

  function handleConfirmPdfSwap() {
    if (pendingPdfFile) {
      doUploadPdf(pendingPdfFile);
    }
    setPendingPdfFile(null);
    setShowConfirmModal(false);
  }

  function handleCancelPdfSwap() {
    setPendingPdfFile(null);
    setShowConfirmModal(false);
  }

  // ═══ CAMPOS ═══
  const handleFieldUpdate = useCallback((id: string, updates: Partial<DocumentField>) => {
    atualizarCampo(id, updates).catch(() => {});
    setSelectedDoc(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        document_fields: prev.document_fields.map(f => f.id === id ? { ...f, ...updates } : f),
      };
    });
  }, []);

  const handleFieldAdd = useCallback((data: Omit<DocumentField, 'id' | 'created_at'>) => {
    criarCampo(data).then(field => {
      setSelectedDoc(prev => {
        if (!prev) return prev;
        return { ...prev, document_fields: [...prev.document_fields, field] };
      });
      setSelectedFieldId(field.id);
    }).catch(() => {});
  }, []);

  async function handleFieldDelete(id: string) {
    if (!confirm('Excluir este campo?')) return;
    try {
      await excluirCampo(id);
      setSelectedDoc(prev => {
        if (!prev) return prev;
        return { ...prev, document_fields: prev.document_fields.filter(f => f.id !== id) };
      });
      if (selectedFieldId === id) setSelectedFieldId(null);
    } catch {
      alert('Erro inesperado ao excluir campo. Contate o administrador.');
    }
  }

  async function handlePositionField(fieldId: string, page: number) {
    const pageFields = selectedDoc?.document_fields.filter(f => f.page === page && (f.x !== 0 || f.y !== 0)) || [];
    const maxX = pageFields.reduce((max, f) => Math.max(max, f.x + f.width), 50);
    const newY = 50 + (pageFields.length % 5) * 40;

    try {
      await atualizarCampo(fieldId, { x: maxX + 20, y: newY, page });
      setSelectedDoc(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          document_fields: prev.document_fields.map(f =>
            f.id === fieldId ? { ...f, x: maxX + 20, y: newY, page } : f
          ),
        };
      });
      setSelectedFieldId(fieldId);
      setActiveTab('props');
    } catch {
      alert('Erro inesperado ao posicionar campo. Contate o administrador.');
    }
  }

  // ═══ SIGNATÁRIOS ═══
  async function handleAddSigner() {
    if (!selectedDoc || !signerName.trim() || !signerRole.trim()) {
      alert('Preencha nome e funcao do signatario');
      return;
    }
    try {
      await criarSignatario({
        document_id: selectedDoc.id,
        signer_name: signerName,
        signer_role: signerRole,
        order_index: selectedDoc.document_signers.length + 1,
        required: true,
      });
      const full = await buscarDocumento(selectedDoc.id);
      setSelectedDoc(full);
      setSignerName('');
      setSignerRole('');
    } catch {
      alert('Erro inesperado ao adicionar signatario. Contate o administrador.');
    }
  }

  async function handleDeleteSigner(id: string) {
    if (!confirm('Remover signatario?') || !selectedDoc) return;
    try {
      await excluirSignatario(id);
      setSelectedDoc({ ...selectedDoc, document_signers: selectedDoc.document_signers.filter(s => s.id !== id) });
    } catch {
      alert('Erro inesperado ao remover signatario. Contate o administrador.');
    }
  }

  // ═══ PREENCHIMENTO ═══
  function handleFieldChange(fieldName: string, value: string) {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  }

  function validateForm(): boolean {
    if (!selectedDoc) return false;
    for (const field of selectedDoc.document_fields.filter(f => !f.is_signature && !f.read_only)) {
      if (field.conditional_on) {
        const [depFieldName, depValue] = field.conditional_on.split('=');
        const depData = formData[depFieldName] || '';
        if (depData !== depValue) continue;
      }
      if (field.required && !formData[field.field_name]) {
        alert(`Preencha o campo: ${field.field_label}`);
        return false;
      }
    }
    return true;
  }

  async function handleGerarPdf() {
    if (!selectedDoc || !validateForm()) return;
    setSaving(true);
    try {
      const pdfKey = selectedDoc.template_pdf_url;
      if (!pdfKey) { alert('PDF nao vinculado.'); return; }
      const blob = await getPdfBlob(pdfKey);
      if (!blob) { alert('PDF nao encontrado.'); return; }
      const pdfBytes = await blob.arrayBuffer();
      const dadosStr: Record<string, string> = {};
      for (const [k, v] of Object.entries(formData)) dadosStr[k] = String(v || '');
      const pdfBlob = await preencherPdf(pdfBytes, dadosStr);
      const nome = `${selectedDoc.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadPdf(pdfBlob, nome);
    } catch {
      alert('Erro inesperado ao gerar PDF. Contate o administrador.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDraft() {
    if (!selectedDoc) return;
    try {
      await criarPreenchimento({
        document_id: selectedDoc.id, filled_by: user?.username || null,
        filled_data: formData, status: 'draft',
        autentique_document_id: null, autentique_link: null,
      });
      alert('Rascunho salvo!');
    } catch {
      alert('Erro inesperado ao salvar rascunho. Contate o administrador.');
    }
  }

  function renderFormField(field: DocumentField) {
    const value = formData[field.field_name] || '';
    const base = 'w-full rounded-lg border border-graphite-200 bg-white px-3 py-2.5 text-sm text-graphite-900 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100';
    const readonlyBase = 'w-full rounded-lg border border-graphite-200 bg-graphite-50 px-3 py-2.5 text-sm text-graphite-500 dark:border-graphite-700 dark:bg-graphite-900 dark:text-graphite-400 cursor-not-allowed';
    const funcionarios = getAllFuncionarios();

    if (field.conditional_on) {
      const [depFieldName, depValue] = field.conditional_on.split('=');
      const depData = formData[depFieldName] || '';
      if (depData !== depValue) return null;
    }

    if (field.read_only) {
      return <input type="text" value={value} readOnly className={readonlyBase} />;
    }

    switch (field.field_type) {
      case 'checkbox':
        return (
          <div className="flex gap-2">
            {field.options?.map(opt => (
              <label key={opt} className={`flex items-center gap-1 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                value === opt ? 'border-aviation-500 bg-aviation-50 dark:bg-aviation-900/30' : 'border-graphite-200 dark:border-graphite-700'
              }`}>
                <input
                  type="radio"
                  name={field.field_name}
                  value={opt}
                  checked={value === opt}
                  onChange={e => handleFieldChange(field.field_name, e.target.value)}
                  className="sr-only"
                />
                <span className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                  value === opt ? 'border-aviation-500 bg-aviation-500' : 'border-graphite-300 dark:border-graphite-600'
                }`}>
                  {value === opt && <span className="text-xs font-bold text-white">X</span>}
                </span>
                <span className="text-graphite-700 dark:text-graphite-300">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'select':
        return (
          <select value={value} onChange={e => handleFieldChange(field.field_name, e.target.value)} className={base}>
            <option value="">{field.placeholder || 'Selecione...'}</option>
            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'textarea':
        return <textarea value={value} onChange={e => handleFieldChange(field.field_name, e.target.value)} placeholder={field.placeholder || ''} rows={3} className={base} />;
      case 'date':
        return <input type="date" value={value} onChange={e => handleFieldChange(field.field_name, e.target.value)} className={base} />;
      case 'number':
        return <input type="number" value={value} onChange={e => handleFieldChange(field.field_name, e.target.value)} placeholder={field.placeholder || ''} className={base} />;
      case 'signature':
        return (
          <div className="flex items-center gap-2 rounded-lg border-2 border-dashed border-purple-300 bg-purple-50/50 px-3 py-6 text-center dark:border-purple-700 dark:bg-purple-900/20">
            <span className="mx-auto text-sm text-purple-500">✎ Campo de assinatura</span>
          </div>
        );
      case 'line':
        return <hr className="border-graphite-300" />;
      default:
        if (field.data_source && field.data_source !== 'manual') {
          return (
            <Autocomplete
              value={value}
              onChange={val => handleFieldChange(field.field_name, val)}
              options={funcionarios}
              placeholder={field.placeholder || 'Digite para buscar...'}
              className={base}
            />
          );
        }
        return <input type="text" value={value} onChange={e => handleFieldChange(field.field_name, e.target.value)} placeholder={field.placeholder || ''} className={base} />;
    }
  }

  // ═══════════════════════════════
  // VIEW: LISTA
  // ═══════════════════════════════
  if (view === 'list') {
    return (
      <PageContainer>
        <div className="flex items-center justify-between">
          <PageTitle icon={FileText} title="Documentos" />
          {isAdmin && (
            <button onClick={() => setView('admin')} className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white hover:bg-aviation-700">
              <Plus className="h-4 w-4" /> Novo Documento
            </button>
          )}
        </div>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
            <input type="text" placeholder="Buscar documentos..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-graphite-200 bg-white py-2.5 pl-10 pr-4 text-sm dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100" />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-aviation-500" /></div>
        ) : documentos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-graphite-300 bg-graphite-50 py-12 text-center dark:border-graphite-700 dark:bg-graphite-800/50">
            <FileText className="mx-auto mb-3 h-12 w-12 text-graphite-300" />
            <p className="text-graphite-500">Nenhum documento</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documentos.filter(d => d.name.toLowerCase().includes(search.toLowerCase())).map(doc => (
              <div key={doc.id} className="group rounded-xl border border-graphite-200 bg-white p-5 transition-all hover:border-aviation-300 hover:shadow-md dark:border-graphite-700 dark:bg-graphite-800">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-aviation-50 p-2 dark:bg-aviation-900/30">
                    <FileText className="h-5 w-5 text-aviation-600 dark:text-aviation-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-graphite-900 dark:text-graphite-100">{doc.name}</h3>
                    <span className="text-xs text-graphite-500">{doc.category}</span>
                  </div>
                  {doc.template_pdf_url && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
                {doc.description && <p className="text-sm text-graphite-600 dark:text-graphite-400">{doc.description}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex gap-3">
                    <button onClick={() => selectDocument(doc)} className="text-xs text-aviation-600 hover:text-aviation-700">Preencher</button>
                    {doc.template_pdf_url && (
                      <button onClick={() => openPreview(doc)} className="flex items-center gap-1 text-xs text-graphite-500 hover:text-graphite-700">
                        <Eye className="h-3 w-3" /> Preview
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => openManage(doc)} className="flex items-center gap-1 text-xs text-graphite-500 hover:text-graphite-700">
                        <Edit3 className="h-3 w-3" /> Editar
                      </button>
                    )}
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDeleteDocument(doc.id)} className="text-graphite-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </PageContainer>
    );
  }

  // ═══════════════════════════════
  // VIEW: CRIAR NOVO
  // ═══════════════════════════════
  if (view === 'admin') {
    return (
      <PageContainer>
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => setView('list')} className="rounded-lg border border-graphite-200 px-3 py-1.5 text-sm hover:bg-graphite-50 dark:border-graphite-700"><ArrowLeft className="inline h-4 w-4 mr-1" />Voltar</button>
          <PageTitle icon={Plus} title="Novo Documento" />
        </div>
        <div className="mx-auto max-w-xl rounded-xl border border-graphite-200 bg-white p-6 shadow-sm dark:border-graphite-700 dark:bg-graphite-800">
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Nome do Documento *</label>
              <input type="text" value={newDocName} onChange={e => setNewDocName(e.target.value)} placeholder="Ex: Formulário de Troca de Serviço"
                className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2.5 text-sm dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Descrição</label>
              <input type="text" value={newDocDesc} onChange={e => setNewDocDesc(e.target.value)} placeholder="Descrição"
                className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2.5 text-sm dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">Categoria</label>
              <select value={newDocCategory} onChange={e => setNewDocCategory(e.target.value)}
                className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2.5 text-sm dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-100">
                <option value="operacional">Operacional</option>
                <option value="administrativo">Administrativo</option>
                <option value="treinamento">Treinamento</option>
                <option value="geral">Geral</option>
              </select>
            </div>
            <button onClick={handleCreateDocument} disabled={!newDocName.trim()}
              className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-aviation-700 disabled:opacity-50">
              <Plus className="h-4 w-4" /> Criar e Configurar
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  // ═══════════════════════════════
  // VIEW: EDITOR VISUAL (MANAGE)
  // ═══════════════════════════════
  if (view === 'manage' && selectedDoc) {
    const allFields = [...selectedDoc.document_fields].sort((a, b) => a.order_index - b.order_index);
    const positionedFields = allFields.filter(f => f.x !== 0 || f.y !== 0);
    const trayFields = allFields.filter(f => f.x === 0 && f.y === 0);
    const signers = [...selectedDoc.document_signers].sort((a, b) => a.order_index - b.order_index);
    const selectedField = allFields.find(f => f.id === selectedFieldId) || null;
    const bombeiros = listarBombeiros();
    const apocs = listarAPOCs();
    const allFuncionarios = [
      ...bombeiros.map(b => ({ nome: b.nomeCompleto, funcao: b.cargo, email: b.email })),
      ...apocs.map(a => ({ nome: a.nomeCompleto, funcao: 'APOC', email: a.email })),
    ];

    return (
      <>
        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-2xl dark:bg-graphite-800">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/30">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-graphite-900 dark:text-graphite-100">
                  Trocar PDF Template
                </h3>
              </div>
              <p className="mb-2 text-sm text-graphite-600 dark:text-graphite-400">
                Tem certeza que deseja trocar o PDF deste documento?
              </p>
              <p className="mb-6 text-sm text-graphite-600 dark:text-graphite-400">
                Os campos existentes <strong>não serão excluídos</strong>. Eles serão movidos para a aba
                <strong> Bandeja</strong> e você poderá redistribuí-los no novo PDF ou excluí-los.
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={handleCancelPdfSwap}
                  className="rounded-lg border border-graphite-200 px-4 py-2 text-sm font-medium hover:bg-graphite-50 dark:border-graphite-700">
                  Cancelar
                </button>
                <button onClick={handleConfirmPdfSwap}
                  className="rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white hover:bg-aviation-700">
                  Sim, Trocar PDF
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex h-[calc(100vh-4rem)] flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-3 border-b border-graphite-200 bg-white px-4 py-2 dark:border-graphite-700 dark:bg-graphite-800">
            <button onClick={() => { setView('list'); setSelectedDoc(null); setPdfData(null); }}
              className="rounded-lg border border-graphite-200 px-3 py-1.5 text-sm hover:bg-graphite-50 dark:border-graphite-700">
              <ArrowLeft className="inline h-4 w-4 mr-1" />Voltar
            </button>
            <PageTitle icon={Edit3} title={selectedDoc.name} />

            <div className="ml-auto flex items-center gap-2">
              <label className="cursor-pointer flex items-center gap-2 rounded-lg border border-graphite-200 px-3 py-1.5 text-xs hover:bg-graphite-50 dark:border-graphite-700">
                <Upload className="h-3 w-3" /> {pdfData ? 'Trocar PDF' : 'Upload PDF Template'}
                <input type="file" accept=".pdf" className="hidden" onChange={handleUploadPdf} ref={!pdfData ? pdfInputRef : undefined} />
              </label>
            </div>
          </div>

          {!pdfData ? (
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="rounded-xl border border-dashed border-graphite-300 bg-graphite-50 p-12 text-center dark:border-graphite-700 dark:bg-graphite-800/50">
                <Upload className="mx-auto mb-4 h-12 w-12 text-graphite-300" />
                <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Faça upload do PDF template</h3>
                <p className="mb-4 text-sm text-graphite-500">Faça upload do PDF do documento para posicionar os campos visualmente</p>
                {trayFields.length > 0 && (
                  <p className="mb-4 text-sm text-amber-600">
                    <Package className="mr-1 inline h-4 w-4" />
                    {trayFields.length} campo(s) na bandeja aguardando posicionamento
                  </p>
                )}
                <label className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-aviation-600 px-6 py-3 text-sm font-medium text-white hover:bg-aviation-700">
                  <Upload className="h-4 w-4" /> Selecionar PDF
                  <input type="file" accept=".pdf" className="hidden" onChange={handleUploadPdf} />
                </label>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* Editor area */}
              <div className="flex-1 overflow-auto bg-graphite-100 dark:bg-graphite-900">
                <PdfFieldEditor
                  pdfData={pdfData}
                  fields={positionedFields}
                  selectedFieldId={selectedFieldId}
                  onSelectField={setSelectedFieldId}
                  onUpdateField={handleFieldUpdate}
                  onAddField={handleFieldAdd}
                  documentId={selectedDoc.id}
                />
              </div>

              {/* Right panel */}
              <div className="w-80 border-l border-graphite-200 bg-white dark:border-graphite-700 dark:bg-graphite-800">
                <div className="flex h-full flex-col overflow-hidden">
                  {/* Tabs */}
                  <div className="flex border-b border-graphite-200 dark:border-graphite-700">
                    <button onClick={() => { setActiveTab('props'); setSelectedFieldId('_props_'); }}
                      className={`flex-1 px-3 py-2.5 text-xs font-medium ${activeTab === 'props' ? 'border-b-2 border-aviation-600 text-aviation-600' : 'text-graphite-500 hover:text-graphite-700'}`}>
                      Campo
                    </button>
                    <button onClick={() => { setActiveTab('signers'); setSelectedFieldId('_signers_'); }}
                      className={`flex-1 px-3 py-2.5 text-xs font-medium ${activeTab === 'signers' ? 'border-b-2 border-aviation-600 text-aviation-600' : 'text-graphite-500 hover:text-graphite-700'}`}>
                      Signatários ({signers.length})
                    </button>
                    <button onClick={() => { setActiveTab('tray'); setSelectedFieldId('_tray_'); }}
                      className={`flex-1 px-3 py-2.5 text-xs font-medium ${activeTab === 'tray' ? 'border-b-2 border-aviation-600 text-aviation-600' : 'text-graphite-500 hover:text-graphite-700'}`}>
                      Bandeja ({trayFields.length})
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                    {/* TAB: Propriedades do campo */}
                    {activeTab === 'props' && (
                      <FieldPropertiesPanel
                        field={selectedField}
                        onUpdate={handleFieldUpdate}
                        onDelete={handleFieldDelete}
                      />
                    )}

                    {/* TAB: Bandeja */}
                    {activeTab === 'tray' && (
                      <div className="space-y-3 p-4">
                        <h4 className="text-sm font-semibold text-graphite-900 dark:text-graphite-100">
                          <Package className="mr-1 inline h-4 w-4" /> Bandeja de Campos
                        </h4>
                        <p className="text-xs text-graphite-500">
                          Campos não posicionados no PDF. Clique em "Posicionar" para colocar no PDF.
                        </p>

                        {trayFields.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-graphite-200 p-6 text-center dark:border-graphite-700">
                            <p className="text-sm text-graphite-400">Nenhum campo na bandeja</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {trayFields.map(field => (
                              <div key={field.id}
                                className={`rounded-lg border px-3 py-2 ${
                                  field.is_signature
                                    ? 'border-purple-200 bg-purple-50/50 dark:border-purple-700 dark:bg-purple-900/20'
                                    : 'border-graphite-200 bg-graphite-50 dark:border-graphite-700 dark:bg-graphite-800'
                                }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex-1 min-w-0">
                                    <span className="block truncate text-sm font-medium text-graphite-900 dark:text-graphite-100">
                                      {field.is_signature ? '✎ ' : ''}{field.field_label}
                                    </span>
                                    <span className="block text-xs text-graphite-400">{field.field_name}</span>
                                  </div>
                                  <div className="ml-2 flex items-center gap-1">
                                    <button onClick={() => handlePositionField(field.id, field.page || 1)}
                                      className="rounded bg-aviation-100 px-2 py-1 text-xs font-medium text-aviation-700 hover:bg-aviation-200 dark:bg-aviation-900/30 dark:text-aviation-300">
                                      Posicionar
                                    </button>
                                    <button onClick={() => { setSelectedFieldId(field.id); setActiveTab('props'); }}
                                      className="rounded p-1 text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-graphite-700">
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => handleFieldDelete(field.id)}
                                      className="rounded p-1 text-graphite-400 hover:bg-red-50 hover:text-red-500">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TAB: Signatários */}
                    {activeTab === 'signers' && (
                      <div className="space-y-4 p-4">
                        <h4 className="text-sm font-semibold text-graphite-900 dark:text-graphite-100">
                          <Shield className="mr-1 inline h-4 w-4" /> Signatários ({signers.length})
                        </h4>

                        {signers.length > 0 && (
                          <div className="space-y-2">
                            {signers.map(s => (
                              <div key={s.id} className="flex items-center gap-2 rounded-lg border border-graphite-100 px-3 py-2 dark:border-graphite-700">
                                <span className="text-xs font-medium text-graphite-500">{s.order_index}º</span>
                                <div className="flex-1">
                                  <span className="text-sm text-graphite-900 dark:text-graphite-100">{s.signer_name}</span>
                                  <span className="block text-xs text-graphite-400">{s.signer_role}</span>
                                </div>
                                <button onClick={() => handleDeleteSigner(s.id)} className="text-graphite-400 hover:text-red-500">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="space-y-2">
                          <h5 className="text-xs font-medium text-graphite-600">Adicionar dos cadastrados:</h5>
                          <div className="max-h-40 space-y-1 overflow-y-auto">
                            {allFuncionarios.map((f, i) => (
                              <button key={i} onClick={() => { setSignerName(f.nome); setSignerRole(f.funcao); }}
                                className="w-full rounded border border-graphite-100 px-2 py-1.5 text-left text-xs hover:border-aviation-300 hover:bg-aviation-50/50 dark:border-graphite-700">
                                <span className="font-medium text-graphite-900 dark:text-graphite-100">{f.nome}</span>
                                <span className="ml-1 text-graphite-400">({f.funcao})</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2 border-t border-graphite-100 pt-3 dark:border-graphite-700">
                          <h5 className="text-xs font-medium text-graphite-600">Ou adicionar manualmente:</h5>
                          <input type="text" value={signerName} onChange={e => setSignerName(e.target.value)} placeholder="Nome"
                            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-800" />
                          <input type="text" value={signerRole} onChange={e => setSignerRole(e.target.value)} placeholder="Função (ex: chefe, gerente)"
                            className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2 text-sm dark:border-graphite-700 dark:bg-graphite-800" />
                          <button onClick={handleAddSigner} className="flex w-full items-center justify-center gap-1 rounded-lg bg-aviation-600 px-3 py-2 text-xs font-medium text-white hover:bg-aviation-700">
                            <Plus className="h-3 w-3" /> Adicionar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </>
    );
  }

  // ═══════════════════════════════
  // VIEW: PREENCHIMENTO
  // ═══════════════════════════════
  if (view === 'fill' && selectedDoc) {
    const fields = [...selectedDoc.document_fields].sort((a, b) => a.order_index - b.order_index);
    const signers = [...selectedDoc.document_signers].sort((a, b) => a.order_index - b.order_index);
    const manualFields = fields.filter(f => !f.is_signature && f.field_type !== 'line');
    const signatureFields = fields.filter(f => f.is_signature);

    return (
      <PageContainer>
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => { setView('list'); setSelectedDoc(null); setPdfData(null); }}
            className="rounded-lg border border-graphite-200 px-3 py-1.5 text-sm hover:bg-graphite-50 dark:border-graphite-700">
            <ArrowLeft className="inline h-4 w-4 mr-1" />Voltar
          </button>
          <PageTitle icon={FileText} title={selectedDoc.name} />
        </div>
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="rounded-xl border border-graphite-200 bg-white p-6 shadow-sm dark:border-graphite-700 dark:bg-graphite-800">
            <h3 className="mb-4 text-lg font-semibold text-graphite-900 dark:text-graphite-100">Preencher Documento</h3>

            {manualFields.length > 0 && (
              <div className="space-y-4">
                {manualFields.map(field => (
                  <div key={field.id}>
                    <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
                      {field.field_label}{field.required && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    {renderFormField(field)}
                  </div>
                ))}
              </div>
            )}

            {signatureFields.length > 0 && (
              <div className="mt-6 space-y-3 border-t border-graphite-100 pt-4 dark:border-graphite-700">
                <h4 className="text-sm font-semibold text-graphite-700 dark:text-graphite-300">
                  <Shield className="mr-1 inline h-4 w-4" /> Assinaturas Necessárias
                </h4>
                {signatureFields.map(field => (
                  <div key={field.id} className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 dark:border-purple-700 dark:bg-purple-900/20">
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">✎ {field.field_label}</span>
                    {field.signer_role && <span className="ml-2 text-xs text-purple-500">({field.signer_role})</span>}
                  </div>
                ))}
              </div>
            )}

            {!selectedDoc.template_pdf_url && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Este documento nao possui PDF configurado. Um administrador precisa fazer o upload do PDF template para que o preenchimento possa ser gerado.
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button onClick={handleSaveDraft} className="flex items-center gap-2 rounded-lg border border-graphite-200 px-4 py-2.5 text-sm font-medium hover:bg-graphite-50 dark:border-graphite-700">
                <Save className="h-4 w-4" /> Salvar Rascunho
              </button>
              <button onClick={handleGerarPdf} disabled={!selectedDoc.template_pdf_url}
                className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-aviation-700 disabled:opacity-50">
                <Download className="h-4 w-4" /> Baixar PDF Preenchido
              </button>
            </div>
          </div>

          {signers.length > 0 && (
            <div className="rounded-xl border border-graphite-200 bg-white p-4 dark:border-graphite-700 dark:bg-graphite-800">
              <h4 className="mb-3 text-sm font-semibold text-graphite-900 dark:text-graphite-100"><Shield className="inline h-4 w-4 mr-1" /> Signatários</h4>
              <div className="space-y-1">
                {signers.map(s => (
                  <div key={s.id} className="flex items-center gap-2 text-sm text-graphite-600 dark:text-graphite-400">
                    <span className="font-medium text-graphite-900 dark:text-graphite-100">{s.order_index}º</span>
                    {s.signer_name} <span className="text-xs text-graphite-400">({s.signer_role})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fills.length > 0 && (
            <div className="rounded-xl border border-graphite-200 bg-white p-4 dark:border-graphite-700 dark:bg-graphite-800">
              <h4 className="mb-3 text-sm font-semibold text-graphite-900 dark:text-graphite-100">Histórico</h4>
              <div className="space-y-2">
                {fills.map(fill => (
                  <div key={fill.id} className="rounded-lg border border-graphite-100 p-3 dark:border-graphite-700">
                    <button onClick={() => setExpandedFill(expandedFill === fill.id ? null : fill.id)} className="flex w-full items-center justify-between">
                      <span className="text-sm text-graphite-900 dark:text-graphite-100">{new Date(fill.created_at).toLocaleDateString('pt-BR')}</span>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${fill.status === 'draft' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                          {fill.status === 'draft' ? 'Rascunho' : 'Pendente'}
                        </span>
                        {expandedFill === fill.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </button>
                    {expandedFill === fill.id && (
                      <div className="mt-3 border-t border-graphite-100 pt-3 dark:border-graphite-700">
                        <pre className="text-xs text-graphite-600 dark:text-graphite-400 whitespace-pre-wrap">{JSON.stringify(fill.filled_data, null, 2)}</pre>
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

  return (
    <>
      {/* PREVIEW MODAL - TELA CHEIA */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-graphite-900">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-graphite-200 bg-white px-4 py-2 dark:border-graphite-700 dark:bg-graphite-800">
            <button onClick={closePreview}
              className="rounded-lg border border-graphite-200 px-3 py-1.5 text-sm hover:bg-graphite-50 dark:border-graphite-700">
              <ArrowLeft className="inline h-4 w-4 mr-1" />Fechar
            </button>
            <PageTitle icon={Eye} title={previewDoc.name} />
            <div className="ml-auto flex items-center gap-2">
              {isAdmin && (
                <button onClick={() => { closePreview(); openManage(previewDoc); }}
                  className="flex items-center gap-2 rounded-lg border border-graphite-200 px-3 py-1.5 text-xs hover:bg-graphite-50 dark:border-graphite-700">
                  <Edit3 className="h-3 w-3" /> Editar
                </button>
              )}
              <button onClick={() => { closePreview(); selectDocument(previewDoc); }}
                className="flex items-center gap-2 rounded-lg bg-aviation-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-aviation-700">
                <FileText className="h-3 w-3" /> Preencher
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 overflow-hidden">
            {previewLoading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-aviation-500" />
                <span className="ml-2 text-sm text-graphite-500">Carregando PDF...</span>
              </div>
            ) : !previewPdfData ? (
              <div className="flex flex-1 flex-col items-center justify-center">
                <FileText className="mb-4 h-16 w-16 text-graphite-300" />
                <h3 className="mb-2 text-xl font-semibold text-graphite-700 dark:text-graphite-300">Nenhum PDF para visualizar</h3>
                <p className="mb-4 text-sm text-graphite-500">Este documento ainda nao possui um PDF template configurado.</p>
                {isAdmin && (
                  <button onClick={() => { closePreview(); openManage(previewDoc); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-aviation-600 px-6 py-3 text-sm font-medium text-white hover:bg-aviation-700">
                    <Upload className="h-4 w-4" /> Fazer Upload do PDF
                  </button>
                )}
              </div>
            ) : (
              <div className="flex flex-1 overflow-auto bg-graphite-100 dark:bg-graphite-900">
                <PdfPreview pdfData={previewPdfData} fields={previewDoc.document_fields} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
