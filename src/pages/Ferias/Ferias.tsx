import { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays, Plus, Search, Pencil, Trash2, X, Save, User,
  Calendar, Clock, ChevronDown, ChevronUp,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarBombeiros } from '../../services/bombeiroService';
import { STATUS_FERIAS, STATUS_FERIAS_COLORS } from '../../types/ferias';
import type { Ferias, StatusFerias } from '../../types/ferias';
import { listarFerias, criarFerias, atualizarFerias, excluirFerias } from '../../services/feriasService';

function calcDias(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  const d1 = new Date(inicio);
  const d2 = new Date(fim);
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function getAnos(): string[] {
  const ano = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => (ano - 2 + i).toString());
}

/* ───────── Formulário ───────── */

function FeriasForm({
  ferias,
  onSave,
  onCancel,
}: {
  ferias?: Ferias;
  onSave: (data: Omit<Ferias, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) => void;
  onCancel: () => void;
}) {
  const bombeiros = useMemo(() => listarBombeiros(), []);
  const [form, setForm] = useState(ferias ? {
    funcionarioId: ferias.funcionarioId,
    funcionarioNome: ferias.funcionarioNome,
    periodo: ferias.periodo,
    dataInicio: ferias.dataInicio,
    dataFim: ferias.dataFim,
    dias: ferias.dias,
    status: ferias.status,
    observacoes: ferias.observacoes,
  } : {
    funcionarioId: '',
    funcionarioNome: '',
    periodo: new Date().getFullYear().toString(),
    dataInicio: '',
    dataFim: '',
    dias: 0,
    status: 'Programadas' as StatusFerias,
    observacoes: '',
  });

  const input = 'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100';
  const label = 'block mb-1.5 text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400';

  useEffect(() => {
    if (form.dataInicio && form.dataFim) {
      setForm(f => ({ ...f, dias: calcDias(f.dataInicio, f.dataFim) }));
    }
  }, [form.dataInicio, form.dataFim]);

  function handleFuncionario(id: string) {
    const b = bombeiros.find(x => x.id === id);
    setForm(f => ({ ...f, funcionarioId: id, funcionarioNome: b?.nomeCompleto || '' }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-graphite-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">
            {ferias ? 'Editar Férias' : 'Nova Férias'}
          </h2>
          <button onClick={onCancel} className="rounded-xl p-1 text-graphite-400 hover:bg-graphite-100 dark:hover:bg-graphite-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={label}>Funcionário *</label>
            <select value={form.funcionarioId} onChange={e => handleFuncionario(e.target.value)} className={input}>
              <option value="">Selecione</option>
              {bombeiros.map(b => (
                <option key={b.id} value={b.id}>{b.nomeCompleto} ({b.nomeGuerra})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Período (Ano)</label>
            <select value={form.periodo} onChange={e => setForm(f => ({ ...f, periodo: e.target.value }))} className={input}>
              {getAnos().map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Data Início *</label>
              <input type="date" value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} className={input} />
            </div>
            <div>
              <label className={label}>Data Fim *</label>
              <input type="date" value={form.dataFim} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value }))} className={input} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Dias</label>
              <input value={form.dias || ''} readOnly className={input + ' cursor-not-allowed bg-graphite-50 font-bold dark:bg-graphite-700/50'} />
            </div>
            <div>
              <label className={label}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as StatusFerias }))} className={input}>
                {STATUS_FERIAS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={label}>Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} className={input + ' resize-none'} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel}
            className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-200">
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            disabled={!form.funcionarioId || !form.dataInicio || !form.dataFim}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
            <Save className="h-4 w-4" /> {ferias ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── Página principal ───────── */

export function Ferias() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [termo, setTermo] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Ferias | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const [filtroStatus, setFiltroStatus] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  function carregar() { setFerias(listarFerias()); }
  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(() => {
    let list = ferias;
    if (filtroAno) list = list.filter(f => f.periodo === filtroAno);
    if (filtroStatus) list = list.filter(f => f.status === filtroStatus);
    if (termo) {
      const t = termo.toLowerCase();
      list = list.filter(f => f.funcionarioNome.toLowerCase().includes(t));
    }
    return list;
  }, [ferias, filtroAno, filtroStatus, termo]);

  const stats = useMemo(() => {
    const total = filtradas.length;
    const gozando = filtradas.filter(f => f.status === 'Em Gozo').length;
    const programadas = filtradas.filter(f => f.status === 'Programadas').length;
    const gozadas = filtradas.filter(f => f.status === 'Gozadas').length;
    return { total, gozando, programadas, gozadas };
  }, [filtradas]);

  function handleSave(data: Omit<Ferias, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>) {
    if (editando) {
      atualizarFerias(editando.id, data);
    } else {
      criarFerias({ ...data, createdBy: user?.username || '' });
    }
    carregar();
    setFormOpen(false);
    setEditando(null);
  }

  function handleDelete(id: string) {
    excluirFerias(id);
    setConfirmDelete(null);
    carregar();
  }

  return (
    <PageContainer>
      <PageTitle icon={CalendarDays} title="Férias" />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-graphite-200 bg-white p-4 dark:border-graphite-700 dark:bg-graphite-800">
          <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Total</p>
          <p className="text-2xl font-black text-graphite-900 dark:text-graphite-100">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Programadas</p>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{stats.programadas}</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">Em Gozo</p>
          <p className="text-2xl font-black text-yellow-700 dark:text-yellow-300">{stats.gozando}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-500">Gozadas</p>
          <p className="text-2xl font-black text-green-700 dark:text-green-300">{stats.gozadas}</p>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
            <input type="text" value={termo} onChange={e => setTermo(e.target.value)}
              placeholder="Pesquisar funcionário..."
              className="w-full rounded-xl border border-graphite-300 bg-white py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100" />
          </div>
          <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}
            className="rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100">
            <option value="">Todos os anos</option>
            {getAnos().map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all dark:border-graphite-600 dark:bg-graphite-800 dark:text-graphite-100">
            <option value="">Todos os status</option>
            {STATUS_FERIAS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        {isAdmin && (
          <button onClick={() => { setEditando(null); setFormOpen(true); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Nova Férias
          </button>
        )}
      </div>

      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-graphite-700 dark:bg-graphite-900/30">
          <CalendarDays className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum registro de férias</h3>
          <p className="text-sm text-graphite-400">Clique em "Nova Férias" para cadastrar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(f => (
            <div key={f.id} className="rounded-2xl border border-graphite-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-graphite-700 dark:bg-graphite-800">
              <button onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white shadow-sm">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-graphite-900 dark:text-graphite-100 truncate">{f.funcionarioNome}</p>
                  <div className="flex items-center gap-3 text-xs text-graphite-500 dark:text-graphite-400">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {f.periodo}</span>
                    <span>{new Date(f.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} — {new Date(f.dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {f.dias} dias</span>
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_FERIAS_COLORS[f.status]}`}>
                  {f.status}
                </span>
                {expanded === f.id ? <ChevronUp className="h-4 w-4 shrink-0 text-graphite-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-graphite-400" />}
              </button>

              {expanded === f.id && (
                <div className="border-t border-graphite-200 px-5 py-4 dark:border-graphite-700">
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Período</p>
                      <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100">{f.periodo}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Início</p>
                      <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100">{new Date(f.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Fim</p>
                      <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100">{new Date(f.dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Dias</p>
                      <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{f.dias} dias</p>
                    </div>
                  </div>
                  {f.observacoes && (
                    <div className="mt-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Observações</p>
                      <p className="text-sm text-graphite-700 dark:text-graphite-300">{f.observacoes}</p>
                    </div>
                  )}
                  {isAdmin && (
                    <div className="mt-4 flex items-center gap-2">
                      <button onClick={() => { setEditando(f); setFormOpen(true); }}
                        className="flex items-center gap-1 rounded-lg bg-graphite-100 px-3 py-1.5 text-xs font-medium text-graphite-700 transition-colors hover:bg-graphite-200 dark:bg-graphite-700 dark:text-graphite-300 dark:hover:bg-graphite-600">
                        <Pencil className="h-3.5 w-3.5" /> Editar
                      </button>
                      <button onClick={() => setConfirmDelete(f.id)}
                        className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-alert-red transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <FeriasForm ferias={editando || undefined} onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditando(null); }} />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-graphite-800">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusão</h3>
            <p className="mb-6 text-sm text-graphite-500">Tem certeza que deseja excluir este registro de férias?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-graphite-700 dark:bg-graphite-800 dark:text-graphite-200">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98]">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
