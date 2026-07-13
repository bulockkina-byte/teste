import { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays, Plus, Search, Pencil, Trash2, X, Save, User,
  Calendar, Clock, ChevronDown, ChevronRight, Users, AlertTriangle,
   ArrowRightLeft, Check, Send, RotateCcw,
  BarChart3, FileText, CheckCircle2, XCircle,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarAtivos } from '../../services/bombeiroService';
import {
  calcularPeriodosAquisitivos, MESES, ABBR_CARGO,
  STATUS_ESCALA_COLORS, FUNCOES_SUBSTITUICAO,
} from '../../types/ferias';
import type {
  PeriodoAquisitivo, FeriasGozo, EscalaFerias, EscalaFeriasItem,
} from '../../types/ferias';
import type { Bombeiro, Cargo, Equipe } from '../../types/bombeiro';
import {
  listarFeriasGozo, criarFeriasGozo,
  listarEscalas, obterEscala, criarEscala,
  excluirEscala, enviarEscala, aprovarEscala, rejeitarEscala,
  listarItensEscala, criarItemEscala, atualizarItemEscala,
  excluirItemEscala,
} from '../../services/feriasService';

// ── Constants ─────────────────────────────────────────────────────────

const selectCls =
  'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:hover:border-graphite-500 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated dark:focus:ring-aviation-400/10 dark:scheme-dark';

const optionCls = 'dark:bg-graphite-700 dark:text-graphite-100';

const inputCls =
  'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:hover:border-graphite-500 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated dark:focus:ring-aviation-400/10 dark:scheme-dark';

const labelCls = 'block mb-1.5 text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400';

