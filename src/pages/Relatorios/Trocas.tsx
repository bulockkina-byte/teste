import { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw, Plus, ArrowLeft, FileText, Loader2,
  Download, Save, ChevronDown, ChevronUp, Filter,
  AlertTriangle, AlertCircle, Edit, Trash2, Eye,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { Autocomplete } from '../../components/documentos/Autocomplete';
import {
  listarDocumentos, buscarDocumento, criarDocumento,
  criarCamposEmLote, criarSignatario,
  criarPreenchimento, listarPreenchimentos,
  atualizarPreenchimento, excluirPreenchimento, getPdfBlob,
} from '../../services/documentoService';
import { preencherPdf, downloadPdf } from '../../services/pdfService';
import { DOCUMENT_TEMPLATES, findTemplate } from '../../data/documentTemplates';
import type { TemplateFieldDef } from '../../data/documentTemplates';
import type { DocumentWithFields, DocumentField, DocumentFill } from '../../types/document';
import { useAuth } from '../../context/AuthContext';
import { listarBombeiros } from '../../services/bombeiroService';
import { listarAPOCs } from '../../services/apocService';
import type { Bombeiro } from '../../types/bombeiro';
import type { APOC } from '../../types/apoc';

type SubView = 'list' | 'form';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const MAX_TROCAS_PER_MONTH = 3;

const template = DOCUMENT_TEMPLATES[0];

function templateFieldsToDocFields(fields: TemplateFieldDef[]): DocumentField[] {
  return fields.map((tf, i) => ({
    id: `tpl_${i}`,
    document_id: '',
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
    created_at: new Date().toISOString(),
  }));
}

const DRAFT_TTL_MS = 3 * 24 * 60 * 60 * 1000;

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Excluindo...';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatCpf(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function Trocas() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin_master' || user?.role === 'admin';
  const [loading, setLoading] = useState(true);
  const [subView, setSubView] = useState<SubView>('list');
  const [templateDoc, setTemplateDoc] = useState<DocumentWithFields | null>(null);
  const [fills, setFills] = useState<DocumentFill[]>([]);
  const [expandedFill, setExpandedFill] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showConfirmPdf, setShowConfirmPdf] = useState(false);
  const [showLimitPopup, setShowLimitPopup] = useState(false);
  const [limitPopupData, setLimitPopupData] = useState<{ count: number; targetName: string }>({ count: 0, targetName: '' });
  const [overrideName, setOverrideName] = useState('');
  const [editingFillId, setEditingFillId] = useState<string | null>(null);
  const [draftCountdowns, setDraftCountdowns] = useState<Record<string, number>>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showJustificativaPopup, setShowJustificativaPopup] = useState<string | null>(null);
  const [showValidationPopup, setShowValidationPopup] = useState<string | null>(null);
  const [showNotifPopup, setShowNotifPopup] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [bombeirosList, setBombeirosList] = useState<Bombeiro[]>([]);
  const [apocsList, setApocsList] = useState<APOC[]>([]);
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<number>(now.getMonth());
  const [filterYear, setFilterYear] = useState<number>(now.getFullYear());

  const FIELD_LABEL_OVERRIDES: Record<string, string> = {
    deferido_indeferido: 'Parecer do Embaixador',
  };

  const displayFields = useMemo(() => {
    const base = templateDoc ? templateDoc.document_fields : templateFieldsToDocFields(template.fields);
    return base
      .filter(f => !f.field_name.startsWith('check_'))
      .map(f => {
        let patched = FIELD_LABEL_OVERRIDES[f.field_name] ? { ...f, field_label: FIELD_LABEL_OVERRIDES[f.field_name] } : f;
        if (patched.field_name === 'motivo_troca' || patched.field_name === 'justificativa_emergencial') {
          patched = { ...patched, field_type: 'textarea', is_signature: false, read_only: false, data_source: 'manual' };
        }
        return patched;
      });
  }, [templateDoc]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const filteredFills = useMemo(() => {
    return fills.filter(fill => {
      const d = new Date(fill.created_at);
      if (!isAdmin && fill.filled_by !== user?.username) return false;
      return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
    });
  }, [fills, filterMonth, filterYear, isAdmin, user]);

  const currentUserTrocasThisMonth = useMemo(() => {
    const now2 = new Date();
    return fills.filter(fill => {
      const d = new Date(fill.created_at);
      return fill.filled_by === user?.username && d.getMonth() === now2.getMonth() && d.getFullYear() === now2.getFullYear();
    }).length;
  }, [fills, user]);

  useEffect(() => { init(); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const nowMs = Date.now();
      const countdowns: Record<string, number> = {};
      const toDelete: string[] = [];
      fills.forEach(fill => {
        if (fill.status !== 'draft') return;
        const created = new Date(fill.created_at).getTime();
        const remaining = created + DRAFT_TTL_MS - nowMs;
        if (remaining <= 0) {
          toDelete.push(fill.id);
        } else {
          countdowns[fill.id] = remaining;
        }
      });
      setDraftCountdowns(countdowns);
      if (toDelete.length > 0) {
        toDelete.forEach(async (id) => {
          try { await excluirPreenchimento(id); } catch { /* ignore */ }
        });
        setFills(prev => prev.filter(f => !toDelete.includes(f.id)));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [fills]);

  async function init() {
    try {
      setLoading(true);
      const [docs, bombeiros, apocs] = await Promise.all([
        listarDocumentos(),
        listarBombeiros(),
        listarAPOCs(),
      ]);
      setBombeirosList(bombeiros);
      setApocsList(apocs);
      const trocaDoc = docs.find(d => findTemplate(d.name) !== null);
      if (trocaDoc) {
        const full = await buscarDocumento(trocaDoc.id);
        setTemplateDoc(full);
        const docFills = await listarPreenchimentos(trocaDoc.id);
        setFills(docFills);
      }
    } catch {
      setShowNotifPopup({ msg: 'Erro ao carregar trocas. Contate o administrador.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function ensureDocumentExists(): Promise<DocumentWithFields | null> {
    if (templateDoc) return templateDoc;
    try {
      const doc = await criarDocumento({
        name: 'FORMULARIO DE TROCA DE SERVICOS (PERMUTA)',
        description: 'Formulario de Troca de Servicos - Permuta',
        category: 'administrativo',
        template_pdf_url: null,
        active: true,
        template_pdf_pages: 0, template_pdf_width: 0, template_pdf_height: 0,
      });
      await criarCamposEmLote(doc.id, template.fields.map((tf, i) => ({
        document_id: doc.id,
        field_name: tf.field_name,
        field_label: tf.field_label,
        field_type: tf.field_type,
        required: tf.required,
        placeholder: tf.placeholder,
        options: tf.options,
        order_index: i,
        page: 1,
        x: 0, y: 0,
        width: tf.width, height: tf.height, font_size: tf.font_size,
        data_source: tf.data_source, is_signature: tf.is_signature,
        signer_role: tf.signer_role, read_only: tf.read_only,
        conditional_on: tf.conditional_on,
      })));
      for (const ts of template.signers) {
        await criarSignatario({ document_id: doc.id, signer_name: ts.signer_name, signer_role: ts.signer_role, order_index: ts.order_index, required: true });
      }
      const full = await buscarDocumento(doc.id);
      setTemplateDoc(full);
      return full;
    } catch {
      setShowNotifPopup({ msg: 'Erro ao criar documento. Contate o administrador.', type: 'error' });
      return null;
    }
  }

  function startNewTroca() {
    if (currentUserTrocasThisMonth >= MAX_TROCAS_PER_MONTH && !isAdmin) {
      setLimitPopupData({ count: currentUserTrocasThisMonth, targetName: '' });
      setShowLimitPopup(true);
      return;
    }
    const initialData: Record<string, string> = {};
    displayFields.forEach(f => { initialData[f.field_name] = ''; });
    setFormData(initialData);
    setEditingFillId(null);
    setSubView('form');
  }

  function handleFieldChange(fieldName: string, value: string) {
    setMissingFields(prev => prev.filter(f => f !== fieldName));
    if (fieldName === 'nome_solicitante' || fieldName === 'nome_solicitado') {
      handleNameSelect(fieldName, value);
      return;
    }
    setFormData(prev => ({ ...prev, [fieldName]: value }));
  }

  const HIDDEN_AUTENTIQUE_FIELDS = ['data_autentique_1', 'data_autentique_2', 'data_autentique_3', 'check_troca_sim', 'check_troca_nao', 'check_deferido', 'check_indeferido'];

  function getAllFuncionarios() {
    return [
      ...bombeirosList.map(b => ({ label: b.nomeCompleto, sublabel: `${b.cargo} - ${b.email}`, _type: 'bombeiro' as const, _raw: b })),
      ...apocsList.map(a => ({ label: a.nomeCompleto, sublabel: `APOC - ${a.email}`, _type: 'apoc' as const, _raw: a })),
    ];
  }

  function getFuncaoByNome(nome: string): string {
    if (!nome) return '';
    const all = getAllFuncionarios();
    const match = all.find(f => f.label === nome);
    if (!match) return '';
    if (match._type === 'bombeiro') return match._raw.cargo || '';
    if (match._type === 'apoc') return match._raw.funcao || 'APOC';
    return '';
  }

  const personExcessMap = useMemo(() => {
    const countMap: Record<string, number> = {};
    fills.forEach(fill => {
      const d = new Date(fill.created_at);
      if (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return;
      const data = fill.filled_data as Record<string, string>;
      const nomeSol = data.nome_solicitante || '';
      const nomeSolic = data.nome_solicitado || '';
      if (nomeSol) countMap[nomeSol] = (countMap[nomeSol] || 0) + 1;
      if (nomeSolic && nomeSolic !== nomeSol) countMap[nomeSolic] = (countMap[nomeSolic] || 0) + 1;
    });
    const excessMap: Record<string, number> = {};
    Object.entries(countMap).forEach(([nome, count]) => {
      if (count > MAX_TROCAS_PER_MONTH) excessMap[nome] = count - MAX_TROCAS_PER_MONTH;
    });
    return excessMap;
  }, [fills]);

  function handleNameSelect(fieldName: string, value: string) {
    const all = getAllFuncionarios();
    const match = all.find(f => f.label === value);
    setFormData(prev => {
      const next = { ...prev, [fieldName]: value };
      if (match?._type === 'bombeiro') {
        const b = match._raw;
        if (fieldName === 'nome_solicitante') {
          next.cpf_solicitante = formatCpf(b.cpf || '');
          next.funcao_solicitante = b.cargo || '';
        } else if (fieldName === 'nome_solicitado') {
          next.cpf_solicitado = formatCpf(b.cpf || '');
        }
      } else if (match?._type === 'apoc') {
        const a = match._raw;
        if (fieldName === 'nome_solicitante') {
          next.cpf_solicitante = '';
          next.funcao_solicitante = a.funcao || 'APOC';
        } else if (fieldName === 'nome_solicitado') {
          next.cpf_solicitado = '';
        }
      }
      return next;
    });
  }

  function handleCpfChange(fieldName: string, raw: string) {
    setFormData(prev => ({ ...prev, [fieldName]: formatCpf(raw) }));
  }

  function validateForm(): boolean {
    const missing: string[] = [];
    for (const field of displayFields.filter(f => !f.is_signature && !HIDDEN_AUTENTIQUE_FIELDS.includes(f.field_name))) {
      if (field.conditional_on) {
        const [depFieldName, depValue] = field.conditional_on.split('=');
        if ((formData[depFieldName] || '') !== depValue) continue;
      }
      if (field.required && !formData[field.field_name]) {
        missing.push(field.field_name);
      }
    }
    setMissingFields(missing);
    if (missing.length > 0) {
      setShowValidationPopup('Preencha todos os campos obrigatorios. Os campos em vermelho precisam ser preenchidos.');
      return false;
    }
    return true;
  }

  async function handleConfirmGerarPdf() {
    setShowConfirmPdf(false);
    setSaving(true);
    try {
      const doc = await ensureDocumentExists();
      if (!doc) return;
      if (editingFillId) {
        await atualizarPreenchimento(editingFillId, { filled_data: formData, status: 'signed' });
      } else {
        await criarPreenchimento({
          document_id: doc.id, filled_by: user?.username || null,
          filled_data: formData, status: 'signed',
          autentique_document_id: null, autentique_link: null,
        });
      }
      const pdfKey = doc.template_pdf_url;
      if (!pdfKey) { setShowNotifPopup({ msg: 'PDF template nao vinculado. Contate o administrador.', type: 'error' }); return; }
      const blob = await getPdfBlob(pdfKey);
      if (!blob) { setShowNotifPopup({ msg: 'PDF template nao encontrado.', type: 'error' }); return; }
      const pdfBytes = await blob.arrayBuffer();
      const dadosStr: Record<string, string> = {};
      for (const [k, v] of Object.entries(formData)) dadosStr[k] = String(v || '');

      if (formData.troca_emergencial === 'SIM') {
        dadosStr.check_troca_sim = 'V';
        dadosStr.check_troca_nao = '';
      } else if (formData.troca_emergencial === 'NAO') {
        dadosStr.check_troca_sim = '';
        dadosStr.check_troca_nao = 'V';
      }
      if (formData.deferido_indeferido === 'DEFERIDO') {
        dadosStr.check_deferido = 'V';
        dadosStr.check_indeferido = '';
      } else if (formData.deferido_indeferido === 'INDEFERIDO') {
        dadosStr.check_deferido = '';
        dadosStr.check_indeferido = 'V';
      }
      const pdfBlob = await preencherPdf(pdfBytes, dadosStr, doc.document_fields.map(f => ({
        field_name: f.field_name,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        font_size: f.font_size,
        is_signature: f.is_signature,
        page: f.page,
      })));
      const nome = `Troca_${formData.nome_solicitante || 'doc'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      downloadPdf(pdfBlob, nome);
      const docFills = await listarPreenchimentos(doc.id);
      setFills(docFills);
      setEditingFillId(null);
      setSubView('list');
    } catch {
      setShowNotifPopup({ msg: 'Erro ao gerar PDF. Contate o administrador.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  function handleGerarPdf() {
    if (!validateForm()) return;
    setShowConfirmPdf(true);
  }

  async function handleVisualizarPdf(fill: DocumentFill) {
    if (!templateDoc?.template_pdf_url) return;
    try {
      const blob = await getPdfBlob(templateDoc.template_pdf_url);
      if (!blob) { setShowNotifPopup({ msg: 'PDF template nao encontrado.', type: 'error' }); return; }
      const pdfBytes = await blob.arrayBuffer();
      const dadosStr: Record<string, string> = {};
      const data = fill.filled_data as Record<string, string>;
      for (const [k, v] of Object.entries(data)) dadosStr[k] = String(v || '');
      if (data.troca_emergencial === 'SIM') { dadosStr.check_troca_sim = 'V'; dadosStr.check_troca_nao = ''; }
      else if (data.troca_emergencial === 'NAO') { dadosStr.check_troca_sim = ''; dadosStr.check_troca_nao = 'V'; }
      if (data.deferido_indeferido === 'DEFERIDO') { dadosStr.check_deferido = 'V'; dadosStr.check_indeferido = ''; }
      else if (data.deferido_indeferido === 'INDEFERIDO') { dadosStr.check_deferido = ''; dadosStr.check_indeferido = 'V'; }
      const pdfBlob = await preencherPdf(pdfBytes, dadosStr, templateDoc.document_fields.map(f => ({
        field_name: f.field_name, x: f.x, y: f.y, width: f.width, height: f.height,
        font_size: f.font_size, is_signature: f.is_signature, page: f.page,
      })));
      const url = URL.createObjectURL(pdfBlob);
      window.open(url, '_blank');
    } catch {
      setShowNotifPopup({ msg: 'Erro ao visualizar PDF.', type: 'error' });
    }
  }

  async function handleOverrideLimit() {
    if (!overrideName.trim()) {
      setShowNotifPopup({ msg: 'Informe o nome da pessoa para a qual a troca esta sendo realizada.', type: 'error' });
      return;
    }
    setLimitPopupData(prev => ({ ...prev, targetName: overrideName.trim() }));
    setShowLimitPopup(false);
    setOverrideName('');
    const initialData: Record<string, string> = {};
    displayFields.forEach(f => { initialData[f.field_name] = ''; });
    setFormData(initialData);
    setSubView('form');
    setShowNotifPopup({ msg: `Aviso enviado ao gerente: ${user?.username} esta realizando uma troca adicional para ${overrideName.trim()}.`, type: 'info' });
  }

  function handleEditFill(fill: DocumentFill) {
    const data = fill.filled_data as Record<string, string>;
    const initialData: Record<string, string> = {};
    displayFields.forEach(f => { initialData[f.field_name] = data[f.field_name] || ''; });
    setFormData(initialData);
    setEditingFillId(fill.id);
    setSubView('form');
  }

  function handleDeleteFill(fillId: string) {
    setDeleteTargetId(fillId);
    setShowDeleteConfirm(true);
  }

  async function confirmDeleteFill() {
    if (!deleteTargetId) return;
    try {
      await excluirPreenchimento(deleteTargetId);
      setFills(prev => prev.filter(f => f.id !== deleteTargetId));
    } catch {
      setShowNotifPopup({ msg: 'Erro ao excluir. Contate o administrador.', type: 'error' });
    } finally {
      setShowDeleteConfirm(false);
      setDeleteTargetId(null);
    }
  }

  async function handleSaveDraft() {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const doc = await ensureDocumentExists();
      if (!doc) return;
      if (editingFillId) {
        await atualizarPreenchimento(editingFillId, { filled_data: formData, status: 'draft' });
      } else {
        await criarPreenchimento({
          document_id: doc.id, filled_by: user?.username || null,
          filled_data: formData, status: 'draft',
          autentique_document_id: null, autentique_link: null,
        });
      }
      setShowNotifPopup({ msg: 'Rascunho salvo com sucesso!', type: 'success' });
      const docFills = await listarPreenchimentos(doc.id);
      setFills(docFills);
      setEditingFillId(null);
      setSubView('list');
    } catch {
      setShowNotifPopup({ msg: 'Erro ao salvar. Contate o administrador.', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  const inputBase = 'w-full rounded-lg border bg-white px-3 py-2 text-sm text-graphite-900 placeholder-graphite-400 dark:border-graphite-600 dark:bg-graphite-700 dark:text-graphite-100 dark:placeholder-graphite-400';
  const inputNormal = `${inputBase} border-graphite-400`;
  const inputError = `${inputBase} border-red-500 ring-1 ring-red-300 dark:border-red-500 dark:ring-red-600`;
  const readonlyBase = 'w-full rounded-lg border border-graphite-400 bg-graphite-100 px-3 py-2 text-sm text-graphite-600 dark:border-graphite-500 dark:bg-graphite-800 dark:text-graphite-300 cursor-not-allowed';

  function renderField(field: TemplateFieldDef | DocumentField, customClass?: string) {
    const value = formData[field.field_name] || '';
    const cls = customClass || '';
    const funcionarios = getAllFuncionarios();
    const isError = missingFields.includes(field.field_name);
    const base = isError ? inputError : inputNormal;

    if (field.field_name === 'motivo_troca') {
      return <textarea value={value} onChange={e => handleFieldChange(field.field_name, e.target.value)} placeholder={field.placeholder || 'Descreva o motivo da troca...'} rows={5} className={`${base} ${cls}`} />;
    }
    if (field.field_name === 'justificativa_emergencial') {
      return <textarea value={value} onChange={e => handleFieldChange(field.field_name, e.target.value)} placeholder={field.placeholder || 'Informe a justificativa emergencial...'} rows={5} className={`${base} ${cls}`} />;
    }

    if (field.is_signature) return null;

    if (field.conditional_on) {
      const [depFieldName, depValue] = field.conditional_on.split('=');
      if ((formData[depFieldName] || '') !== depValue) return null;
    }

    if (field.read_only) {
      return <input type="text" value={value} readOnly className={`${readonlyBase} ${cls}`} />;
    }

    switch (field.field_type) {
      case 'checkbox':
        return (
          <div className="flex gap-2">
            {field.options?.map(opt => (
              <label key={opt} className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm cursor-pointer ${
                value === opt ? 'border-aviation-500 bg-aviation-50 dark:border-aviation-400 dark:bg-aviation-900/40' : isError ? 'border-red-400 ring-1 ring-red-300 dark:border-red-500 dark:ring-red-600' : 'border-graphite-200 dark:border-graphite-600'
              }`}>
                <input type="radio" name={field.field_name} value={opt} checked={value === opt}
                  onChange={e => handleFieldChange(field.field_name, e.target.value)} className="sr-only" />
                <span className={`h-3.5 w-3.5 rounded border-2 flex items-center justify-center ${
                  value === opt ? 'border-aviation-500 bg-aviation-500' : 'border-graphite-400 dark:border-graphite-500'
                }`}>
                  {value === opt && <span className="text-[10px] font-bold text-white">X</span>}
                </span>
                <span className="text-graphite-700 dark:text-graphite-200">{opt}</span>
              </label>
            ))}
          </div>
        );
      case 'select':
        return (
          <select value={value} onChange={e => handleFieldChange(field.field_name, e.target.value)} className={`${base} ${cls}`}>
            <option value="">{field.placeholder || 'Selecione...'}</option>
            {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        );
      case 'textarea':
        return <textarea value={value} onChange={e => handleFieldChange(field.field_name, e.target.value)} placeholder={field.placeholder || ''} rows={2} className={`${base} ${cls}`} />;
      case 'date':
        return <input type="date" value={value} onChange={e => handleFieldChange(field.field_name, e.target.value)} className={`${base} ${cls}`} />;
      case 'number':
        return <input type="number" value={value} onChange={e => handleFieldChange(field.field_name, e.target.value)} placeholder={field.placeholder || ''} className={`${base} ${cls}`} />;
      default:
        if (field.field_name === 'nome_solicitante' || field.field_name === 'nome_solicitado') {
          return <Autocomplete value={value} onChange={val => handleFieldChange(field.field_name, val)} options={funcionarios} placeholder={field.placeholder || 'Digite o nome...'} className={`${base} ${cls}`} />;
        }
        if (field.field_name === 'cpf_solicitante' || field.field_name === 'cpf_solicitado') {
          return <input type="text" value={value} onChange={e => handleCpfChange(field.field_name, e.target.value)} placeholder="000.000.000-00" maxLength={14} className={`${base} ${cls}`} />;
        }
        if (field.data_source && field.data_source !== 'manual') {
          return <Autocomplete value={value} onChange={val => handleFieldChange(field.field_name, val)} options={funcionarios} placeholder={field.placeholder || 'Digite o nome...'} className={`${base} ${cls}`} />;
        }
        return <input type="text" value={value} onChange={e => handleFieldChange(field.field_name, e.target.value)} placeholder={field.placeholder || ''} className={`${base} ${cls}`} />;
    }
  }

  function Label({ field }: { field: TemplateFieldDef | DocumentField }) {
    const isMissing = missingFields.includes(field.field_name);
    return (
      <label className={`mb-1 block text-xs font-medium ${isMissing ? 'text-red-600 dark:text-red-400' : 'text-graphite-600 dark:text-graphite-300'}`}>
        {field.field_label}{field.required && <span className="ml-1 text-red-500">*</span>}
      </label>
    );
  }

  function getF(name: string): TemplateFieldDef | DocumentField | undefined {
    return displayFields.find(f => f.field_name === name);
  }

  if (loading) {
    return <PageContainer><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-aviation-500" /></div></PageContainer>;
  }

  if (subView === 'form') {
    const sortedFields = [...displayFields].sort((a, b) => a.order_index - b.order_index);
    const signatureFields = sortedFields.filter(f => f.is_signature);

    const fNomeSol = getF('nome_solicitante');
    const fCpfSol = getF('cpf_solicitante');
    const fFuncaoSol = getF('funcao_solicitante');
    const fNomeSolic = getF('nome_solicitado');
    const fCpfSolic = getF('cpf_solicitado');
    const fDataSol = getF('data_solicitada');
    const fDataFolga = getF('data_folga_solicitado');
    const fTrocaEmerg = getF('troca_emergencial');
    const fJustEmerg = getF('justificativa_emergencial');
    const fDeferido = getF('deferido_indeferido');
    const fMotivo = getF('motivo_troca');

    return (
      <PageContainer>
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => setSubView('list')} className="rounded-lg border border-graphite-200 px-3 py-1.5 text-sm text-graphite-700 hover:bg-graphite-50 dark:border-graphite-600 dark:text-graphite-200 dark:hover:bg-graphite-700">
            <ArrowLeft className="inline h-4 w-4 mr-1" />Voltar
          </button>
          <PageTitle icon={RefreshCw} title={editingFillId ? 'Editar Troca de Servico' : 'Nova Troca de Servico'} />
          <div className="ml-auto flex gap-3">
            <button onClick={handleGerarPdf} disabled={saving} className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white hover:bg-aviation-700 disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Gerar PDF
            </button>
            <button onClick={handleSaveDraft} disabled={saving} className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50">
              <Save className="h-4 w-4" /> Salvar Rascunho
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {!templateDoc && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-sm text-blue-700 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              Documento sera criado automaticamente ao salvar.
            </div>
          )}
          {templateDoc && !templateDoc.template_pdf_url && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm text-amber-700 dark:border-amber-600 dark:bg-amber-900/30 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              PDF template nao vinculado. Geracao de PDF disponivel apos configuracao do admin.
            </div>
          )}

          {fNomeSol && (
            <div className="rounded-xl border border-graphite-400 bg-graphite-50 p-4 shadow dark:border-graphite-500 dark:bg-graphite-800">
              <h4 className="mb-3 text-sm font-semibold text-graphite-700 dark:text-graphite-200">Solicitante</h4>
              <div className="flex gap-3">
                <div className="w-[45%] shrink-0"><Label field={fNomeSol} />{renderField(fNomeSol)}</div>
                {fCpfSol && <div className="w-[180px] shrink-0"><Label field={fCpfSol} />{renderField(fCpfSol)}</div>}
                {fFuncaoSol && <div className="min-w-0 flex-1"><Label field={fFuncaoSol} />{renderField(fFuncaoSol)}</div>}
              </div>
            </div>
          )}

          {fNomeSolic && (
            <div className="rounded-xl border border-graphite-400 bg-graphite-50 p-4 shadow dark:border-graphite-500 dark:bg-graphite-800">
              <h4 className="mb-3 text-sm font-semibold text-graphite-700 dark:text-graphite-200">Solicitado</h4>
              <div className="flex gap-3">
                <div className="w-[45%] shrink-0"><Label field={fNomeSolic} />{renderField(fNomeSolic)}</div>
                {fCpfSolic && <div className="w-[180px] shrink-0"><Label field={fCpfSolic} />{renderField(fCpfSolic)}</div>}
                <div className="min-w-0 flex-1" />
              </div>
            </div>
          )}

          <div className="rounded-xl border border-graphite-400 bg-graphite-50 p-4 shadow dark:border-graphite-500 dark:bg-graphite-800">
            <h4 className="mb-3 text-sm font-semibold text-graphite-700 dark:text-graphite-200">Dados da Troca</h4>
            <div className="grid grid-cols-4 gap-3">
              {fDataSol && <div><Label field={fDataSol} />{renderField(fDataSol)}</div>}
              {fDataFolga && <div><Label field={fDataFolga} />{renderField(fDataFolga)}</div>}
              {fTrocaEmerg && <div><Label field={fTrocaEmerg} />{renderField(fTrocaEmerg)}</div>}
              {fDeferido && <div><Label field={fDeferido} />{renderField(fDeferido)}</div>}
            </div>
            {fMotivo && (
              <div className="mt-3 grid grid-cols-1 gap-3">
                <div><Label field={fMotivo} />{renderField(fMotivo)}</div>
                {formData.troca_emergencial === 'SIM' && fJustEmerg && (
                  <div>
                    <Label field={fJustEmerg} />
                    {renderField(fJustEmerg)}
                  </div>
                )}
              </div>
            )}
          </div>

          {signatureFields.length > 0 && (
            <div className="rounded-xl border border-graphite-400 bg-graphite-50 p-4 shadow dark:border-graphite-500 dark:bg-graphite-800">
              <h4 className="mb-3 text-sm font-semibold text-graphite-700 dark:text-graphite-200">Assinaturas (posicionamento para Autentique)</h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {signatureFields.map(f => (
                  <div key={f.field_name} className="flex items-center justify-center gap-1 rounded-lg border-2 border-dashed border-purple-300 bg-purple-100 px-2 py-2 text-center dark:border-purple-600 dark:bg-purple-900/40">
                    <span className="text-xs text-purple-700 dark:text-purple-300 leading-tight">{f.field_label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {showConfirmPdf && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-graphite-800">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-graphite-900 dark:text-graphite-100">Confirmar Geracao do PDF</h3>
              </div>
              <p className="mb-2 text-sm text-graphite-600 dark:text-graphite-300">
                O PDF gerado <strong>nao podera mais ser alterado</strong> apos a geracao.
              </p>
              <p className="mb-4 text-sm text-graphite-600 dark:text-graphite-300">
                O documento sera enviado para o <strong>Autentique</strong> para assinaturas de todos os envolvidos.
              </p>
              <p className="mb-6 text-sm font-medium text-graphite-700 dark:text-graphite-200">
                Tem certeza que os dados estao corretos?
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowConfirmPdf(false)} className="rounded-lg border border-graphite-200 px-4 py-2 text-sm font-medium text-graphite-700 hover:bg-graphite-50 dark:border-graphite-600 dark:text-graphite-200 dark:hover:bg-graphite-700">
                  Cancelar
                </button>
                <button onClick={handleConfirmGerarPdf} disabled={saving} className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white hover:bg-aviation-700 disabled:opacity-50">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Sim, Gerar PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {showLimitPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-graphite-800">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-lg font-semibold text-graphite-900 dark:text-graphite-100">Limite de Trocas Atingido</h3>
              </div>
              <p className="mb-4 text-sm text-graphite-600 dark:text-graphite-300">
                Voce ja realizou <strong>{limitPopupData.count} trocas</strong> este mes. O limite e de <strong>{MAX_TROCAS_PER_MONTH} trocas por mes</strong>.
              </p>
              <p className="mb-4 text-sm text-graphite-600 dark:text-graphite-300">
                Caso deseje continuar, um aviso sera enviado ao gerente informando que voce esta realizando uma troca adicional.
              </p>
              <div className="mb-6">
                <label className="mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300">
                  Informe o nome da pessoa para a qual a troca esta sendo realizada:
                </label>
                <input type="text" value={overrideName} onChange={e => setOverrideName(e.target.value)}
                  placeholder="Nome completo..."
                  className="w-full rounded-lg border border-graphite-200 bg-white px-3 py-2 text-sm text-graphite-900 placeholder-graphite-400 dark:border-graphite-600 dark:bg-graphite-700 dark:text-graphite-100 dark:placeholder-graphite-400" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowLimitPopup(false); setOverrideName(''); }} className="rounded-lg border border-graphite-200 px-4 py-2 text-sm font-medium text-graphite-700 hover:bg-graphite-50 dark:border-graphite-600 dark:text-graphite-200 dark:hover:bg-graphite-700">
                  Cancelar
                </button>
                <button onClick={handleOverrideLimit} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                  Continuar e Enviar Aviso
                </button>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <PageTitle icon={RefreshCw} title="Trocas de Servico" />
        <div className="flex items-center gap-2">
          <button onClick={startNewTroca} className="flex items-center gap-2 rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white hover:bg-aviation-700">
            <Plus className="h-4 w-4" /> Criar Troca
          </button>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-graphite-400 bg-white p-3 dark:border-graphite-500 dark:bg-graphite-800">
        <Filter className="h-4 w-4 text-graphite-400 dark:text-graphite-500" />
        <select value={filterMonth} onChange={e => setFilterMonth(Number(e.target.value))} className="rounded-lg border border-graphite-400 bg-white px-3 py-1.5 text-sm text-graphite-700 dark:border-graphite-500 dark:bg-graphite-700 dark:text-graphite-200">
          {MONTH_NAMES.map((name, i) => (<option key={i} value={i}>{name}</option>))}
        </select>
        <select value={filterYear} onChange={e => setFilterYear(Number(e.target.value))} className="rounded-lg border border-graphite-200 bg-white px-3 py-1.5 text-sm text-graphite-700 dark:border-graphite-600 dark:bg-graphite-700 dark:text-graphite-200">
          {years.map(y => (<option key={y} value={y}>{y}</option>))}
        </select>
        <span className="ml-auto text-xs text-graphite-500 dark:text-graphite-400">{filteredFills.length} troca(s) encontrada(s)</span>
      </div>
      {filteredFills.length === 0 ? (
        <div className="rounded-xl border border-dashed border-graphite-400 bg-graphite-50 py-12 text-center dark:border-graphite-500 dark:bg-graphite-800/50">
          <FileText className="mx-auto mb-3 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <p className="text-graphite-500 dark:text-graphite-400">Nenhuma troca em {MONTH_NAMES[filterMonth]} de {filterYear}</p>
          <p className="mt-1 text-sm text-graphite-400 dark:text-graphite-500">Clique em "Criar Troca" para registrar uma nova.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFills.map(fill => {
            const isExpanded = expandedFill === fill.id;
            const data = fill.filled_data as Record<string, string>;
            const nomeSol = data.nome_solicitante || '';
            const nomeSolic = data.nome_solicitado || '';
            const funcaoSol = getFuncaoByNome(nomeSol);
            void getFuncaoByNome(nomeSolic);
            const isExcessSol = (personExcessMap[nomeSol] || 0) > 0 && fills.filter(f => {
              const d2 = new Date(f.created_at);
              const d3 = new Date(fill.created_at);
              return (f.filled_data as Record<string, string>).nome_solicitante === nomeSol &&
                d2.getMonth() === d3.getMonth() && d2.getFullYear() === d3.getFullYear() &&
                new Date(f.created_at).getTime() >= new Date(fill.created_at).getTime() && f.id !== fill.id;
            }).length >= MAX_TROCAS_PER_MONTH;
            const isExcessSolic = nomeSolic !== nomeSol && (personExcessMap[nomeSolic] || 0) > 0 && fills.filter(f => {
              const d2 = new Date(f.created_at);
              const d3 = new Date(fill.created_at);
              const fd = f.filled_data as Record<string, string>;
              return (fd.nome_solicitante === nomeSolic || fd.nome_solicitado === nomeSolic) &&
                d2.getMonth() === d3.getMonth() && d2.getFullYear() === d3.getFullYear() &&
                new Date(f.created_at).getTime() >= new Date(fill.created_at).getTime() && f.id !== fill.id;
            }).length >= MAX_TROCAS_PER_MONTH;
            const isExcess = isExcessSol || isExcessSolic;

            let dotColor = 'bg-yellow-500 dark:bg-yellow-400';
            let dotLabel = 'Rascunho';
            if (fill.status === 'signed') {
              dotColor = 'bg-green-500 dark:bg-green-400';
              dotLabel = 'Assinado';
            } else if (isExcess) {
              dotColor = 'bg-red-500 dark:bg-red-400';
              dotLabel = 'Excedeu limite';
            }

            return (
              <div key={fill.id} className="rounded-xl border border-graphite-200 bg-white dark:border-graphite-600 dark:bg-graphite-800">
                <div className="flex items-center justify-between p-4">
                  <button onClick={() => setExpandedFill(isExpanded ? null : fill.id)} className="flex flex-1 items-center gap-3 text-left">
                    <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${dotColor}`} title={dotLabel} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-graphite-900 dark:text-graphite-100">
                        {nomeSol || 'Sem nome'} {'\u2192'} {nomeSolic || 'Sem nome'}
                      </div>
                      <div className="text-xs text-graphite-500 dark:text-graphite-400">
                        {fill.filled_by || 'Desconhecido'}{funcaoSol ? ` - ${funcaoSol}` : ''}
                        {' '}&bull;{' '}
                        {new Date(fill.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2">
                    {fill.status === 'draft' && (
                      <>
                        <button onClick={() => handleEditFill(fill)} title="Editar" className="rounded-lg border border-graphite-200 p-1.5 text-graphite-500 hover:bg-graphite-50 dark:border-graphite-600 dark:text-graphite-400 dark:hover:bg-graphite-700">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDeleteFill(fill.id)} title="Excluir" className="rounded-lg border border-graphite-200 p-1.5 text-red-500 hover:bg-red-50 dark:border-graphite-600 dark:text-red-400 dark:hover:bg-red-900/20">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      fill.status === 'draft' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                      fill.status === 'signed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                      'bg-graphite-100 text-graphite-600 dark:bg-graphite-700 dark:text-graphite-300'
                    }`}>
                      {fill.status === 'draft' ? 'Rascunho' : fill.status === 'signed' ? 'Assinado' : fill.status}
                    </span>
                    {fill.status === 'draft' && draftCountdowns[fill.id] != null && (
                      <span className="text-[10px] text-yellow-600 dark:text-yellow-400" title="Tempo ate exclusao automatica">
                        Exclui em: {formatCountdown(draftCountdowns[fill.id])}
                      </span>
                    )}
                    <button onClick={() => setExpandedFill(isExpanded ? null : fill.id)} className="rounded p-1 text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-graphite-700">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {isAdmin && templateDoc?.template_pdf_url && (
                      <button onClick={() => handleVisualizarPdf(fill)} title="Visualizar PDF" className="rounded p-1 text-graphite-400 hover:bg-graphite-100 hover:text-aviation-600 dark:hover:bg-graphite-700 dark:hover:text-aviation-400">
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t border-graphite-100 px-4 py-3 dark:border-graphite-600">
                    <div className="mb-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
                      {data.data_solicitada && (
                        <div>
                          <span className="text-xs text-graphite-400 dark:text-graphite-500">Data Solicitada</span>
                          <p className="text-graphite-900 dark:text-graphite-100">{new Date(data.data_solicitada + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>
                      )}
                      {data.data_folga_solicitado && (
                        <div>
                          <span className="text-xs text-graphite-400 dark:text-graphite-500">Data Folga</span>
                          <p className="text-graphite-900 dark:text-graphite-100">{new Date(data.data_folga_solicitado + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                        </div>
                      )}
                      {data.troca_emergencial === 'SIM' && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          <button onClick={() => setShowJustificativaPopup(fill.id)} className="text-sm font-medium text-orange-600 underline hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
                            Troca Emergencial
                          </button>
                        </div>
                      )}
                    </div>
                    {data.motivo_troca && (
                      <div className="rounded-lg border border-graphite-200 bg-graphite-50 p-3 dark:border-graphite-600 dark:bg-graphite-700/50">
                        <span className="text-xs text-graphite-400 dark:text-graphite-500">Motivo da Troca</span>
                        <p className="mt-1 text-sm text-graphite-900 dark:text-graphite-100">{data.motivo_troca}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showJustificativaPopup && (() => {
        const fill = filteredFills.find(f => f.id === showJustificativaPopup);
        const data = fill?.filled_data as Record<string, string> | undefined;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowJustificativaPopup(null)}>
            <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-graphite-800" onClick={e => e.stopPropagation()}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-lg font-semibold text-graphite-900 dark:text-graphite-100">Justificativa da Troca Emergencial</h3>
              </div>
              <p className="text-sm text-graphite-600 dark:text-graphite-300">{data?.justificativa_emergencial || 'Nenhuma justificativa informada.'}</p>
              <div className="mt-6 flex justify-end">
                <button onClick={() => setShowJustificativaPopup(null)} className="rounded-lg border border-graphite-200 px-4 py-2 text-sm font-medium text-graphite-700 hover:bg-graphite-50 dark:border-graphite-600 dark:text-graphite-200 dark:hover:bg-graphite-700">
                  Fechar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showValidationPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowValidationPopup(null)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-graphite-800" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-graphite-900 dark:text-graphite-100">Campos Obrigatorios</h3>
            </div>
            <p className="text-sm text-graphite-600 dark:text-graphite-300">{showValidationPopup}</p>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowValidationPopup(null)} className="rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white hover:bg-aviation-700">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-graphite-800">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-graphite-900 dark:text-graphite-100">Excluir Troca</h3>
            </div>
            <p className="mb-6 text-sm text-graphite-600 dark:text-graphite-300">
              Tem certeza que deseja excluir esta troca? Esta acao nao pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteTargetId(null); }} className="rounded-lg border border-graphite-200 px-4 py-2 text-sm font-medium text-graphite-700 hover:bg-graphite-50 dark:border-graphite-600 dark:text-graphite-200 dark:hover:bg-graphite-700">
                Cancelar
              </button>
              <button onClick={confirmDeleteFill} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
                <Trash2 className="h-4 w-4" /> Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotifPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowNotifPopup(null)}>
          <div className="mx-4 w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-graphite-800" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                showNotifPopup.type === 'success' ? 'bg-green-100 dark:bg-green-900/40' :
                showNotifPopup.type === 'error' ? 'bg-red-100 dark:bg-red-900/40' :
                'bg-blue-100 dark:bg-blue-900/40'
              }`}>
                {showNotifPopup.type === 'success' ? <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /> :
                 showNotifPopup.type === 'error' ? <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" /> :
                 <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />}
              </div>
              <h3 className="text-lg font-semibold text-graphite-900 dark:text-graphite-100">
                {showNotifPopup.type === 'success' ? 'Sucesso' : showNotifPopup.type === 'error' ? 'Erro' : 'Aviso'}
              </h3>
            </div>
            <p className="text-sm text-graphite-600 dark:text-graphite-300">{showNotifPopup.msg}</p>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowNotifPopup(null)} className="rounded-lg bg-aviation-600 px-4 py-2 text-sm font-medium text-white hover:bg-aviation-700">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
