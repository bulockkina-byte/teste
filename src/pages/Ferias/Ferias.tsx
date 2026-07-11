import { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays, Plus, Search, Pencil, Trash2, X, Save, User,
  Calendar, Clock, ChevronDown, ChevronUp, Users, AlertTriangle,
  ArrowRightLeft, Shield,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarBombeiros, listarAtivos } from '../../services/bombeiroService';
import { STATUS_FERIAS, STATUS_FERIAS_COLORS, FUNCOES_SUBSTITUICAO } from '../../types/ferias';
import type { Ferias, StatusFerias, AlertaVencimento } from '../../types/ferias';
import type { Cargo, Equipe } from '../../types/bombeiro';
import { EQUIPE_OPTIONS } from '../../types/bombeiro';
import {
  listarFerias, alertasVencimento,
  criarFerias, atualizarFerias, excluirFerias,
} from '../../services/feriasService';
import {
  listarSubstituicoes, criarSubstituicao,
  encerrarSubstituicao,
} from '../../services/substituicaoService';
import type { SubstituicaoAtiva } from '../../types/ferias';

const TABS = [
  { key: 'visao', label: 'Visão Geral', icon: CalendarDays },
  { key: 'escala', label: 'Escala por Equipe', icon: Users },
  { key: 'substituicoes', label: 'Substituições', icon: ArrowRightLeft },
  { key: 'alertas', label: 'Alertas', icon: AlertTriangle },
] as const;

type TabKey = typeof TABS[number]['key'];

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