const PERIODO_STATUS_COLORS: Record<string, string> = {
  'Nao Adquirido': 'bg-graphite-100 text-graphite-600 dark:bg-graphite-700 dark:text-graphite-300',
  'Disponivel': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  'Em Gozo': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  'Gozado': 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  'Vencido': 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

type PeriodoView = PeriodoAquisitivo & { gozo: FeriasGozo | null };

// ── Helpers ───────────────────────────────────────────────────────────

function calcDias(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  const d1 = new Date(inicio);
  const d2 = new Date(fim);
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function fmt(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
}

function getAnos(): number[] {
  const ano = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => ano - 2 + i);
}

function buildPeriodos(b: Bombeiro, gozos: FeriasGozo[]): PeriodoView[] {
  const periodos = calcularPeriodosAquisitivos(b.dataAdmissao);
  const gList = gozos.filter(g => g.funcionarioId === b.id);
  return periodos.map(p => {
    const gozo = gList.find(g => g.periodoNumero === p.numero);
    if (gozo) {
      let status: PeriodoAquisitivo['status'];
      switch (gozo.status) {
        case 'Gozadas': status = 'Gozado'; break;
        case 'Em Gozo': status = 'Em Gozo'; break;
        default: status = 'Em Gozo';
      }
      return { ...p, status, gozo };
    }
    return { ...p, gozo: null };
  });
}

function monthStart(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function monthEnd(year: number, month: number): string {
  const d = new Date(year, month, 0);
  return d.toISOString().split('T')[0];
}

// ── PeriodoCard ───────────────────────────────────────────────────────

function PeriodoCard({
  periodo, onSave, saving,
}: {
  periodo: PeriodoView;
  onSave: (p: PeriodoAquisitivo, dIni: string, dFim: string) => Promise<void>;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [dIni, setDIni] = useState('');
  const [dFim, setDFim] = useState('');

  const statusLabel =
    periodo.gozo
      ? periodo.gozo.status === 'Gozadas' ? 'Gozado' : 'Em Gozo'
      : periodo.status;

  const statusColor = PERIODO_STATUS_COLORS[statusLabel] || '';

  function autoFim(ini: string) {
    if (!ini) return;
    const d = new Date(ini);
    d.setDate(d.getDate() + 29);
    setDFim(d.toISOString().split('T')[0]);
  }

  async function handleSave() {
    await onSave(periodo, dIni, dFim);
    setEditing(false);
    setDIni('');
    setDFim('');
  }

  return (
    <div className="rounded-xl border border-graphite-200 p-4 dark:border-border-dark dark:bg-surface-hover">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">
            Período {periodo.numero}
          </p>
          <p className="text-xs text-graphite-500 dark:text-graphite-400">
            {fmt(periodo.dataInicio)} — {fmt(periodo.dataFim)}
          </p>
          <p className="text-[10px] text-graphite-400 dark:text-graphite-500">
            Vencimento: {fmt(periodo.dataVencimento)} · {periodo.diasDireito} dias
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusColor}`}>
          {statusLabel}
        </span>
      </div>

      {periodo.gozo && (
        <div className="mt-3 rounded-lg border border-aviation-200 bg-aviation-50 p-3 dark:border-aviation-800 dark:bg-aviation-900/20">
          <p className="text-xs font-semibold text-aviation-700 dark:text-aviation-300">
            Gozo: {fmt(periodo.gozo.dataInicio)} — {fmt(periodo.gozo.dataFim)} ({periodo.gozo.dias} dias)
          </p>
          {periodo.gozo.substitutoNome && (
            <p className="text-xs text-graphite-600 dark:text-graphite-400">
              Substituto: {periodo.gozo.substitutoNome}
              {periodo.gozo.funcaoSubstituicao ? ` (${periodo.gozo.funcaoSubstituicao})` : ''}
            </p>
          )}
          <p className="text-[10px] text-graphite-400 dark:text-graphite-500">
            Modificado por: {periodo.gozo.modificadoPor}{periodo.gozo.bloqueado ? ' · Bloqueado' : ''}
          </p>
        </div>
      )}

      {!periodo.gozo && periodo.status === 'Disponivel' && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="mt-3 flex items-center gap-1 rounded-lg bg-aviation-100 px-3 py-1.5 text-xs font-medium text-aviation-700 transition-colors hover:bg-aviation-200 dark:bg-aviation-900/30 dark:text-aviation-300 dark:hover:bg-aviation-900/50"
        >
          <CalendarDays className="h-3.5 w-3.5" /> Preencher Gozo
        </button>
      )}

      {editing && (
        <div className="mt-3 space-y-3 rounded-lg border border-graphite-200 bg-white p-3 dark:border-border-dark dark:bg-surface-card">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Data Início</label>
              <input
                type="date"
                value={dIni}
                onChange={e => { setDIni(e.target.value); if (!dFim) autoFim(e.target.value); }}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Data Fim</label>
              <input type="date" value={dFim} onChange={e => setDFim(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={!dIni || !dFim || saving}
              className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => { setEditing(false); setDIni(''); setDFim(''); }}
              className="rounded-lg border border-graphite-300 bg-white px-3 py-1.5 text-xs font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab Bombeiros (Admin / Gerente) ──────────────────────────────────

function TabBombeiros() {
  const { user } = useAuth();
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [feriasGozo, setFeriasGozo] = useState<FeriasGozo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [b, g] = await Promise.all([listarAtivos(), listarFeriasGozo()]);
    setBombeiros(b);
    setFeriasGozo(g);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    if (!search) return bombeiros;
    const t = search.toLowerCase();
    return bombeiros.filter(b =>
      b.nomeCompleto.toLowerCase().includes(t) ||
      b.nomeGuerra.toLowerCase().includes(t) ||
      b.equipe.toLowerCase().includes(t) ||
      b.cargo.toLowerCase().includes(t)
    );
  }, [bombeiros, search]);

  const selectedBombeiro = bombeiros.find(b => b.id === selectedId);
  const selectedPeriodos = useMemo(() => {
    if (!selectedBombeiro) return [];
    return buildPeriodos(selectedBombeiro, feriasGozo);
  }, [selectedBombeiro, feriasGozo]);

  async function handleSaveGozo(periodo: PeriodoAquisitivo, dataInicio: string, dataFim: string) {
    if (!selectedBombeiro || !user) return;
    setSaving(true);
    const dias = calcDias(dataInicio, dataFim);
    await criarFeriasGozo({
      funcionarioId: selectedBombeiro.id,
      funcionarioNome: selectedBombeiro.nomeCompleto,
      equipe: selectedBombeiro.equipe,
      periodoNumero: periodo.numero,
      dataInicio,
      dataFim,
      dias,
      status: 'Programadas',
      substitutoId: '',
      substitutoNome: '',
      funcaoSubstituicao: '',
      observacoes: '',
      modificadoPor: user.username,
      bloqueado: true,
    });
    await loadData();
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pesquisar bombeiro..."
            className={`${inputCls} !pl-10`}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <Users className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
            Nenhum bombeiro encontrado
          </h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const isSelected = selectedId === b.id;
            const gozos = feriasGozo.filter(g => g.funcionarioId === b.id);
            const periodos = calcularPeriodosAquisitivos(b.dataAdmissao);
            const temGozado = periodos.some(p => {
              const g = gozos.find(x => x.periodoNumero === p.numero);
              return g?.status === 'Gozadas';
            });

            return (
              <div key={b.id}>
                <button
                  onClick={() => setSelectedId(isSelected ? null : b.id)}
                  className={`w-full rounded-2xl border p-4 text-left shadow-sm transition-all hover:shadow-md dark:bg-surface-card ${
                    isSelected
                      ? 'border-aviation-400 bg-aviation-50 dark:border-aviation-500 dark:bg-aviation-900/20'
                      : 'border-graphite-200 bg-white dark:border-border-dark'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white shadow-sm">
                      {b.foto ? (
                        <img src={b.foto} alt="" className="h-full w-full rounded-xl object-cover" />
                      ) : (
                        b.nomeGuerra.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-graphite-900 dark:text-graphite-100 truncate">{b.nomeCompleto}</p>
                      <div className="flex items-center gap-2 text-xs text-graphite-500 dark:text-graphite-400">
                        <span className="rounded-full bg-graphite-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-surface-hover">{b.equipe}</span>
                        <span>{b.cargo}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmt(b.dataAdmissao)}</span>
                      </div>
                    </div>
                    {temGozado && (
                      <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                        Gozou
                      </span>
                    )}
                    {isSelected ? <ChevronDown className="h-5 w-5 shrink-0 text-graphite-400" /> : <ChevronRight className="h-5 w-5 shrink-0 text-graphite-400" />}
                  </div>
                </button>

                {isSelected && selectedBombeiro && (
                  <div className="mt-2 rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
                    <h4 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">
                      Períodos Aquisitivos — {selectedBombeiro.nomeCompleto}
                    </h4>
                    {selectedPeriodos.length === 0 ? (
                      <p className="text-sm text-graphite-400 dark:text-graphite-500">Nenhum período calculado.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedPeriodos.map(p => (
                          <PeriodoCard key={p.numero} periodo={p} onSave={handleSaveGozo} saving={saving} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab Aprovações (Admin / Gerente) ─────────────────────────────────

function TabAprovacoes() {
  const { user } = useAuth();
  const [escalas, setEscalas] = useState<EscalaFerias[]>([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [items, setItems] = useState<EscalaFeriasItem[]>([]);
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: string; obs: string } | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const [e, b] = await Promise.all([listarEscalas(), listarAtivos()]);
    setEscalas(e);
    setBombeiros(b);
    setLoading(false);
  }

  const filtradas = useMemo(() => {
    if (!filtroStatus) return escalas;
    return escalas.filter(e => e.status === filtroStatus);
  }, [escalas, filtroStatus]);

  async function handleExpand(escala: EscalaFerias) {
    if (expandedId === escala.id) {
      setExpandedId(null);
      setItems([]);
      return;
    }
    setExpandedId(escala.id);
    const it = await listarItensEscala(escala.id);
    setItems(it);
  }

  async function handleAprovar(id: string) {
    if (!user) return;
    await aprovarEscala(id, user.username, user.name);
    await loadData();
    setExpandedId(null);
  }

  async function handleRejeitar() {
    if (!rejectModal || !rejectModal.obs.trim()) return;
    await rejeitarEscala(rejectModal.id, rejectModal.obs);
    setRejectModal(null);
    await loadData();
    setExpandedId(null);
  }

  function getTeamMembers(equipe: string): Bombeiro[] {
    return bombeiros.filter(b => b.equipe === equipe);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-graphite-700 dark:text-graphite-300">Filtrar por status:</span>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className={`${selectCls} !w-auto`}
        >
          <option value="" className={optionCls}>Todos</option>
          {(['Rascunho', 'Enviado', 'Aprovado', 'Rejeitado'] as const).map(s => (
            <option key={s} value={s} className={optionCls}>{s}</option>
          ))}
        </select>
      </div>

      {filtradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <FileText className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhuma escala encontrada</h3>
          <p className="text-sm text-graphite-400 dark:text-graphite-500">As escalas enviadas pelos chefes aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(esc => (
            <div key={esc.id} className="rounded-2xl border border-graphite-200 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
              <button
                onClick={() => handleExpand(esc)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-graphite-900 dark:text-graphite-100">
                    Equipe {esc.equipe} — {esc.ano}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-graphite-500 dark:text-graphite-400">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {esc.chefeNome}</span>
                    {esc.enviadoEm && <span>Enviado: {fmt(esc.enviadoEm)}</span>}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_ESCALA_COLORS[esc.status]}`}>
                  {esc.status}
                </span>
                {expandedId === esc.id ? <ChevronDown className="h-4 w-4 shrink-0 text-graphite-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-graphite-400" />}
              </button>

              {expandedId === esc.id && (
                <div className="border-t border-graphite-200 px-5 py-5 dark:border-border-dark">
                  {esc.status === 'Rejeitado' && esc.observacoesRejeicao && (
                    <div className="mb-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">Observações da Rejeição</span>
                      </div>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">{esc.observacoesRejeicao}</p>
                    </div>
                  )}

                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl bg-graphite-50 p-3 dark:bg-surface-hover">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Equipe</p>
                      <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{esc.equipe}</p>
                    </div>
                    <div className="rounded-xl bg-graphite-50 p-3 dark:bg-surface-hover">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Ano</p>
                      <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{esc.ano}</p>
                    </div>
                    <div className="rounded-xl bg-graphite-50 p-3 dark:bg-surface-hover">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Chefe</p>
                      <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{esc.chefeNome}</p>
                    </div>
                    <div className="rounded-xl bg-graphite-50 p-3 dark:bg-surface-hover">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Itens</p>
                      <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{items.length}</p>
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div className="mb-4">
                      <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">
                        grade mensal
                      </h5>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12">
                        {MESES.map((mes, idx) => {
                          const mesNum = idx + 1;
                          const mesItems = items.filter(i => i.escalaId === esc.id && i.mes === mesNum);
                          return (
                            <div key={mesNum} className={`rounded-xl border p-2 text-center text-[10px] dark:border-border-dark ${
                              mesItems.length > 0
                                ? 'border-aviation-300 bg-aviation-50 dark:bg-aviation-900/20'
                                : 'border-graphite-200 bg-graphite-50 dark:bg-surface-hover'
                            }`}>
                              <p className="font-bold text-graphite-700 dark:text-graphite-300">{mes.substring(0, 3)}</p>
                              {mesItems.map(mi => (
                                <p key={mi.id} className="mt-1 text-graphite-600 dark:text-graphite-400 truncate" title={mi.funcionarioNome}>
                                  {mi.funcionarioNome.split(' ')[0]}
                                </p>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {items.length > 0 && items.filter(i => i.escalaId === esc.id).map(item => (
                    <div key={item.id} className="mb-3 rounded-xl border border-graphite-200 p-3 dark:border-border-dark dark:bg-surface-hover">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">
                            {MESES[item.mes - 1]} — {item.funcionarioNome}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-graphite-500 dark:text-graphite-400">
                            <span>{item.funcao}</span>
                            <span>{fmt(item.dataInicio)} — {fmt(item.dataFim)}</span>
                            <span>{item.dias} dias</span>
                          </div>
                        </div>
                      </div>
                      {(item.substitutoNome || item.feiristaNome) && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.substitutoNome && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-aviation-100 px-2 py-0.5 text-[10px] font-semibold text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                              <ArrowRightLeft className="h-3 w-3" /> Sub: {item.substitutoNome}
                              {item.funcaoSubstituicao ? ` (${ABBR_CARGO[item.funcaoSubstituicao as Cargo] || item.funcaoSubstituicao})` : ''}
                            </span>
                          )}
                          {item.feiristaNome && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                              <User className="h-3 w-3" /> Feirista: {item.feiristaNome}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="mb-4">
                    <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">
                      efetivo da equipe
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {getTeamMembers(esc.equipe).map(m => (
                        <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-graphite-100 px-2.5 py-1 text-[10px] font-semibold text-graphite-700 dark:bg-surface-hover dark:text-graphite-300">
                          {m.nomeGuerra} <span className="text-graphite-400 dark:text-graphite-500">({ABBR_CARGO[m.cargo] || m.cargo})</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {esc.status === 'Enviado' && (
                    <div className="flex items-center gap-3 border-t border-graphite-200 pt-4 dark:border-border-dark">
                      <button
                        onClick={() => handleAprovar(esc.id)}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl active:scale-[0.98]"
                      >
                        <Check className="h-4 w-4" /> Aprovar
                      </button>
                      <button
                        onClick={() => setRejectModal({ id: esc.id, obs: '' })}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl active:scale-[0.98]"
                      >
                        <XCircle className="h-4 w-4" /> Rejeitar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">Rejeitar Escala</h2>
              <button onClick={() => setRejectModal(null)} className="rounded-xl p-1 text-graphite-400 hover:bg-graphite-100 dark:hover:bg-surface-hover">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className={labelCls}>Observações *</label>
              <textarea
                value={rejectModal.obs}
                onChange={e => setRejectModal(m => m ? { ...m, obs: e.target.value } : null)}
                rows={4}
                placeholder="Descreva o motivo da rejeição..."
                className={`${inputCls} resize-none`}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectModal(null)}
                className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleRejeitar}
                disabled={!rejectModal.obs.trim()}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl disabled:opacity-50 active:scale-[0.98]"
              >
                <XCircle className="h-4 w-4" /> Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab Estatísticas (Admin / Gerente) ───────────────────────────────

function TabEstatisticas() {
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [feriasGozo, setFeriasGozo] = useState<FeriasGozo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [b, g] = await Promise.all([listarAtivos(), listarFeriasGozo()]);
      setBombeiros(b);
      setFeriasGozo(g);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    let comDireito = 0;
    let jaTiraram = 0;
    let naoAdquiriram = 0;
    let vencidas = 0;

    const jaTiraramSet = new Set<string>();
    const vencidasMap = new Map<string, number>();

    for (const b of bombeiros) {
      const periodos = calcularPeriodosAquisitivos(b.dataAdmissao);
      if (periodos.length === 0) {
        naoAdquiriram++;
        continue;
      }

      const gozos = feriasGozo.filter(g => g.funcionarioId === b.id);
      let hasDisponivel = false;

      for (const p of periodos) {
        const gozo = gozos.find(g => g.periodoNumero === p.numero);
        if (gozo) {
          if (gozo.status === 'Gozadas') {
            const gozoYear = new Date(gozo.dataInicio).getFullYear();
            if (gozoYear === anoAtual) jaTiraramSet.add(b.id);
          }
        } else if (p.status === 'Disponivel') {
          hasDisponivel = true;
        } else if (p.status === 'Vencido') {
          vencidasMap.set(b.id, (vencidasMap.get(b.id) || 0) + 1);
        }
      }

      if (hasDisponivel) comDireito++;
    }

    jaTiraram = jaTiraramSet.size;
    for (const [, count] of vencidasMap) {
      if (count >= 2) vencidas++;
    }

    const teams = ['Alfa', 'Bravo', 'Charlie', 'Delta'] as Equipe[];
    const mediaPorEquipe = teams.map(eq => {
      const members = bombeiros.filter(b => b.equipe === eq);
      const ids = new Set(members.map(b => b.id));
      const gozosEquipe = feriasGozo.filter(g => ids.has(g.funcionarioId) && g.status === 'Gozadas');
      const totalDias = gozosEquipe.reduce((sum, g) => sum + g.dias, 0);
      return { equipe: eq, media: members.length > 0 ? Math.round(totalDias / members.length) : 0 };
    });

    return { comDireito, jaTiraram, naoAdquiriram, vencidas, total: bombeiros.length, mediaPorEquipe };
  }, [bombeiros, feriasGozo]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" />
      </div>
    );
  }

  const cards = [
    { label: 'Com Direito', value: stats.comDireito, icon: Check, color: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', val: 'text-blue-700 dark:text-blue-300' },
    { label: 'Ja Tiraram', value: stats.jaTiraram, icon: CheckCircle2, color: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', val: 'text-green-700 dark:text-green-300' },
    { label: 'Nao Adquiriram', value: stats.naoAdquiriram, icon: Clock, color: 'border-graphite-200 bg-graphite-100 dark:border-graphite-600 dark:bg-graphite-700/20', text: 'text-graphite-500 dark:text-graphite-400', val: 'text-graphite-700 dark:text-graphite-200' },
    { label: 'Vencidas (2+)', value: stats.vencidas, icon: AlertTriangle, color: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20', text: 'text-red-500 dark:text-red-400', val: 'text-red-700 dark:text-red-300' },
  ];

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className={`rounded-2xl border p-4 shadow-sm ${c.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`h-4 w-4 ${c.text}`} />
              <p className={`text-[10px] font-bold uppercase tracking-wider ${c.text}`}>{c.label}</p>
            </div>
            <p className={`text-3xl font-black ${c.val}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />
          <h3 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">Resumo Geral</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-graphite-50 p-3 dark:bg-surface-hover">
            <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Total de Ativos</p>
            <p className="text-2xl font-black text-graphite-900 dark:text-graphite-100">{stats.total}</p>
          </div>
          <div className="rounded-xl bg-graphite-50 p-3 dark:bg-surface-hover">
            <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Com Direito</p>
            <p className="text-2xl font-black text-graphite-900 dark:text-graphite-100">{stats.comDireito}</p>
          </div>
          <div className="rounded-xl bg-graphite-50 p-3 dark:bg-surface-hover">
            <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Nao Adquiriram</p>
            <p className="text-2xl font-black text-graphite-900 dark:text-graphite-100">{stats.naoAdquiriram}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />
          <h3 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">Media de Dias Gozados por Equipe</h3>
        </div>
        <div className="space-y-3">
          {stats.mediaPorEquipe.map(m => (
            <div key={m.equipe} className="flex items-center gap-4">
              <span className="w-20 text-sm font-semibold text-graphite-700 dark:text-graphite-300">{m.equipe}</span>
              <div className="flex-1 h-4 overflow-hidden rounded-full bg-graphite-100 dark:bg-graphite-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-aviation-500 to-aviation-600 transition-all"
                  style={{ width: `${Math.min(100, (m.media / 30) * 100)}%` }}
                />
              </div>
              <span className="w-16 text-right text-sm font-bold text-graphite-900 dark:text-graphite-100">{m.media} dias</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tab Escala Anual (Chefe de Equipe) ───────────────────────────────

function TabEscalaAnual() {
  const { user } = useAuth();
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [myBombeiro, setMyBombeiro] = useState<Bombeiro | null>(null);
  const [escala, setEscala] = useState<EscalaFerias | null>(null);
  const [itens, setItens] = useState<EscalaFeriasItem[]>([]);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [formFuncId, setFormFuncId] = useState('');
  const [formSubId, setFormSubId] = useState('');
  const [formFuncaoSub, setFormFuncaoSub] = useState<Cargo | ''>('');
  const [formFeirista, setFormFeirista] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const teamMembers = useMemo(
    () => myBombeiro ? bombeiros.filter(b => b.equipe === myBombeiro.equipe) : [],
    [bombeiros, myBombeiro]
  );

  useEffect(() => {
    (async () => {
      const all = await listarAtivos();
      setBombeiros(all);
      if (user) {
        const me = all.find(b => b.nomeCompleto === user.name);
        setMyBombeiro(me || null);
      }
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (!myBombeiro) return;
    (async () => {
      const escs = await listarEscalas(myBombeiro.equipe, ano);
      if (escs.length > 0) {
        const e = escs[0];
        setEscala(e);
        const it = await listarItensEscala(e.id);
        setItens(it);
      } else {
        setEscala(null);
        setItens([]);
      }
      setEditingMonth(null);
    })();
  }, [myBombeiro, ano]);

  async function handleCreateEscala() {
    if (!myBombeiro || !user) return;
    setSaving(true);
    const e = await criarEscala({
      equipe: myBombeiro.equipe,
      ano,
      chefeId: myBombeiro.id,
      chefeNome: user.name,
      status: 'Rascunho',
      observacoesRejeicao: '',
      aprovadoPor: '',
      aprovadoPorNome: '',
      aprovadoEm: '',
      enviadoEm: '',
    });
    setEscala(e);
    setSaving(false);
  }

  async function handleSaveItem(mes: number) {
    if (!escala || !user) return;
    const member = teamMembers.find(b => b.id === formFuncId);
    const sub = teamMembers.find(b => b.id === formSubId);

    const existing = itens.find(i => i.escalaId === escala.id && i.mes === mes);

    const data: Omit<EscalaFeriasItem, 'id' | 'createdAt'> = {
      escalaId: escala.id,
      mes,
      funcionarioId: formFuncId,
      funcionarioNome: member?.nomeCompleto || '',
      funcao: member?.cargo || 'BA-2',
      dias: 30,
      dataInicio: monthStart(ano, mes),
      dataFim: monthEnd(ano, mes),
      substitutoId: formSubId,
      substitutoNome: sub?.nomeCompleto || '',
      funcaoSubstituicao: formFuncaoSub,
      feiristaId: '',
      feiristaNome: formFeirista,
    };

    setSaving(true);
    if (existing) {
      await atualizarItemEscala(existing.id, data);
    } else {
      await criarItemEscala(data);
    }
    const it = await listarItensEscala(escala.id);
    setItens(it);
    setEditingMonth(null);
    resetForm();
    setSaving(false);
  }

  async function handleDeleteItem(mes: number) {
    if (!escala) return;
    const existing = itens.find(i => i.escalaId === escala.id && i.mes === mes);
    if (existing) {
      setSaving(true);
      await excluirItemEscala(existing.id);
      const it = await listarItensEscala(escala.id);
      setItens(it);
      setSaving(false);
    }
    setEditingMonth(null);
    resetForm();
  }

  async function handleSendApproval() {
    if (!escala) return;
    setSaving(true);
    await enviarEscala(escala.id);
    const e = await obterEscala(escala.id);
    setEscala(e);
    setSaving(false);
  }

  async function handleDeleteEscala() {
    if (!escala) return;
    setSaving(true);
    await excluirEscala(escala.id);
    setEscala(null);
    setItens([]);
    setConfirmDelete(false);
    setSaving(false);
  }

  async function handleAutoFill() {
    if (!escala || !myBombeiro) return;
    setSaving(true);

    const gozos = await listarFeriasGozo();
    const teamIds = new Set(teamMembers.map(m => m.id));
    const anoStr = ano.toString();

    const relevantGozos = gozos.filter(g =>
      teamIds.has(g.funcionarioId) &&
      g.dataInicio.startsWith(anoStr)
    );

    const gozosByMonth = new Map<number, FeriasGozo>();
    for (const g of relevantGozos) {
      const month = new Date(g.dataInicio + 'T00:00:00').getMonth() + 1;
      if (!gozosByMonth.has(month)) {
        gozosByMonth.set(month, g);
      }
    }

    for (const [month, gozo] of gozosByMonth) {
      const existingItem = itens.find(i => i.escalaId === escala.id && i.mes === month);
      if (!existingItem) {
        const member = teamMembers.find(m => m.id === gozo.funcionarioId);
        await criarItemEscala({
          escalaId: escala.id,
          mes: month,
          funcionarioId: gozo.funcionarioId,
          funcionarioNome: gozo.funcionarioNome,
          funcao: member?.cargo || 'BA-2',
          dias: gozo.dias,
          dataInicio: gozo.dataInicio,
          dataFim: gozo.dataFim,
          substitutoId: gozo.substitutoId || '',
          substitutoNome: gozo.substitutoNome || '',
          funcaoSubstituicao: gozo.funcaoSubstituicao || '',
          feiristaId: '',
          feiristaNome: '',
        });
      }
    }

    const it = await listarItensEscala(escala.id);
    setItens(it);
    setSaving(false);
  }

  function resetForm() {
    setFormFuncId('');
    setFormSubId('');
    setFormFuncaoSub('');
    setFormFeirista('');
  }

  function startEditMonth(mes: number) {
    const existing = itens.find(i => i.escalaId === escala?.id && i.mes === mes);
    if (existing) {
      setFormFuncId(existing.funcionarioId);
      setFormSubId(existing.substitutoId);
      setFormFuncaoSub(existing.funcaoSubstituicao as Cargo || '');
      setFormFeirista(existing.feiristaNome);
    } else {
      resetForm();
    }
    setEditingMonth(mes);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" />
      </div>
    );
  }

  if (!myBombeiro) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
        <AlertTriangle className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
        <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
          Registro de bombeiro nao encontrado
        </h3>
        <p className="text-sm text-graphite-400 dark:text-graphite-500">
          Nao foi possível vincular seu usuario a um bombeiro.
        </p>
      </div>
    );
  }

  const canEdit = escala?.status === 'Rascunho' || escala?.status === 'Rejeitado';
  const canDelete = escala?.status === 'Rascunho';
  const canSend = escala?.status === 'Rascunho' || escala?.status === 'Rejeitado';

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div>
          <label className={labelCls}>Ano</label>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className={`${selectCls} !w-auto`}>
            {getAnos().map(a => <option key={a} value={a} className={optionCls}>{a}</option>)}
          </select>
        </div>
        {escala && (
          <div className="flex items-center gap-2 self-end">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_ESCALA_COLORS[escala.status]}`}>
              {escala.status}
            </span>
            {escala.status === 'Aprovado' && escala.aprovadoPorNome && (
              <span className="text-xs text-graphite-500 dark:text-graphite-400">
                Aprovado por {escala.aprovadoPorNome} em {fmt(escala.aprovadoEm)}
              </span>
            )}
          </div>
        )}
      </div>

      {escala?.status === 'Rejeitado' && escala.observacoesRejeicao && (
        <div className="mb-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">Escalas Rejeitadas - Observacoes</span>
          </div>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">{escala.observacoesRejeicao}</p>
        </div>
      )}

      {!escala && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <CalendarDays className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
            Nenhuma escala para {ano}
          </h3>
          <p className="mb-4 text-sm text-graphite-400 dark:text-graphite-500">
            Equipe {myBombeiro.equipe}
          </p>
          <button
            onClick={handleCreateEscala}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Criar Escala Anual
          </button>
        </div>
      )}

      {escala && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {teamMembers.map(m => (
              <div key={m.id} className="rounded-xl border border-graphite-200 bg-white p-3 text-center shadow-sm dark:border-border-dark dark:bg-surface-card">
                <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-aviation-500 to-aviation-700 text-xs font-bold text-white">
                  {m.nomeGuerra.charAt(0)}
                </div>
                <p className="text-xs font-bold text-graphite-900 dark:text-graphite-100 truncate">{m.nomeGuerra}</p>
                <p className="text-[10px] text-graphite-400">{ABBR_CARGO[m.cargo] || m.cargo}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            {MESES.map((mes, idx) => {
              const mesNum = idx + 1;
              const item = itens.find(i => i.escalaId === escala.id && i.mes === mesNum);
              const isEditing = editingMonth === mesNum;

              return (
                <div key={mesNum} className={`rounded-2xl border p-4 transition-all dark:bg-surface-card ${
                  item ? 'border-aviation-200 bg-aviation-50/50 dark:border-aviation-800 dark:bg-aviation-900/10' : 'border-graphite-200 bg-white dark:border-border-dark'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="w-24 text-sm font-bold text-graphite-900 dark:text-graphite-100">{mes}</span>
                      {item ? (
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-graphite-800 dark:text-graphite-200 truncate">
                            {item.funcionarioNome}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-graphite-500 dark:text-graphite-400">
                            <span>{fmt(item.dataInicio)} — {fmt(item.dataFim)}</span>
                            {item.substitutoNome && (
                              <span className="text-aviation-600 dark:text-aviation-400">
                                Sub: {item.substitutoNome}
                              </span>
                            )}
                            {item.feiristaNome && (
                              <span className="text-orange-600 dark:text-orange-400">
                                Feirista: {item.feiristaNome}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-graphite-400 dark:text-graphite-500">Sem alocacao</span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEditMonth(mesNum)}
                          className="rounded-lg p-1.5 text-graphite-400 hover:bg-graphite-100 dark:hover:bg-surface-hover"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {item && (
                          <button
                            onClick={() => handleDeleteItem(mesNum)}
                            className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="mt-3 space-y-3 rounded-xl border border-graphite-200 bg-white p-4 dark:border-border-dark dark:bg-surface-hover">
                      <div>
                        <label className={labelCls}>Funcionario em Gozo *</label>
                        <select
                          value={formFuncId}
                          onChange={e => setFormFuncId(e.target.value)}
                          className={selectCls}
                        >
                          <option value="" className={optionCls}>Selecione</option>
                          {teamMembers.map(m => (
                            <option key={m.id} value={m.id} className={optionCls}>
                              {m.nomeCompleto} ({ABBR_CARGO[m.cargo] || m.cargo})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Data Inicio</label>
                          <input type="date" value={monthStart(ano, mesNum)} readOnly className={`${inputCls} cursor-not-allowed bg-graphite-50 dark:bg-surface-hover`} />
                        </div>
                        <div>
                          <label className={labelCls}>Data Fim</label>
                          <input type="date" value={monthEnd(ano, mesNum)} readOnly className={`${inputCls} cursor-not-allowed bg-graphite-50 dark:bg-surface-hover`} />
                        </div>
                      </div>

                      <div>
                        <label className={labelCls}>Substituto</label>
                        <select
                          value={formSubId}
                          onChange={e => setFormSubId(e.target.value)}
                          className={selectCls}
                        >
                          <option value="" className={optionCls}>Nenhum</option>
                          {teamMembers.filter(m => m.id !== formFuncId).map(m => (
                            <option key={m.id} value={m.id} className={optionCls}>
                              {m.nomeCompleto} ({ABBR_CARGO[m.cargo] || m.cargo})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelCls}>Funcao Substituicao</label>
                        <select
                          value={formFuncaoSub}
                          onChange={e => setFormFuncaoSub(e.target.value as Cargo || '')}
                          className={selectCls}
                        >
                          <option value="" className={optionCls}>Nenhuma</option>
                          {FUNCOES_SUBSTITUICAO.map(f => (
                            <option key={f.value} value={f.value} className={optionCls}>{f.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className={labelCls}>Nome Feirista</label>
                        <input
                          type="text"
                          value={formFeirista}
                          onChange={e => setFormFeirista(e.target.value)}
                          placeholder="Nome do feirista (se aplicavel)"
                          className={inputCls}
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveItem(mesNum)}
                          disabled={!formFuncId || saving}
                          className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50"
                        >
                          <Save className="h-3.5 w-3.5" /> {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          onClick={() => { setEditingMonth(null); resetForm(); }}
                          className="rounded-lg border border-graphite-300 bg-white px-3 py-1.5 text-xs font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {canEdit && (
              <>
                <button
                  onClick={handleAutoFill}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl border border-aviation-300 bg-aviation-50 px-4 py-2.5 text-sm font-medium text-aviation-700 transition-all hover:bg-aviation-100 dark:border-aviation-700 dark:bg-aviation-900/20 dark:text-aviation-300 dark:hover:bg-aviation-900/40"
                >
                  <RotateCcw className="h-4 w-4" /> Puxar Escala Automatica
                </button>
                {canSend && (
                  <button
                    onClick={handleSendApproval}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl active:scale-[0.98]"
                  >
                    <Send className="h-4 w-4" /> Enviar para Aprovacao
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition-all hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" /> Excluir Escala
                  </button>
                )}
              </>
            )}
          </div>
        </>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusao</h3>
            <p className="mb-6 text-sm text-graphite-500 dark:text-graphite-400">
              Tem certeza que deseja excluir esta escala? Todos os itens serao removidos.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteEscala}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl active:scale-[0.98]"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab Minha Equipe (Chefe) ─────────────────────────────────────────

function TabMinhaEquipe() {
  const { user } = useAuth();
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [feriasGozo, setFeriasGozo] = useState<FeriasGozo[]>([]);
  const [myBombeiro, setMyBombeiro] = useState<Bombeiro | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [all, gozos] = await Promise.all([listarAtivos(), listarFeriasGozo()]);
      setBombeiros(all);
      setFeriasGozo(gozos);
      if (user) {
        setMyBombeiro(all.find(b => b.nomeCompleto === user.name) || null);
      }
      setLoading(false);
    })();
  }, [user]);

  const teamMembers = useMemo(
    () => myBombeiro ? bombeiros.filter(b => b.equipe === myBombeiro.equipe) : [],
    [bombeiros, myBombeiro]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" />
      </div>
    );
  }

  if (!myBombeiro) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
        <AlertTriangle className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
        <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
          Registro de bombeiro nao encontrado
        </h3>
        <p className="text-sm text-graphite-400 dark:text-graphite-500">
          Nao foi possivel vincular seu usuario a um bombeiro.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />
        <h3 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">
          Equipe {myBombeiro.equipe} — {teamMembers.length} membros
        </h3>
      </div>

      <div className="space-y-3">
        {teamMembers.map(m => {
          const periodos = buildPeriodos(m, feriasGozo);
          return (
            <div key={m.id} className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white shadow-sm">
                  {m.foto ? (
                    <img src={m.foto} alt="" className="h-full w-full rounded-xl object-cover" />
                  ) : (
                    m.nomeGuerra.charAt(0)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-graphite-900 dark:text-graphite-100 truncate">{m.nomeCompleto}</p>
                  <div className="flex items-center gap-2 text-xs text-graphite-500 dark:text-graphite-400">
                    <span>{ABBR_CARGO[m.cargo] || m.cargo}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmt(m.dataAdmissao)}</span>
                  </div>
                </div>
              </div>

              {periodos.length === 0 ? (
                <p className="text-sm text-graphite-400 dark:text-graphite-500">Nenhum periodo calculado.</p>
              ) : (
                <div className="space-y-2">
                  {periodos.map(p => (
                    <div key={p.numero} className="flex items-center justify-between gap-3 rounded-xl border border-graphite-200 p-3 dark:border-border-dark dark:bg-surface-hover">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-graphite-900 dark:text-graphite-100">
                          Periodo {p.numero}: {fmt(p.dataInicio)} — {fmt(p.dataFim)}
                        </p>
                        <p className="text-[10px] text-graphite-400 dark:text-graphite-500">
                          Vence: {fmt(p.dataVencimento)} · {p.diasDireito} dias
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${PERIODO_STATUS_COLORS[p.status] || ''}`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {teamMembers.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
            <Users className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
            <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">
              Nenhum membro encontrado
            </h3>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pagina Principal ─────────────────────────────────────────────────

export function Ferias() {
  const { effectiveRole } = useAuth();
  const canManage = effectiveRole === 'admin_master' || effectiveRole === 'admin' || effectiveRole === 'gerente';

  const adminTabs = [
    { key: 'bombeiros', label: 'Bombeiros', icon: Users },
    { key: 'aprovacoes', label: 'Aprovacoes', icon: FileText },
    { key: 'estatisticas', label: 'Estatisticas', icon: BarChart3 },
  ] as const;

  const chefeTabs = [
    { key: 'escala', label: 'Escala Anual', icon: CalendarDays },
    { key: 'equipe', label: 'Minha Equipe', icon: Users },
  ] as const;

  const tabs = canManage ? adminTabs : chefeTabs;
  type TabKey = typeof tabs[number]['key'];
  const [tab, setTab] = useState<TabKey>(tabs[0].key);

  return (
    <PageContainer>
      <PageTitle icon={CalendarDays} title="Ferias" />

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
              tab === t.key
                ? 'bg-gradient-to-r from-aviation-600 to-aviation-700 text-white shadow-lg shadow-aviation-500/20'
                : 'border border-graphite-300 bg-white text-graphite-600 hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-400 dark:hover:bg-surface-hover'
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'bombeiros' && <TabBombeiros />}
      {tab === 'aprovacoes' && <TabAprovacoes />}
      {tab === 'estatisticas' && <TabEstatisticas />}
      {tab === 'escala' && <TabEscalaAnual />}
      {tab === 'equipe' && <TabMinhaEquipe />}
    </PageContainer>
  );
}

export default Ferias;
