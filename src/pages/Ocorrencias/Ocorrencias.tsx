import { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, Plus, Save, Eye, Pencil, Trash2, ChevronDown, ChevronUp, FileText,
  Send, CheckCircle, RotateCcw,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { turnoAutoPorEquipe } from '../../types/bombeiro';
import { listarBombeiros } from '../../services/bombeiroService';
import { listarOcorrencias, criarOcorrencia, atualizarOcorrencia, excluirOcorrencia } from '../../services/ocorrenciaService';
import { CATEGORIAS_OCORRENCIA, EQUIPES, TIPO_DOCUMENTO } from '../../types/ocorrencia';
import type { Ocorrencia, TipoDocumento } from '../../types/ocorrencia';

function gerarNumero(tipo: TipoDocumento, existentes: Ocorrencia[]): string {
  const prefixo = tipo === 'BONA' ? 'BONA' : 'RAE';
  const ano = new Date().getFullYear();
  const doMesmoTipo = existentes.filter(o => o.tipoDocumento === tipo && o.numero.startsWith(prefixo));
  const sequencia = doMesmoTipo.length + 1;
  return `${prefixo}-${String(sequencia).padStart(3, '0')}/${ano}`;
}

function emptyOcorrencia(): Omit<Ocorrencia, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> {
  return {
    tipoDocumento: 'BONA',
    numero: '',
    data: new Date().toISOString().split('T')[0],
    hora: '',
    equipe: '',
    turno: '',
    categoria: 'Outros',
    titulo: TIPO_DOCUMENTO.BONA,
    descricao: '',
    local: '',
    envolvidos: '',
    acoesTomadas: '',
    status: 'Aberta',
    fotos: [],
  };
}

/* ───────── Formulário ───────── */

function OcorrenciaForm({
  ocorrencia,
  userEquipe,
  todas,
  savedId,
  role,
  onSave,
  onSaveDraft,
  onEncaminhar,
  onAceitar,
  onSolicitarRetrabalho,
  onConcluir,
  onCancel,
}: {
  ocorrencia?: Ocorrencia;
  userEquipe: string;
  todas: Ocorrencia[];
  savedId: string | null;
  role: string;
  onSave: (data: Omit<Ocorrencia, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
  onSaveDraft: (data: Omit<Ocorrencia, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
  onEncaminhar?: () => void;
  onAceitar?: () => void;
  onSolicitarRetrabalho?: () => void;
  onConcluir?: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(ocorrencia ? {
    tipoDocumento: ocorrencia.tipoDocumento,
    numero: ocorrencia.numero,
    data: ocorrencia.data, hora: ocorrencia.hora, equipe: ocorrencia.equipe,
    turno: ocorrencia.turno, categoria: ocorrencia.categoria, titulo: ocorrencia.titulo,
    descricao: ocorrencia.descricao, local: ocorrencia.local, envolvidos: ocorrencia.envolvidos,
    acoesTomadas: ocorrencia.acoesTomadas, status: ocorrencia.status, fotos: ocorrencia.fotos,
  } : { ...emptyOcorrencia(), equipe: userEquipe, numero: gerarNumero('BONA', todas) });

  const [successMsg, setSuccessMsg] = useState('');
  function clearSuccess() { setSuccessMsg(''); }

  useEffect(() => {
    if (successMsg) {
      const t = setTimeout(clearSuccess, 3000);
      return () => clearTimeout(t);
    }
  }, [successMsg]);

  const input = 'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all duration-200 focus:border-aviation-500 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:hover:border-graphite-500 dark:focus:border-aviation-400 dark:focus:bg-surface-elevated dark:focus:ring-aviation-400/10 dark:placeholder:text-graphite-500';
  const select = input;
  const inputReadOnly = input + ' cursor-not-allowed bg-graphite-50 dark:bg-surface-hover50';
  const label = 'block mb-1.5 text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400';

  function handleEquipe(equipe: string) {
    const turno = turnoAutoPorEquipe(equipe as any);
    setForm(f => ({ ...f, equipe, turno }));
  }

  function handleTipo(tipo: TipoDocumento) {
    setForm(f => ({
      ...f,
      tipoDocumento: tipo,
      titulo: TIPO_DOCUMENTO[tipo],
      numero: gerarNumero(tipo, todas),
    }));
  }

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, fotos: [...f.fotos, reader.result as string] }));
    reader.readAsDataURL(file);
  }

  const tipoBadge = form.tipoDocumento === 'BONA'
    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';

  const statusBadge: Record<string, string> = {
    'Aberta': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Encaminhada': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'Em Andamento': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'Fechada': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };

  const isGestor = role === 'gestor' || role === 'admin';
  const isChefe = role === 'chefe';
  const status = form.status;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8 sm:pt-16">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl shadow-black/10 dark:bg-surface-elevated">
        <div className="flex items-center justify-between border-b border-graphite-200 px-6 py-4 dark:border-border-dark">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">{ocorrencia ? 'Editar Documento' : 'Novo Documento'}</h2>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tipoBadge}`}>
              {form.tipoDocumento} · {form.numero}
            </span>
            {status && (
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadge[status] || ''}`}>
                {status}
              </span>
            )}
          </div>
          <button onClick={onCancel} className="rounded-lg p-1.5 text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5 rounded-xl border border-graphite-200 bg-graphite-50 p-4 dark:border-border-dark dark:bg-surface-card">
            <label className={label}>Tipo de Documento *</label>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {(['BONA', 'RAE'] as TipoDocumento[]).map(tipo => (
                <button key={tipo} type="button" onClick={() => handleTipo(tipo)}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                    form.tipoDocumento === tipo
                      ? 'border-aviation-500 bg-aviation-50 dark:border-aviation-400 dark:bg-aviation-900/20'
                      : 'border-graphite-200 bg-white hover:border-graphite-300 dark:border-border-dark dark:bg-surface-card dark:hover:border-graphite-600'
                  }`}>
                  <FileText className={`h-5 w-5 shrink-0 ${form.tipoDocumento === tipo ? 'text-aviation-600 dark:text-aviation-400' : 'text-graphite-400'}`} />
                  <div>
                    <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{tipo}</p>
                    <p className="text-[11px] text-graphite-500 dark:text-graphite-400">{TIPO_DOCUMENTO[tipo]}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>Número</label>
              <input value={form.numero} readOnly className={inputReadOnly} />
            </div>
            <div>
              <label className={label}>Data *</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className={input} />
            </div>
            <div>
              <label className={label}>Hora *</label>
              <input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} className={input} />
            </div>
            <div>
              <label className={label}>Equipe *</label>
              <select value={form.equipe} onChange={e => handleEquipe(e.target.value)} className={select}>
                <option value="">Selecione</option>
                {EQUIPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Turno</label>
              <input value={form.turno} readOnly className={inputReadOnly} />
            </div>
            <div>
              <label className={label}>Categoria *</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value as Ocorrencia['categoria'] }))} className={select}>
                {CATEGORIAS_OCORRENCIA.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Título</label>
              <input value={form.titulo} readOnly className={inputReadOnly + ' font-semibold'} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Local</label>
              <input value={form.local} onChange={e => setForm(f => ({ ...f, local: e.target.value }))} className={input} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Descrição</label>
              <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={3} className={input + ' resize-none'} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Envolvidos</label>
              <input value={form.envolvidos} onChange={e => setForm(f => ({ ...f, envolvidos: e.target.value }))} className={input} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Ações Tomadas</label>
              <textarea value={form.acoesTomadas} onChange={e => setForm(f => ({ ...f, acoesTomadas: e.target.value }))} rows={3} className={input + ' resize-none'} />
            </div>
            <div className="sm:col-span-2">
              <label className={label}>Fotos</label>
              <div className="flex flex-wrap gap-2">
                {form.fotos.map((foto, i) => (
                  <div key={i} className="relative h-16 w-16">
                    <img src={foto} className="h-full w-full rounded-lg object-cover" />
                    <button onClick={() => setForm(f => ({ ...f, fotos: f.fotos.filter((_, j) => j !== i) }))}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">✕</button>
                  </div>
                ))}
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-graphite-300 text-graphite-400 transition-colors hover:border-aviation-400 hover:text-aviation-500 dark:border-border-dark dark:bg-surface-card/30 dark:hover:border-aviation-500">
                  <Plus className="h-5 w-5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
                </label>
              </div>
            </div>
          </div>
        </div>

        {successMsg && (
          <div className="mx-6 mt-4 rounded-xl border border-green-300 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 dark:border-green-700 dark:bg-green-900/30 dark:text-green-400">
            {successMsg}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-graphite-200 px-6 py-4 dark:border-border-dark">
          <button onClick={onCancel} className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
            Cancelar
          </button>

          {isChefe && status === 'Aberta' && !savedId && (
            <button onClick={() => { clearSuccess(); onSaveDraft(form); }} disabled={!form.data || !form.equipe}
              className="flex items-center gap-2 rounded-xl border-2 border-orange-400 bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-xl hover:shadow-orange-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              <Save className="h-4 w-4" /> Salvar e Continuar
            </button>
          )}

          {isChefe && status === 'Aberta' && (
            <button onClick={() => onSave(form)} disabled={!form.data || !form.equipe}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 disabled:opacity-50 disabled:cursor-not-allowed">
              <Save className="h-4 w-4" /> Salvar
            </button>
          )}

          {isChefe && status === 'Aberta' && onEncaminhar && (
            <button onClick={onEncaminhar} disabled={!form.data || !form.equipe}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-xl hover:shadow-orange-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              <Send className="h-4 w-4" /> Encaminhar ao Gestor
            </button>
          )}

          {isGestor && status === 'Encaminhada' && onAceitar && (
            <button onClick={onAceitar}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all hover:from-blue-600 hover:to-blue-700 hover:shadow-xl hover:shadow-blue-500/30 active:scale-[0.98]">
              <CheckCircle className="h-4 w-4" /> Aceitar (Em Andamento)
            </button>
          )}

          {isGestor && status === 'Em Andamento' && onSolicitarRetrabalho && (
            <button onClick={onSolicitarRetrabalho}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-yellow-500/25 transition-all hover:from-yellow-600 hover:to-yellow-700 hover:shadow-xl hover:shadow-yellow-500/30 active:scale-[0.98]">
              <RotateCcw className="h-4 w-4" /> Solicitar Retrabalho
            </button>
          )}

          {isGestor && status === 'Em Andamento' && onConcluir && (
            <button onClick={onConcluir}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-500/25 transition-all hover:from-green-600 hover:to-green-700 hover:shadow-xl hover:shadow-green-500/30 active:scale-[0.98]">
              <CheckCircle className="h-4 w-4" /> Concluir (Fechada)
            </button>
          )}

          {isGestor && (status === 'Em Andamento' || status === 'Encaminhada') && (
            <button onClick={() => onSave(form)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
              <Save className="h-4 w-4" /> Salvar Alterações
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────── Visualização ───────── */

function OcorrenciaView({ ocorrencia, onBack }: { ocorrencia: Ocorrencia; onBack: () => void }) {
  const label = 'text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400';
  const value = 'text-sm text-graphite-900 dark:text-graphite-100';

  const statusColor: Record<string, string> = {
    'Aberta': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Encaminhada': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'Em Andamento': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'Fechada': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };
  const tipoBadge = ocorrencia.tipoDocumento === 'BONA'
    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';

  return (
    <div className="rounded-2xl border border-graphite-200 bg-white p-6 shadow-sm dark:border-border-dark dark:bg-surface-card">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">{ocorrencia.numero}</h3>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tipoBadge}`}>{ocorrencia.tipoDocumento}</span>
          </div>
          <p className="mt-1 text-sm font-medium text-graphite-600 dark:text-graphite-300">{TIPO_DOCUMENTO[ocorrencia.tipoDocumento]}</p>
          <p className="mt-0.5 text-sm text-graphite-500 dark:text-graphite-400">{ocorrencia.data} {ocorrencia.hora && `às ${ocorrencia.hora}`}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor[ocorrencia.status] || ''}`}>{ocorrencia.status}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div><p className={label}>Equipe</p><p className={value}>{ocorrencia.equipe}</p></div>
        <div><p className={label}>Turno</p><p className={value}>{ocorrencia.turno || '—'}</p></div>
        <div><p className={label}>Categoria</p><p className={value}>{ocorrencia.categoria}</p></div>
        <div><p className={label}>Local</p><p className={value}>{ocorrencia.local || '—'}</p></div>
      </div>

      {ocorrencia.descricao && (
        <div className="mt-4"><p className={label}>Descrição</p><p className={value + ' mt-1 whitespace-pre-wrap'}>{ocorrencia.descricao}</p></div>
      )}
      {ocorrencia.envolvidos && (
        <div className="mt-3"><p className={label}>Envolvidos</p><p className={value + ' mt-1'}>{ocorrencia.envolvidos}</p></div>
      )}
      {ocorrencia.acoesTomadas && (
        <div className="mt-3"><p className={label}>Ações Tomadas</p><p className={value + ' mt-1 whitespace-pre-wrap'}>{ocorrencia.acoesTomadas}</p></div>
      )}

      {ocorrencia.fotos.length > 0 && (
        <div className="mt-4">
          <p className={label}>Fotos</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ocorrencia.fotos.map((f, i) => (
              <img key={i} src={f} className="h-20 w-20 rounded-xl object-cover" />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={onBack} className="rounded-xl border border-graphite-300 bg-white px-5 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">Voltar</button>
      </div>
    </div>
  );
}

/* ───────── Card ───────── */

function OcorrenciaCard({
  o, isAdmin, isGerente, onView, onEdit, onDelete,
}: {
  o: Ocorrencia; isAdmin: boolean; isGerente: boolean;
  onView: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusColor: Record<string, string> = {
    'Aberta': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    'Encaminhada': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'Em Andamento': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'Fechada': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  };
  const tipoBadge = o.tipoDocumento === 'BONA'
    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
    : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400';

  const canEdit = o.status === 'Aberta' && (isAdmin || isGerente);
  const canDelete = o.status === 'Aberta' && isAdmin;

  return (
    <div className="rounded-2xl border border-graphite-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-border-dark dark:bg-surface-card">
      <button onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${tipoBadge}`}>{o.tipoDocumento}</span>
            <span className="shrink-0 text-xs font-semibold text-graphite-500 dark:text-graphite-400">{o.numero}</span>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusColor[o.status] || ''}`}>{o.status}</span>
            <span className="shrink-0 rounded-full bg-aviation-50 px-2.5 py-0.5 text-[10px] font-medium text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">{o.categoria}</span>
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-graphite-500 dark:text-graphite-400">
            <span>{o.data}</span>
            {o.hora && <span>às {o.hora}</span>}
            <span>Equipe {o.equipe}</span>
            {o.local && <span>· {o.local}</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="ml-2 h-4 w-4 shrink-0 text-graphite-400" /> : <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-graphite-400" />}
      </button>

      {expanded && (
        <div className="border-t border-graphite-200 px-5 py-4 dark:border-border-dark">
          <p className="mb-2 text-sm font-semibold text-graphite-700 dark:text-graphite-300">{TIPO_DOCUMENTO[o.tipoDocumento]}</p>
          {o.descricao && <p className="mb-2 text-sm text-graphite-700 dark:text-graphite-300 whitespace-pre-wrap">{o.descricao}</p>}
          {o.envolvidos && <p className="mb-1 text-xs text-graphite-500 dark:text-graphite-400"><strong>Envolvidos:</strong> {o.envolvidos}</p>}
          {o.acoesTomadas && <p className="mb-2 text-xs text-graphite-500 dark:text-graphite-400 whitespace-pre-wrap"><strong>Ações:</strong> {o.acoesTomadas}</p>}
          {o.fotos.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {o.fotos.map((f, i) => <img key={i} src={f} className="h-14 w-14 rounded-lg object-cover" />)}
            </div>
          )}
          <div className="mt-4 flex items-center gap-2">
            <button onClick={onView} className="flex items-center gap-1 rounded-lg bg-aviation-50 px-3 py-1.5 text-xs font-medium text-aviation-700 transition-colors hover:bg-aviation-100 dark:bg-aviation-900/30 dark:text-aviation-300 dark:hover:bg-aviation-900/50">
              <Eye className="h-3.5 w-3.5" /> Ver
            </button>
            {canEdit && (
              <button onClick={onEdit} className="flex items-center gap-1 rounded-lg bg-graphite-100 px-3 py-1.5 text-xs font-medium text-graphite-700 transition-colors hover:bg-graphite-200 dark:bg-surface-hover dark:text-graphite-300 dark:hover:bg-surface-hover">
                <Pencil className="h-3.5 w-3.5" /> Editar
              </button>
            )}
            {canDelete && (
              <button onClick={onDelete} className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-alert-red transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30">
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Página principal ───────── */

async function getUserRole(username: string): Promise<'admin' | 'gerente' | 'chefe'> {
  if (username === 'admin') return 'admin';
  const users = JSON.parse(localStorage.getItem('sescinc-users') || '{}');
  const stored = users[username];
  if (stored?.role === 'desenvolvedor' || stored?.role === 'admin') return 'admin';
  const b = (await listarBombeiros()).find(
    x => x.nomeGuerra.toLowerCase() === username.toLowerCase() ||
         x.nomeCompleto.toLowerCase().includes(username.toLowerCase()),
  );
  if (b?.cargo === 'GS' || b?.equipe === 'Embaixador') return 'gerente';
  if (b?.cargo === 'BA-CE' || b?.cargo === 'BA-LR') return 'chefe';
  return 'chefe';
}

async function getUserEquipe(username: string): Promise<string> {
  const b = (await listarBombeiros()).find(
    x => x.nomeGuerra.toLowerCase() === username.toLowerCase() ||
         x.nomeCompleto.toLowerCase().includes(username.toLowerCase()),
  );
  return b?.equipe || '';
}

export function Ocorrencias() {
  const { user } = useAuth();
  const username = user?.username || '';
  const [role, setRole] = useState<'admin' | 'gerente' | 'chefe'>('chefe');
  const [userEquipe, setUserEquipe] = useState('');
  useEffect(() => { (async () => {
    setRole(await getUserRole(username));
    setUserEquipe(await getUserEquipe(username));
  })(); }, [username]);
  const isAdmin = role === 'admin';
  const isGerente = role === 'gerente';
  const canFilterTeam = isAdmin || isGerente;
  const canEdit = isAdmin || isGerente || role === 'chefe';

  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [mode, setMode] = useState<'list' | 'form' | 'view'>('list');
  const [editando, setEditando] = useState<Ocorrencia | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [visualizando, setVisualizando] = useState<Ocorrencia | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  function clearSuccess() { setSuccessMsg(''); }
  useEffect(() => { if (successMsg) { const t = setTimeout(clearSuccess, 3000); return () => clearTimeout(t); } }, [successMsg]);

  const [filtroAno, setFiltroAno] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [filterMode, setFilterMode] = useState<'mes-ano' | 'periodo'>('mes-ano');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [filtroEquipe, setFiltroEquipe] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const ANOS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());
  const inputClass = 'rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all duration-200 hover:border-graphite-400 focus:border-aviation-500 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:hover:border-graphite-500 dark:focus:border-aviation-400 dark:focus:bg-surface-elevated dark:focus:ring-aviation-400/10 dark:placeholder:text-graphite-500';

  async function carregar() { setOcorrencias(await listarOcorrencias()); }
  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(() => {
    let list = ocorrencias;
    if (!canFilterTeam && userEquipe) {
      list = list.filter(o => o.equipe === userEquipe);
    }
    if (canFilterTeam && filtroEquipe) {
      list = list.filter(o => o.equipe === filtroEquipe);
    }
    if (filtroTipo) {
      list = list.filter(o => o.tipoDocumento === filtroTipo);
    }
    if (filterMode === 'mes-ano') {
      if (filtroAno) list = list.filter(o => o.data.startsWith(filtroAno));
      if (filtroMes) list = list.filter(o => (new Date(o.data).getMonth() + 1).toString() === filtroMes);
    } else {
      if (dataInicio) list = list.filter(o => o.data >= dataInicio);
      if (dataFinal) list = list.filter(o => o.data <= dataFinal);
    }
    return list;
  }, [ocorrencias, canFilterTeam, userEquipe, filtroEquipe, filtroTipo, filterMode, filtroAno, filtroMes, dataInicio, dataFinal]);

  async function handleSave(data: Omit<Ocorrencia, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>, stayInForm = false) {
    let saved: Ocorrencia | null;
    if (savedId) {
      saved = await atualizarOcorrencia(savedId, data);
    } else {
      saved = await criarOcorrencia({ ...data, createdBy: username });
      if (saved) setSavedId(saved.id);
    }
    carregar();
    if (saved && stayInForm) {
      setEditando(saved);
    } else if (saved) {
      setEditando(null);
      setSavedId(null);
      setVisualizando(saved);
      setMode('view');
    } else {
      setMode('list');
    }
  }

  async function handleStatusChange(id: string, newStatus: Ocorrencia['status']) {
    await atualizarOcorrencia(id, { status: newStatus });
    carregar();
  }

  async function handleDelete(id: string) {
    await excluirOcorrencia(id);
    setConfirmDelete(null);
    carregar();
  }

  if (mode === 'form') {
    return (
      <PageContainer>
        <PageTitle icon={AlertTriangle} title={editando ? 'Editar Documento' : 'Novo Documento'} />
        <OcorrenciaForm ocorrencia={editando || undefined} userEquipe={userEquipe} todas={ocorrencias} savedId={savedId} role={role}
          onSave={(d) => handleSave(d, false)}
          onSaveDraft={(d) => { handleSave(d, true); setSuccessMsg('Documento salvo com sucesso! Preencha os campos restantes e clique em "Salvar" para finalizar.'); }}
          onEncaminhar={() => {
            handleSave({ ...editando!, status: 'Encaminhada' } as any, false);
            setSuccessMsg('Documento encaminhado ao Gestor Aeroportuário.');
          }}
          onAceitar={() => {
            if (savedId || editando?.id) handleStatusChange(savedId || editando!.id, 'Em Andamento');
            setEditando(null); setSavedId(null); setMode('list');
          }}
          onSolicitarRetrabalho={() => {
            if (savedId || editando?.id) handleStatusChange(savedId || editando!.id, 'Aberta');
            setEditando(null); setSavedId(null); setMode('list');
          }}
          onConcluir={() => {
            if (savedId || editando?.id) handleStatusChange(savedId || editando!.id, 'Fechada');
            setEditando(null); setSavedId(null); setMode('list');
          }}
          onCancel={() => { setMode('list'); setEditando(null); setSavedId(null); }} />
      </PageContainer>
    );
  }

  if (mode === 'view' && visualizando) {
    return (
      <PageContainer>
        <PageTitle icon={AlertTriangle} title={visualizando.numero} />
        <OcorrenciaView ocorrencia={visualizando} onBack={() => setMode('list')} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageTitle icon={AlertTriangle} title="Ocorrências" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex overflow-hidden rounded-xl border border-graphite-300/60 bg-white/70 text-xs font-medium dark:border-border-dark dark:bg-surface-card">
            <button onClick={() => setFilterMode('mes-ano')}
              className={`px-3 py-2 transition-colors ${filterMode === 'mes-ano' ? 'bg-aviation-600 text-white' : 'text-graphite-600 hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover'}`}>
              Mês/Ano
            </button>
            <button onClick={() => setFilterMode('periodo')}
              className={`px-3 py-2 transition-colors ${filterMode === 'periodo' ? 'bg-aviation-600 text-white' : 'text-graphite-600 hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover'}`}>
              Período
            </button>
          </div>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={inputClass}>
            <option value="">Todos os tipos</option>
            <option value="BONA">BONA</option>
            <option value="RAE">RAE</option>
          </select>
          {filterMode === 'mes-ano' ? (
            <>
              <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className={inputClass}>
                <option value="">Todos</option>
                {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={inputClass}>
                <option value="">Todos os meses</option>
                {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </>
          ) : (
            <>
              <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={inputClass} placeholder="Data início" />
              <span className="text-xs text-graphite-400">a</span>
              <input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)} className={inputClass} placeholder="Data fim" />
            </>
          )}
          {canFilterTeam && (
            <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)} className={inputClass}>
              <option value="">Todas as equipes</option>
              {EQUIPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
            </select>
          )}
        </div>
        {canEdit && (
          <button onClick={() => { setEditando(null); setMode('form'); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Novo Documento
          </button>
        )}
      </div>

      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <AlertTriangle className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum documento encontrado</h3>
          <p className="text-sm text-graphite-400 dark:text-graphite-500">Clique em "Novo Documento" para criar BONA ou RAE.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(o => (
            <OcorrenciaCard key={o.id} o={o} isAdmin={isAdmin} isGerente={isGerente}
              onView={() => { setVisualizando(o); setMode('view'); }}
              onEdit={() => { setEditando(o); setSavedId(o.id); setMode('form'); }}
              onDelete={() => setConfirmDelete(o.id)}
            />
          ))}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusão</h3>
            <p className="mb-6 text-sm text-graphite-500 dark:text-graphite-400">Tem certeza que deseja excluir este documento?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98]">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default Ocorrencias;