const input = 'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:hover:border-graphite-500 dark:focus:border-aviation-400 dark:focus:bg-surface-elevated dark:focus:ring-aviation-400/10 dark:placeholder:text-graphite-500';
const label = 'block mb-1.5 text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400';

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
  const bombeiros = useMemo(() => listarAtivos(), []);
  const [form, setForm] = useState(ferias ? {
    funcionarioId: ferias.funcionarioId,
    funcionarioNome: ferias.funcionarioNome,
    periodo: ferias.periodo,
    dataInicio: ferias.dataInicio,
    dataFim: ferias.dataFim,
    dias: ferias.dias,
    status: ferias.status,
    substitutoId: ferias.substitutoId,
    substitutoNome: ferias.substitutoNome,
    funcaoSubstituicao: ferias.funcaoSubstituicao,
    observacoes: ferias.observacoes,
  } : {
    funcionarioId: '',
    funcionarioNome: '',
    periodo: new Date().getFullYear().toString(),
    dataInicio: '',
    dataFim: '',
    dias: 0,
    status: 'Programadas' as StatusFerias,
    substitutoId: '',
    substitutoNome: '',
    funcaoSubstituicao: '' as Cargo | '',
    observacoes: '',
  });

  const funcionario = bombeiros.find(b => b.id === form.funcionarioId);
  const mesmaEquipe = funcionario
    ? bombeiros.filter(b => b.equipe === funcionario.equipe && b.id !== funcionario.id)
    : [];

  useEffect(() => {
    if (form.dataInicio && form.dataFim) {
      setForm(f => ({ ...f, dias: calcDias(f.dataInicio, f.dataFim) }));
    }
  }, [form.dataInicio, form.dataFim]);

  function handleFuncionario(id: string) {
    const b = bombeiros.find(x => x.id === id);
    setForm(f => ({
      ...f,
      funcionarioId: id,
      funcionarioNome: b?.nomeCompleto || '',
      substitutoId: '',
      substitutoNome: '',
    }));
  }

  const showSubstituto = (form.status === 'Programadas' || form.status === 'Em Gozo') && form.funcionarioId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">
            {ferias ? 'Editar Férias' : 'Nova Férias'}
          </h2>
          <button onClick={onCancel} className="rounded-xl p-1 text-graphite-400 hover:bg-graphite-100 dark:hover:bg-surface-hover">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={label}>Funcionário *</label>
            <select value={form.funcionarioId} onChange={e => handleFuncionario(e.target.value)} className={input}>
              <option value="">Selecione</option>
              {bombeiros.map(b => (
                <option key={b.id} value={b.id}>{b.nomeCompleto} ({b.equipe})</option>
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
              <input value={form.dias || ''} readOnly className={input + ' cursor-not-allowed bg-graphite-50 font-bold dark:bg-surface-hover'} />
            </div>
            <div>
              <label className={label}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as StatusFerias }))} className={input}>
                {STATUS_FERIAS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {showSubstituto && (
            <div className="rounded-xl border border-aviation-200 bg-aviation-50 p-4 dark:border-aviation-800 dark:bg-aviation-900/20">
              <div className="mb-3 flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />
                <span className="text-sm font-semibold text-aviation-700 dark:text-aviation-300">Substituição</span>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={label}>Substituto</label>
                  <select value={form.substitutoId}
                    onChange={e => {
                      const b = mesmaEquipe.find(x => x.id === e.target.value);
                      setForm(f => ({ ...f, substitutoId: e.target.value, substitutoNome: b?.nomeCompleto || '' }));
                    }}
                    className={input}>
                    <option value="">Nenhum</option>
                    {mesmaEquipe.map(b => (
                      <option key={b.id} value={b.id}>{b.nomeCompleto} ({b.cargo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Função de Substituição</label>
                  <select value={form.funcaoSubstituicao}
                    onChange={e => setForm(f => ({ ...f, funcaoSubstituicao: e.target.value as Cargo || '' }))}
                    className={input}>
                    <option value="">Nenhuma</option>
                    {FUNCOES_SUBSTITUICAO.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className={label}>Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={2} className={input + ' resize-none'} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel}
            className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
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

/* ───────── Tab: Visão Geral ───────── */

function VisaoGeral({
  ferias, isAdmin, onEdit, onDelete, onOpenForm,
}: {
  ferias: Ferias[];
  isAdmin: boolean;
  onEdit: (f: Ferias) => void;
  onDelete: (id: string) => void;
  onOpenForm: () => void;
}) {
  const [termo, setTermo] = useState('');
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroEquipe, setFiltroEquipe] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const bombeiros = useMemo(() => listarBombeiros(), []);

  const filtradas = useMemo(() => {
    let list = ferias;
    if (filtroAno) list = list.filter(f => f.periodo === filtroAno);
    if (filtroStatus) list = list.filter(f => f.status === filtroStatus);
    if (filtroEquipe) {
      const ids = new Set(bombeiros.filter(b => b.equipe === filtroEquipe).map(b => b.id));
      list = list.filter(f => ids.has(f.funcionarioId));
    }
    if (termo) {
      const t = termo.toLowerCase();
      list = list.filter(f => f.funcionarioNome.toLowerCase().includes(t));
    }
    return list;
  }, [ferias, filtroAno, filtroStatus, filtroEquipe, termo, bombeiros]);

  const stats = useMemo(() => {
    const total = ferias.length;
    const gozando = ferias.filter(f => f.status === 'Em Gozo').length;
    const programadas = ferias.filter(f => f.status === 'Programadas').length;
    const gozadas = ferias.filter(f => f.status === 'Gozadas').length;
    return { total, gozando, programadas, gozadas };
  }, [ferias]);

  function handleConfirmDelete(id: string) {
    onDelete(id);
    setConfirmDelete(null);
  }

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-graphite-200 bg-white p-4 dark:border-border-dark dark:bg-surface-card">
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
              className="w-full rounded-xl border border-graphite-300 bg-white py-2.5 pl-10 pr-4 text-sm text-graphite-900 placeholder-graphite-400 outline-none transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:hover:border-graphite-500 dark:focus:border-aviation-400 dark:focus:bg-surface-elevated dark:focus:ring-aviation-400/10 dark:placeholder:text-graphite-500" />
          </div>
          <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)}
            className="rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
            <option value="">Todos os anos</option>
            {getAnos().map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
            <option value="">Todos os status</option>
            {STATUS_FERIAS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)}
            className="rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
            <option value="">Todas as equipes</option>
            {EQUIPE_OPTIONS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </div>
        {isAdmin && (
          <button onClick={onOpenForm}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Nova Férias
          </button>
        )}
      </div>

      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <CalendarDays className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum registro de férias</h3>
          <p className="text-sm text-graphite-400 dark:text-graphite-500">Clique em "Nova Férias" para cadastrar.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map(f => {
            const b = bombeiros.find(x => x.id === f.funcionarioId);
            return (
              <div key={f.id} className="rounded-2xl border border-graphite-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-border-dark dark:bg-surface-card">
                <button onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white shadow-sm">
                    {b?.foto ? (
                      <img src={b.foto} alt="" className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-graphite-900 dark:text-graphite-100 truncate">{f.funcionarioNome}</p>
                    <div className="flex items-center gap-3 text-xs text-graphite-500 dark:text-graphite-400">
                      <span className="rounded-full bg-graphite-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-surface-hover">{b?.equipe}</span>
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
                  <div className="border-t border-graphite-200 px-5 py-4 dark:border-border-dark">
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
                    {f.substitutoNome && (
                      <div className="mt-3 rounded-lg border border-aviation-200 bg-aviation-50 p-3 dark:border-aviation-800 dark:bg-aviation-900/20">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-aviation-500">Substituição</p>
                        <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100">
                          {f.substitutoNome}
                          {f.funcaoSubstituicao && (
                            <span className="ml-2 text-xs text-graphite-500">
                              — {FUNCOES_SUBSTITUICAO.find(x => x.value === f.funcaoSubstituicao)?.label}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    {f.observacoes && (
                      <div className="mt-3">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Observações</p>
                        <p className="text-sm text-graphite-700 dark:text-graphite-300">{f.observacoes}</p>
                      </div>
                    )}
                    {isAdmin && (
                      <div className="mt-4 flex items-center gap-2">
                        <button onClick={() => onEdit(f)}
                          className="flex items-center gap-1 rounded-lg bg-graphite-100 px-3 py-1.5 text-xs font-medium text-graphite-700 transition-colors hover:bg-graphite-200 dark:bg-surface-hover dark:text-graphite-300">
                          <Pencil className="h-3.5 w-3.5" /> Editar
                        </button>
                        <button onClick={() => setConfirmDelete(f.id)}
                          className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-alert-red transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">
                          <Trash2 className="h-3.5 w-3.5" /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusão</h3>
            <p className="mb-6 text-sm text-graphite-500 dark:text-graphite-400">Tem certeza que deseja excluir este registro de férias?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">Cancelar</button>
              <button onClick={() => handleConfirmDelete(confirmDelete)}
                className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98]">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────── Tab: Escala por Equipe ───────── */

function EscalaEquipe({ ferias }: { ferias: Ferias[] }) {
  const [equipeSel, setEquipeSel] = useState<Equipe>('Alfa');
  const [anoSel, setAnoSel] = useState(new Date().getFullYear().toString());

  const bombeiros = useMemo(() => listarAtivos(), []);
  const membrosEquipe = useMemo(() =>
    bombeiros.filter(b => b.equipe === equipeSel),
    [bombeiros, equipeSel]
  );

  const feriasEquipe = useMemo(() => {
    const ids = new Set(membrosEquipe.map(b => b.id));
    return ferias.filter(f => ids.has(f.funcionarioId) && f.periodo === anoSel);
  }, [ferias, membrosEquipe, anoSel]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select value={equipeSel} onChange={e => setEquipeSel(e.target.value as Equipe)}
          className="rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
          {EQUIPE_OPTIONS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
        <select value={anoSel} onChange={e => setAnoSel(e.target.value)}
          className="rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
          {getAnos().map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {membrosEquipe.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <Users className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum membro nesta equipe</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {membrosEquipe.map(m => {
            const feriasMembro = feriasEquipe.filter(f => f.funcionarioId === m.id);
            return (
              <div key={m.id} className="rounded-2xl border border-graphite-200 bg-white p-4 shadow-sm dark:border-border-dark dark:bg-surface-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white shadow-sm">
                    {m.foto ? (
                      <img src={m.foto} alt="" className="h-full w-full rounded-xl object-cover" />
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-graphite-900 dark:text-graphite-100">{m.nomeCompleto}</p>
                    <p className="text-xs text-graphite-500 dark:text-graphite-400">{m.cargo} — {m.turno}</p>
                  </div>
                </div>
                {feriasMembro.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {feriasMembro.map(f => (
                      <div key={f.id} className="flex items-center gap-3 rounded-lg bg-graphite-50 px-3 py-2 dark:bg-surface-hover">
                        <Calendar className="h-4 w-4 text-graphite-400" />
                        <span className="text-sm text-graphite-700 dark:text-graphite-300">
                          {new Date(f.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} — {new Date(f.dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-xs text-graphite-500">{f.dias} dias</span>
                        <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_FERIAS_COLORS[f.status]}`}>
                          {f.status}
                        </span>
                        {f.substitutoNome && (
                          <span className="text-xs text-aviation-600 dark:text-aviation-400">
                            Sub: {f.substitutoNome}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-graphite-400 dark:text-graphite-500">Nenhuma férias registrada em {anoSel}.</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ───────── Tab: Substituições ───────── */

function SubstituicoesTab({ ferias }: { ferias: Ferias[] }) {
  const [equipeSel, setEquipeSel] = useState<Equipe>('Alfa');
  const [substituicoes, setSubstituicoes] = useState<SubstituicaoAtiva[]>([]);
  const [formFeriasId, setFormFeriasId] = useState('');
  const [formSubstitutoId, setFormSubstitutoId] = useState('');
  const [formFuncao, setFormFuncao] = useState<Cargo | ''>('');

  const bombeiros = useMemo(() => listarAtivos(), []);
  const membrosEquipe = useMemo(() =>
    bombeiros.filter(b => b.equipe === equipeSel),
    [bombeiros, equipeSel]
  );

  function carregar() { setSubstituicoes(listarSubstituicoes()); }
  useEffect(() => { carregar(); }, []);

  const feriasEquipe = useMemo(() => {
    const ids = new Set(membrosEquipe.map(b => b.id));
    const agora = new Date().toISOString().slice(0, 10);
    return ferias.filter(f =>
      ids.has(f.funcionarioId) &&
      (f.status === 'Programadas' || f.status === 'Em Gozo') &&
      f.dataFim >= agora
    );
  }, [ferias, membrosEquipe]);

  const substituicaoSel = formFeriasId
    ? substituicoes.find(s => s.feriasId === formFeriasId)
    : null;

  function handleSalvar() {
    const feriasItem = ferias.find(f => f.id === formFeriasId);
    const sub = bombeiros.find(b => b.id === formSubstitutoId);
    if (!feriasItem || !sub) return;

    if (substituicaoSel) {
      encerrarSubstituicao(substituicaoSel.id);
    }

    criarSubstituicao({
      feriasId: formFeriasId,
      funcionarioId: feriasItem.funcionarioId,
      funcionarioNome: feriasItem.funcionarioNome,
      substitutoId: formSubstitutoId,
      substitutoNome: sub.nomeCompleto,
      funcaoSubstituicao: formFuncao,
      dataInicio: feriasItem.dataInicio,
      dataFim: feriasItem.dataFim,
    });

    carregar();
    setFormFeriasId('');
    setFormSubstitutoId('');
    setFormFuncao('');
  }

  function handleEncerrar(id: string) {
    encerrarSubstituicao(id);
    carregar();
  }

  const ativas = substituicoes.filter(s => {
    const ids = new Set(membrosEquipe.map(b => b.id));
    return s.ativa && (ids.has(s.funcionarioId) || ids.has(s.substitutoId));
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <select value={equipeSel} onChange={e => setEquipeSel(e.target.value as Equipe)}
          className="rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
          {EQUIPE_OPTIONS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
      </div>

      <div className="mb-6 rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
        <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Nova Substituição</h3>
        {feriasEquipe.length === 0 ? (
          <p className="text-sm text-graphite-400 dark:text-graphite-500">Nenhuma férias programada ou em gozo para esta equipe.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <label className={label}>Funcionário de Férias</label>
              <select value={formFeriasId} onChange={e => setFormFeriasId(e.target.value)} className={input}>
                <option value="">Selecione</option>
                {feriasEquipe.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.funcionarioNome} — {new Date(f.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} a {new Date(f.dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </option>
                ))}
              </select>
            </div>
            {formFeriasId && (
              <>
                <div>
                  <label className={label}>Substituto (mesma equipe)</label>
                  <select value={formSubstitutoId} onChange={e => setFormSubstitutoId(e.target.value)} className={input}>
                    <option value="">Selecione</option>
                    {membrosEquipe.filter(b => {
                      const feriasItem = ferias.find(f => f.id === formFeriasId);
                      return feriasItem ? b.id !== feriasItem.funcionarioId : true;
                    }).map(b => (
                      <option key={b.id} value={b.id}>{b.nomeCompleto} ({b.cargo})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label}>Função de Substituição</label>
                  <select value={formFuncao} onChange={e => setFormFuncao(e.target.value as Cargo || '')} className={input}>
                    <option value="">Nenhuma</option>
                    {FUNCOES_SUBSTITUICAO.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <button onClick={handleSalvar}
                  disabled={!formSubstitutoId}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl hover:from-aviation-500 hover:to-aviation-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
                  <Save className="h-4 w-4" /> Salvar Substituição
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {ativas.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-bold text-graphite-900 dark:text-graphite-100">Substituições Ativas</h3>
          <div className="space-y-2">
            {ativas.map(s => (
              <div key={s.id} className="flex items-center gap-4 rounded-2xl border border-graphite-200 bg-white px-5 py-4 shadow-sm dark:border-border-dark dark:bg-surface-card">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-graphite-400" />
                  <span className="text-sm font-medium text-graphite-900 dark:text-graphite-100">{s.funcionarioNome}</span>
                </div>
                <ArrowRightLeft className="h-4 w-4 text-aviation-500" />
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-aviation-500" />
                  <span className="text-sm font-medium text-graphite-900 dark:text-graphite-100">{s.substitutoNome}</span>
                  {s.funcaoSubstituicao && (
                    <span className="rounded-full bg-aviation-100 px-2 py-0.5 text-[10px] font-bold text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                      {FUNCOES_SUBSTITUICAO.find(f => f.value === s.funcaoSubstituicao)?.label}
                    </span>
                  )}
                </div>
                <span className="ml-auto text-xs text-graphite-500">
                  {new Date(s.dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} — {new Date(s.dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
                <button onClick={() => handleEncerrar(s.id)}
                  className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-alert-red transition-colors hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">
                  Encerrar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Tab: Alertas ───────── */

function AlertasTab({ ferias: _ferias }: { ferias: Ferias[] }) {
  const [filtroMeses, setFiltroMeses] = useState<3 | 6 | 12>(6);
  const [alertas, setAlertas] = useState<AlertaVencimento[]>([]);

  useEffect(() => {
    setAlertas(alertasVencimento(filtroMeses));
  }, [filtroMeses]);

  const corBarra = (nivel: AlertaVencimento['nivel']) => {
    switch (nivel) {
      case 'critico': return 'bg-red-500';
      case 'perigo': return 'bg-orange-500';
      case 'alerta': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const corFundo = (nivel: AlertaVencimento['nivel']) => {
    switch (nivel) {
      case 'critico': return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      case 'perigo': return 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20';
      case 'alerta': return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      default: return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-graphite-700 dark:text-graphite-300">Mostrar quem vence em até:</span>
        {[3, 6, 12].map(m => (
          <button key={m} onClick={() => setFiltroMeses(m as 3 | 6 | 12)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              filtroMeses === m
                ? 'bg-gradient-to-r from-aviation-600 to-aviation-700 text-white shadow-lg shadow-aviation-500/20'
                : 'border border-graphite-300 bg-white text-graphite-700 hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-300'
            }`}>
            {m} meses
          </button>
        ))}
      </div>

      {alertas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <AlertTriangle className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum alerta</h3>
          <p className="text-sm text-graphite-400 dark:text-graphite-500">Nenhum funcionário com férias vencendo em até {filtroMeses} meses.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alertas.map(a => (
            <div key={a.funcionarioId} className={`rounded-2xl border px-5 py-4 shadow-sm dark:bg-surface-card ${corFundo(a.nivel)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-graphite-900 dark:text-graphite-100">{a.funcionarioNome}</p>
                  <div className="flex items-center gap-3 text-xs text-graphite-500 dark:text-graphite-400">
                    <span className="rounded-full bg-graphite-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-surface-hover">{a.equipe}</span>
                    <span>Admissão: {new Date(a.dataAdmissao + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-graphite-900 dark:text-graphite-100">{a.diasParaVencer}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">dias restantes</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-graphite-200 dark:bg-graphite-700">
                <div className={`h-full rounded-full transition-all ${corBarra(a.nivel)}`}
                  style={{ width: `${Math.max(5, 100 - (a.diasParaVencer / (12 * 30)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── Página principal ───────── */

export function Ferias() {
  const { user, effectiveRole } = useAuth();
  const isAdmin = effectiveRole === 'admin_master' || effectiveRole === 'admin';

  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [tab, setTab] = useState<TabKey>('visao');
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState<Ferias | null>(null);

  function carregar() { setFerias(listarFerias()); }
  useEffect(() => { carregar(); }, []);

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
    carregar();
  }

  return (
    <PageContainer>
      <PageTitle icon={CalendarDays} title="Férias" />

      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-gradient-to-r from-aviation-600 to-aviation-700 text-white shadow-lg shadow-aviation-500/20'
                : 'border border-graphite-300 bg-white text-graphite-600 hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-400 dark:hover:bg-surface-hover'
            }`}>
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'visao' && (
        <VisaoGeral
          ferias={ferias}
          isAdmin={isAdmin}
          onEdit={f => { setEditando(f); setFormOpen(true); }}
          onDelete={handleDelete}
          onOpenForm={() => { setEditando(null); setFormOpen(true); }}
        />
      )}
      {tab === 'escala' && <EscalaEquipe ferias={ferias} />}
      {tab === 'substituicoes' && <SubstituicoesTab ferias={ferias} />}
      {tab === 'alertas' && <AlertasTab ferias={ferias} />}

      {formOpen && (
        <FeriasForm ferias={editando || undefined} onSave={handleSave}
          onCancel={() => { setFormOpen(false); setEditando(null); }} />
      )}
    </PageContainer>
  );
}
