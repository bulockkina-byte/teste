import { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList, Plus, Search, Trash2, Save, Eye, Printer,
  AlertCircle, X,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { listarBombeiros } from '../../services/bombeiroService';
import type { Bombeiro } from '../../types/bombeiro';

interface OrdemServico {
  id: string;
  numero: string;
  dataEmissao: string;
  dataConclusao: string;
  solicitanteId: string;
  solicitanteNome: string;
  equipe: string;
  descricao: string;
  prioridade: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  status: 'Aberta' | 'Em Andamento' | 'Concluída' | 'Cancelada';
  observacoes: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'sescinc-ordens-servico';

const PRIORIDADE_CORES: Record<string, string> = {
  'Baixa': 'bg-sky-100 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
  'Média': 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  'Alta': 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
  'Urgente': 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

const STATUS_CORES: Record<string, string> = {
  'Aberta': 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  'Em Andamento': 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  'Concluída': 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  'Cancelada': 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

function carregar(): OrdemServico[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

function salvar(lista: OrdemServico[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}

function fmt(d: string) {
  if (!d) return '-';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

const EQUIPES = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Ferista'];
const PRIORIDADES = ['Baixa', 'Média', 'Alta', 'Urgente'];
const STATUS_LIST = ['Aberta', 'Em Andamento', 'Concluída', 'Cancelada'];

const inputCls = 'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400';
const labelCls = 'mb-1 block text-sm font-medium text-graphite-700 dark:text-graphite-300';

export function OrdemServico() {
  const [ordens, setOrdens] = useState<OrdemServico[]>([]);
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<OrdemServico | null>(null);
  const [visualizando, setVisualizando] = useState<OrdemServico | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  // Form fields
  const [formNumero, setFormNumero] = useState('');
  const [formData, setFormData] = useState(new Date().toISOString().split('T')[0]);
  const [formSolicitante, setFormSolicitante] = useState('');
  const [formSolicitanteNome, setFormSolicitanteNome] = useState('');
  const [formEquipe, setFormEquipe] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formPrioridade, setFormPrioridade] = useState('Média');
  const [formStatus, setFormStatus] = useState('Aberta');
  const [formConclusao, setFormConclusao] = useState('');
  const [formObservacoes, setFormObservacoes] = useState('');
  const [searchSol, setSearchSol] = useState('');

  useEffect(() => {
    listarBombeiros().then(setBombeiros).catch(() => {});
    setOrdens(carregar());
  }, []);

  const filtered = useMemo(() => {
    let lista = ordens;
    if (filtroStatus) lista = lista.filter(o => o.status === filtroStatus);
    if (filtroPrioridade) lista = lista.filter(o => o.prioridade === filtroPrioridade);
    if (search) {
      const t = search.toLowerCase();
      lista = lista.filter(o => o.numero.toLowerCase().includes(t) || o.solicitanteNome.toLowerCase().includes(t) || o.descricao.toLowerCase().includes(t));
    }
    return lista.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [ordens, search, filtroStatus, filtroPrioridade]);

  const solicitantesFiltrados = useMemo(() => {
    if (!searchSol) return [];
    const t = searchSol.toLowerCase();
    return bombeiros.filter(b => b.nomeCompleto.toLowerCase().includes(t) || b.nomeGuerra.toLowerCase().includes(t)).slice(0, 8);
  }, [bombeiros, searchSol]);

  function resetForm() {
    setFormNumero('');
    setFormData(new Date().toISOString().split('T')[0]);
    setFormSolicitante('');
    setFormSolicitanteNome('');
    setFormEquipe('');
    setFormDescricao('');
    setFormPrioridade('Média');
    setFormStatus('Aberta');
    setFormConclusao('');
    setFormObservacoes('');
    setSearchSol('');
  }

  function handleNovo() {
    resetForm();
    setEditando(null);
    setFormOpen(true);
  }

  function handleEditar(os: OrdemServico) {
    setEditando(os);
    setFormNumero(os.numero);
    setFormData(os.dataEmissao);
    setFormSolicitante(os.solicitanteId);
    setFormSolicitanteNome(os.solicitanteNome);
    setFormEquipe(os.equipe);
    setFormDescricao(os.descricao);
    setFormPrioridade(os.prioridade);
    setFormStatus(os.status);
    setFormConclusao(os.dataConclusao);
    setFormObservacoes(os.observacoes);
    setSearchSol(os.solicitanteNome);
    setFormOpen(true);
  }

  function handleSalvar() {
    if (!formNumero || !formSolicitante || !formDescricao) return;
    const lista = carregar();
    const now = new Date().toISOString();
    if (editando) {
      const idx = lista.findIndex(o => o.id === editando.id);
      if (idx >= 0) {
        lista[idx] = { ...lista[idx], numero: formNumero, dataEmissao: formData, dataConclusao: formConclusao,
          solicitanteId: formSolicitante, solicitanteNome: formSolicitanteNome, equipe: formEquipe,
          descricao: formDescricao, prioridade: formPrioridade as any, status: formStatus as any, observacoes: formObservacoes, updatedAt: now };
      }
    } else {
      lista.push({ id: crypto.randomUUID(), numero: formNumero, dataEmissao: formData, dataConclusao: formConclusao,
        solicitanteId: formSolicitante, solicitanteNome: formSolicitanteNome, equipe: formEquipe,
        descricao: formDescricao, prioridade: formPrioridade as any, status: formStatus as any,
        observacoes: formObservacoes, createdAt: now, updatedAt: now });
    }
    salvar(lista);
    setOrdens(lista);
    setFormOpen(false);
  }

  function handleDelete(id: string) {
    const lista = carregar().filter(o => o.id !== id);
    salvar(lista);
    setOrdens(lista);
    setConfirmDelete(null);
  }

  function handleGerar(os: OrdemServico) {
    setVisualizando(os);
    document.title = `ORDEM DE SERVIÇO Nº ${os.numero} - ${os.solicitanteNome} - ${fmt(os.dataEmissao)}`;
    setTimeout(() => window.print(), 200);
  }

  const stats = useMemo(() => ({
    total: ordens.length, abertas: ordens.filter(o => o.status === 'Aberta').length,
    andamento: ordens.filter(o => o.status === 'Em Andamento').length,
    concluidas: ordens.filter(o => o.status === 'Concluída').length,
    urgentes: ordens.filter(o => o.prioridade === 'Urgente').length,
  }), [ordens]);

  return (
    <PageContainer>
      <PageTitle icon={ClipboardList} title="Ordens de Serviço" />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-xl border border-graphite-200 bg-white p-3 text-center dark:border-border-dark dark:bg-surface-card">
            <p className="text-xl font-black text-graphite-900 dark:text-graphite-100">{stats.total}</p>
            <p className="text-[10px] font-medium text-graphite-500">Total</p>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-xl font-black text-blue-700 dark:text-blue-300">{stats.abertas}</p>
            <p className="text-[10px] font-medium text-blue-500">Abertas</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-xl font-black text-amber-700 dark:text-amber-300">{stats.andamento}</p>
            <p className="text-[10px] font-medium text-amber-500">Em Andamento</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center dark:border-green-800 dark:bg-green-900/20">
            <p className="text-xl font-black text-green-700 dark:text-green-300">{stats.concluidas}</p>
            <p className="text-[10px] font-medium text-green-500">Concluídas</p>
          </div>
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center dark:border-red-800 dark:bg-red-900/20">
            <p className="text-xl font-black text-red-700 dark:text-red-300">{stats.urgentes}</p>
            <p className="text-[10px] font-medium text-red-500">Urgentes</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar OS..." className={`${inputCls} !pl-10`} />
          </div>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={`${inputCls} !w-auto`}>
            <option value="">Todos Status</option>
            {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)} className={`${inputCls} !w-auto`}>
            <option value="">Todas Prioridades</option>
            {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={handleNovo}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Nova OS
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
            <ClipboardList className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
            <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhuma OS encontrada</h3>
            <p className="text-sm text-graphite-500">Clique em "Nova OS" para criar.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(os => (
              <div key={os.id} className="rounded-2xl border border-graphite-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-border-dark dark:bg-surface-card">
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${
                    os.prioridade === 'Urgente' ? 'bg-gradient-to-br from-red-500 to-red-700' :
                    os.prioridade === 'Alta' ? 'bg-gradient-to-br from-orange-500 to-orange-700' :
                    'bg-gradient-to-br from-aviation-500 to-aviation-700'
                  }`}>{os.numero.slice(-2)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">OS #{os.numero}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${PRIORIDADE_CORES[os.prioridade]}`}>{os.prioridade}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${STATUS_CORES[os.status]}`}>{os.status}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-graphite-500 truncate">{os.descricao}</p>
                    <p className="text-[10px] text-graphite-400">{os.solicitanteNome} · {fmt(os.dataEmissao)} · {os.equipe}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleGerar(os)} className="rounded-xl p-1.5 text-aviation-500 hover:bg-aviation-50 hover:text-aviation-700 dark:hover:bg-aviation-900/20" title="Gerar"><Printer className="h-4 w-4" /></button>
                    <button onClick={() => handleEditar(os)} className="rounded-xl p-1.5 text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover" title="Editar">
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => setConfirmDelete(os.id)} className="rounded-xl p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 py-8">
          <div className="relative w-full max-w-2xl mx-4 rounded-2xl bg-white shadow-2xl dark:bg-surface-elevated">
            <div className="flex items-center justify-between border-b border-graphite-200 px-6 py-4 dark:border-border-dark">
              <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">{editando ? 'Editar' : 'Nova'} Ordem de Serviço</h2>
              <button onClick={() => setFormOpen(false)} className="rounded-xl p-1.5 text-graphite-400 hover:bg-graphite-100 hover:text-graphite-600 dark:hover:bg-surface-hover">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Número <span className="text-red-500">*</span></label>
                  <input type="text" value={formNumero} onChange={e => setFormNumero(e.target.value)} placeholder="Ex: 001/2026" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Data de Emissão</label>
                  <input type="date" value={formData} onChange={e => setFormData(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Solicitante <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input type="text" value={searchSol} onChange={e => { setSearchSol(e.target.value); setFormSolicitante(''); setFormSolicitanteNome(''); }}
                    placeholder="Buscar por nome..." className={inputCls} />
                  {searchSol && solicitantesFiltrados.length > 0 && !formSolicitante && (
                    <div className="absolute z-10 mt-1 w-full rounded-xl border border-graphite-200 bg-white shadow-lg dark:border-border-dark dark:bg-surface-card">
                      {solicitantesFiltrados.map(b => (
                        <button key={b.id} type="button" onClick={() => { setFormSolicitante(b.id); setFormSolicitanteNome(b.nomeCompleto); setSearchSol(b.nomeCompleto); }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-graphite-50 dark:hover:bg-surface-hover">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-aviation-500 to-aviation-700 text-xs font-bold text-white">{b.nomeGuerra.charAt(0)}</div>
                          <div><p className="font-medium text-graphite-900">{b.nomeCompleto}</p><p className="text-xs text-graphite-500">{b.nomeGuerra} · {b.cargo}</p></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {formSolicitanteNome && <p className="mt-1 text-xs text-emerald-600 font-medium">{formSolicitanteNome}</p>}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelCls}>Equipe</label>
                  <select value={formEquipe} onChange={e => setFormEquipe(e.target.value)} className={inputCls}>
                    <option value="">Selecione</option>
                    {EQUIPES.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Prioridade</label>
                  <select value={formPrioridade} onChange={e => setFormPrioridade(e.target.value)} className={inputCls}>
                    {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {editando && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className={labelCls}>Status</label>
                    <select value={formStatus} onChange={e => setFormStatus(e.target.value)} className={inputCls}>
                      {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Data de Conclusão</label>
                    <input type="date" value={formConclusao} onChange={e => setFormConclusao(e.target.value)} className={inputCls} />
                  </div>
                </div>
              )}

              <div>
                <label className={labelCls}>Descrição do Serviço <span className="text-red-500">*</span></label>
                <textarea value={formDescricao} onChange={e => setFormDescricao(e.target.value)} rows={4} placeholder="Descreva o serviço..." className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Observações</label>
                <textarea value={formObservacoes} onChange={e => setFormObservacoes(e.target.value)} rows={3} placeholder="Observações..." className={inputCls} />
              </div>

              <div className="flex justify-end gap-3 border-t border-graphite-200 pt-4 dark:border-border-dark">
                <button onClick={() => setFormOpen(false)} className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">Cancelar</button>
                <button onClick={handleSalvar} disabled={!formNumero || !formSolicitante || !formDescricao}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl active:scale-[0.98] disabled:opacity-50">
                  <Save className="h-4 w-4" /> Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate View (print) */}
      {visualizando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setVisualizando(null)}>
          <div className="relative max-h-[90vh] w-full max-w-3xl mx-4 overflow-y-auto rounded-2xl bg-white p-8 shadow-2xl dark:bg-surface-elevated" onClick={e => e.stopPropagation()}>
            <style>{'@media print {body {font-size: 12pt} .no-print {display: none !important}}'}</style>
            <div className="no-print mb-4 flex justify-end gap-2">
              <button onClick={() => { document.title = `ORDEM DE SERVIÇO Nº ${visualizando.numero}`; window.print(); }}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2 text-sm font-medium text-white shadow-lg"><Printer className="h-4 w-4" /> Imprimir</button>
              <button onClick={() => setVisualizando(null)} className="rounded-xl border border-graphite-300 bg-white px-4 py-2 text-sm font-medium text-graphite-700">Fechar</button>
            </div>
            <div id="print-area" className="space-y-4">
              <div className="border-b-2 border-graphite-800 pb-3 text-center">
                <h1 className="text-xl font-black text-graphite-900 uppercase">ORDEM DE SERVIÇO</h1>
                <p className="text-sm text-graphite-500">OS Nº {visualizando.numero}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                <div><span className="font-bold text-graphite-600">Solicitante:</span> {visualizando.solicitanteNome}</div>
                <div><span className="font-bold text-graphite-600">Equipe:</span> {visualizando.equipe || 'N/A'}</div>
                <div><span className="font-bold text-graphite-600">Emissão:</span> {fmt(visualizando.dataEmissao)}</div>
                <div><span className="font-bold text-graphite-600">Conclusão:</span> {fmt(visualizando.dataConclusao) || '-'}</div>
                <div><span className="font-bold text-graphite-600">Prioridade:</span> {visualizando.prioridade}</div>
                <div><span className="font-bold text-graphite-600">Status:</span> {visualizando.status}</div>
              </div>
              <div>
                <h2 className="mb-1 text-xs font-bold uppercase text-graphite-500">Descrição</h2>
                <div className="rounded-lg border border-graphite-300 bg-graphite-50 p-4 text-sm text-graphite-900 whitespace-pre-wrap">{visualizando.descricao}</div>
              </div>
              {visualizando.observacoes && (
                <div>
                  <h2 className="mb-1 text-xs font-bold uppercase text-graphite-500">Observações</h2>
                  <div className="rounded-lg border border-graphite-300 bg-graphite-50 p-4 text-sm text-graphite-900 whitespace-pre-wrap">{visualizando.observacoes}</div>
                </div>
              )}
              <div className="pt-4 text-center text-xs text-graphite-400 border-t border-graphite-200">
                Documento gerado em {new Date().toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusão</h3>
            <p className="mb-6 text-sm text-graphite-500">Tem certeza que deseja excluir esta OS?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)} className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default OrdemServico;
