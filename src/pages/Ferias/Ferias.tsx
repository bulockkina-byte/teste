import { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays, Plus, Search, Pencil, Trash2, X, Save, User,
  Calendar, Clock, ChevronDown, ChevronRight, Users, AlertTriangle,
  ArrowRightLeft, Check, Send,
  BarChart3, FileText, CheckCircle2, XCircle, Eye,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { useAuth } from '../../context/AuthContext';
import { listarAtivos } from '../../services/bombeiroService';
import {
  calcularPeriodosAquisitivos, MESES, ABBR_CARGO,
  STATUS_ESCALA_COLORS,
} from '../../types/ferias';
import type {
  PeriodoAquisitivo, FeriasGozo, EscalaFerias, EscalaFeriasItem,
} from '../../types/ferias';
import type { Bombeiro, Cargo, Equipe } from '../../types/bombeiro';
import {
  listarFeriasGozo, criarFeriasGozo, excluirFeriasGozo,
  listarEscalas, obterEscala, criarEscala,
  excluirEscala, enviarEscala, aprovarEscala, aprovarEscalaEGerarGozos, rejeitarEscala,
  listarItensEscala, criarItemEscala, atualizarItemEscala,
  excluirItemEscala, rejeitarItemEscala, aprovarItemEscala, enviarItemEscala,
} from '../../services/feriasService';

// -- Constants -------------------------------------------------------------------

const selectCls =
  'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:hover:border-graphite-500 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated dark:focus:ring-aviation-400/10 dark:scheme-dark';

const optionCls = 'dark:bg-graphite-700 dark:text-graphite-100';

const inputCls =
  'w-full rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm text-graphite-900 transition-all hover:border-graphite-400 focus:border-aviation-500 focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:hover:border-graphite-500 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated dark:focus:ring-aviation-400/10 dark:scheme-dark';

const labelCls = 'block mb-1.5 text-xs font-semibold uppercase tracking-wider text-graphite-500 dark:text-graphite-400';

const EQUIPES: Equipe[] = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Ferista'];

const PERIODO_STATUS_COLORS: Record<string, string> = {
  'Nao Adquirido': 'bg-graphite-100 text-graphite-600 dark:bg-graphite-700 dark:text-graphite-300',
  'Disponivel': 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  'Programadas': 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  'Em Gozo': 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  'Gozado': 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  'Vencido': 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

// -- Types -----------------------------------------------------------------------

type PeriodoView = PeriodoAquisitivo & { gozo: FeriasGozo | null };

interface DashboardStats {
  totalAtivos: number;
  comDireito: number;
  emGozo: number;
  planejadas: number;
  gozadas: number;
  paraVencer: number;
  vencidas: number;
}

interface TeamStatsRow {
  equipe: Equipe;
  total: number;
  emGozo: number;
  planejadas: number;
  disponivel: number;
  vencidas: number;
}

// -- Helpers ---------------------------------------------------------------------

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

// -- Dashboard Stats Calculation --------------------------------------------------

function calcularStats(bombeiros: Bombeiro[], feriasGozo: FeriasGozo[]): DashboardStats {
  const anoAtual = new Date().getFullYear();
  const comDireitoSet = new Set<string>();
  const emGozoSet = new Set<string>();
  const planejadasSet = new Set<string>();
  const gozadasSet = new Set<string>();
  const paraVencerSet = new Set<string>();
  const vencidasSet = new Set<string>();

  for (const b of bombeiros) {
    const periodos = calcularPeriodosAquisitivos(b.dataAdmissao);
    const gList = feriasGozo.filter(g => g.funcionarioId === b.id);

    for (const p of periodos) {
      const gozo = gList.find(g => g.periodoNumero === p.numero);
      if (gozo) {
        if (gozo.status === 'Em Gozo') emGozoSet.add(b.id);
        else if (gozo.status === 'Programadas') planejadasSet.add(b.id);
        else if (gozo.status === 'Gozadas') {
          const gozoYear = new Date(gozo.dataInicio + 'T00:00:00').getFullYear();
          if (gozoYear === anoAtual) gozadasSet.add(b.id);
        }
      } else {
        if (p.status === 'Disponivel') {
          comDireitoSet.add(b.id);
          paraVencerSet.add(b.id);
        } else if (p.status === 'Vencido') {
          vencidasSet.add(b.id);
        }
      }
    }
  }

  return {
    totalAtivos: bombeiros.length,
    comDireito: comDireitoSet.size,
    emGozo: emGozoSet.size,
    planejadas: planejadasSet.size,
    gozadas: gozadasSet.size,
    paraVencer: paraVencerSet.size,
    vencidas: vencidasSet.size,
  };
}

function calcularStatsPorEquipe(todos: Bombeiro[], feriasGozo: FeriasGozo[]): TeamStatsRow[] {
  return EQUIPES.map(eq => {
    const members = todos.filter(b => b.equipe === eq);
    const emGozoSet = new Set<string>();
    const planejadasSet = new Set<string>();
    const disponivelSet = new Set<string>();
    const vencidasSet = new Set<string>();

    for (const b of members) {
      const periodos = calcularPeriodosAquisitivos(b.dataAdmissao);
      const gList = feriasGozo.filter(g => g.funcionarioId === b.id);
      for (const p of periodos) {
        const gozo = gList.find(g => g.periodoNumero === p.numero);
        if (gozo) {
          if (gozo.status === 'Em Gozo') emGozoSet.add(b.id);
          else if (gozo.status === 'Programadas') planejadasSet.add(b.id);
        } else {
          if (p.status === 'Disponivel') disponivelSet.add(b.id);
          else if (p.status === 'Vencido') vencidasSet.add(b.id);
        }
      }
    }

    return {
      equipe: eq,
      total: members.length,
      emGozo: emGozoSet.size,
      planejadas: planejadasSet.size,
      disponivel: disponivelSet.size,
      vencidas: vencidasSet.size,
    };
  });
}

// -- DashboardFerias --------------------------------------------------------------

function DashboardFerias({ myEquipe }: { myEquipe?: string | null }) {
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

  const filtered = useMemo(
    () => (myEquipe ? bombeiros.filter(b => b.equipe === myEquipe) : bombeiros),
    [bombeiros, myEquipe],
  );

  const stats = useMemo(() => calcularStats(filtered, feriasGozo), [filtered, feriasGozo]);
  const teamStats = useMemo(() => calcularStatsPorEquipe(bombeiros, feriasGozo), [bombeiros, feriasGozo]);

  const teamMembers = useMemo(() => {
    if (!myEquipe) return [];
    return bombeiros
      .filter(b => b.equipe === myEquipe)
      .map(m => ({ ...m, periodos: buildPeriodos(m, feriasGozo) }));
  }, [bombeiros, feriasGozo, myEquipe]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" />
      </div>
    );
  }

  const showTeamBreakdown = !myEquipe;

  const statCardData = [
    { label: 'Total Ativos', value: stats.totalAtivos, icon: Users, cls: 'border-graphite-200 bg-white dark:border-graphite-600 dark:bg-surface-card', iconCls: 'text-graphite-500 dark:text-graphite-400', labelCls: 'text-graphite-500 dark:text-graphite-400', valueCls: 'text-graphite-900 dark:text-graphite-100' },
    { label: 'Com Direito', value: stats.comDireito, icon: Check, cls: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20', iconCls: 'text-blue-500 dark:text-blue-400', labelCls: 'text-blue-600 dark:text-blue-400', valueCls: 'text-blue-700 dark:text-blue-300' },
    { label: 'Em Gozo', value: stats.emGozo, icon: CalendarDays, cls: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20', iconCls: 'text-yellow-500 dark:text-yellow-400', labelCls: 'text-yellow-600 dark:text-yellow-400', valueCls: 'text-yellow-700 dark:text-yellow-300' },
    { label: 'Planejadas', value: stats.planejadas, icon: Clock, cls: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20', iconCls: 'text-purple-500 dark:text-purple-400', labelCls: 'text-purple-600 dark:text-purple-400', valueCls: 'text-purple-700 dark:text-purple-300' },
    { label: 'Gozadas', value: stats.gozadas, icon: CheckCircle2, cls: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20', iconCls: 'text-green-500 dark:text-green-400', labelCls: 'text-green-600 dark:text-green-400', valueCls: 'text-green-700 dark:text-green-300' },
    { label: 'Para Vencer', value: stats.paraVencer, icon: AlertTriangle, cls: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20', iconCls: 'text-orange-500 dark:text-orange-400', labelCls: 'text-orange-600 dark:text-orange-400', valueCls: 'text-orange-700 dark:text-orange-300' },
    { label: 'Vencidas', value: stats.vencidas, icon: XCircle, cls: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20', iconCls: 'text-red-500 dark:text-red-400', labelCls: 'text-red-600 dark:text-red-400', valueCls: 'text-red-700 dark:text-red-300' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {statCardData.map(c => (
          <div key={c.label} className={`rounded-2xl border p-4 shadow-sm transition-all ${c.cls}`}>
            <div className="flex items-center gap-2 mb-2">
              <c.icon className={`h-4 w-4 ${c.iconCls}`} />
              <p className={`text-[10px] font-bold uppercase tracking-wider ${c.labelCls}`}>{c.label}</p>
            </div>
            <p className={`text-3xl font-black ${c.valueCls}`}>{c.value}</p>
          </div>
        ))}
      </div>

      {showTeamBreakdown && (
        <div className="rounded-2xl border border-graphite-200 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
          <div className="flex items-center gap-2 border-b border-graphite-200 px-5 py-4 dark:border-border-dark">
            <BarChart3 className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />
            <h3 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">Resumo por Equipe</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-graphite-200 dark:border-border-dark">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Equipe</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Total</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Em Gozo</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Planejadas</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Disponivel</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Vencidas</th>
                </tr>
              </thead>
              <tbody>
                {teamStats.map(ts => (
                  <tr key={ts.equipe} className="border-b border-graphite-100 dark:border-border-dark last:border-0">
                    <td className="px-4 py-3 font-semibold text-graphite-900 dark:text-graphite-100">{ts.equipe}</td>
                    <td className="px-4 py-3 text-center font-bold text-graphite-700 dark:text-graphite-300">{ts.total}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-bold text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">{ts.emGozo}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">{ts.planejadas}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">{ts.disponivel}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700 dark:bg-red-900/20 dark:text-red-400">{ts.vencidas}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!showTeamBreakdown && myEquipe && (
        <div className="rounded-2xl border border-graphite-200 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
          <div className="flex items-center gap-2 border-b border-graphite-200 px-5 py-4 dark:border-border-dark">
            <Users className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />
            <h3 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">
              Equipe {myEquipe} - {teamMembers.length} membros
            </h3>
          </div>
          <div className="p-5">
            {teamMembers.length === 0 ? (
              <p className="text-sm text-graphite-400 dark:text-graphite-500">Nenhum membro encontrado.</p>
            ) : (
              <div className="space-y-3">
                {teamMembers.map(m => (
                  <div key={m.id} className="flex items-center gap-3 rounded-xl border border-graphite-200 p-3 dark:border-border-dark dark:bg-surface-hover">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-aviation-500 to-aviation-700 text-xs font-bold text-white">
                      {m.foto ? <img src={m.foto} alt="" className="h-full w-full rounded-lg object-cover" /> : m.nomeGuerra.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-graphite-900 dark:text-graphite-100 truncate">{m.nomeGuerra}</p>
                      <p className="text-[10px] text-graphite-400 dark:text-graphite-500">{ABBR_CARGO[m.cargo] || m.cargo}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {m.periodos.map(p => {
                        const label = p.gozo
                          ? p.gozo.status === 'Gozadas' ? 'G' : p.gozo.status === 'Em Gozo' ? 'EG' : 'PR'
                          : p.status === 'Disponivel' ? 'D' : p.status === 'Vencido' ? 'V' : '?';
                        const color = p.gozo
                          ? p.gozo.status === 'Gozadas'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : p.gozo.status === 'Em Gozo'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                          : p.status === 'Disponivel'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
                        return (
                          <span
                            key={p.numero}
                            title={`Periodo ${p.numero}: ${p.gozo ? p.gozo.status : p.status}`}
                            className={`inline-flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold ${color}`}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// -- PeriodoCard -----------------------------------------------------------------

function PeriodoCard({
  periodo, onSave, onDelete, saving,
}: {
  periodo: PeriodoView;
  onSave: (p: PeriodoAquisitivo, dIni: string, dFim: string) => Promise<void>;
  onDelete?: (gozoId: string) => Promise<void>;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [dIni, setDIni] = useState('');
  const [dFim, setDFim] = useState('');

  const statusLabel = periodo.gozo
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
          <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">Periodo {periodo.numero}</p>
          <p className="text-xs text-graphite-500 dark:text-graphite-400">{fmt(periodo.dataInicio)} - {fmt(periodo.dataFim)}</p>
          <p className="text-[10px] text-graphite-400 dark:text-graphite-500">Vencimento: {fmt(periodo.dataVencimento)} · {periodo.diasDireito} dias</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusColor}`}>{statusLabel}</span>
      </div>

      {periodo.gozo && (
        <div className="mt-3 rounded-lg border border-aviation-200 bg-aviation-50 p-3 dark:border-aviation-800 dark:bg-aviation-900/20">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-aviation-700 dark:text-aviation-300">
                Gozo: {fmt(periodo.gozo.dataInicio)} - {fmt(periodo.gozo.dataFim)} ({periodo.gozo.dias} dias)
              </p>
              {periodo.gozo.substitutoNome && (
                <p className="text-xs text-graphite-600 dark:text-graphite-400">
                  Substituto: {periodo.gozo.substitutoNome}{periodo.gozo.funcaoSubstituicao ? ` (${periodo.gozo.funcaoSubstituicao})` : ''}
                </p>
              )}
              <p className="text-[10px] text-graphite-400 dark:text-graphite-500">
                Modificado por: {periodo.gozo.modificadoPor}{periodo.gozo.bloqueado ? ' · Bloqueado' : ''}
              </p>
            </div>
            {onDelete && (
              <button onClick={() => onDelete(periodo.gozo!.id)}
                className="shrink-0 rounded-xl p-1.5 text-alert-red transition-all hover:bg-red-50 dark:hover:bg-red-900/20"
                title="Excluir férias">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {!periodo.gozo && periodo.status === 'Vencido' && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="mt-3 flex items-center gap-1 rounded-lg bg-aviation-100 px-3 py-1.5 text-xs font-medium text-aviation-700 transition-colors hover:bg-aviation-200 dark:bg-aviation-900/30 dark:text-aviation-300 dark:hover:bg-aviation-900/50"
        >
          <CalendarDays className="h-3.5 w-3.5" /> Preencher Gozo
        </button>
      )}
      {!periodo.gozo && periodo.status === 'Disponivel' && !editing && (
        <p className="mt-3 text-[10px] text-graphite-400 dark:text-graphite-500 italic">
          Aguardando aprovação da escala anual
        </p>
      )}

      {editing && (
        <div className="mt-3 space-y-3 rounded-lg border border-graphite-200 bg-white p-3 dark:border-border-dark dark:bg-surface-card">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Data Inicio</label>
              <input type="date" value={dIni} onChange={e => { setDIni(e.target.value); if (!dFim) autoFim(e.target.value); }} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Data Fim</label>
              <input type="date" value={dFim} onChange={e => setDFim(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!dIni || !dFim || saving} className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50">
              <Save className="h-3.5 w-3.5" /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => { setEditing(false); setDIni(''); setDFim(''); }} className="rounded-lg border border-graphite-300 bg-white px-3 py-1.5 text-xs font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-300">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Tab Bombeiros (Admin / Gerente) ---------------------------------------------

function TabBombeiros() {
  const { user } = useAuth();
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [feriasGozo, setFeriasGozo] = useState<FeriasGozo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');
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
    let lista = bombeiros;
    if (filterEquipe) lista = lista.filter(b => b.equipe === filterEquipe);
    if (!search) return lista;
    const t = search.toLowerCase();
    return lista.filter(b =>
      b.nomeCompleto.toLowerCase().includes(t) ||
      b.nomeGuerra.toLowerCase().includes(t) ||
      b.equipe.toLowerCase().includes(t) ||
      b.cargo.toLowerCase().includes(t)
    );
  }, [bombeiros, search, filterEquipe]);

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
      status: dataFim < new Date().toISOString().split('T')[0] ? 'Gozadas' : 'Programadas',
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
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar bombeiro..." className={`${inputCls} !pl-10`} />
        </div>
        <select value={filterEquipe} onChange={e => setFilterEquipe(e.target.value)}
          className="rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
          <option value="" className={optionCls}>Todas as Equipes</option>
          {['Alfa','Bravo','Charlie','Delta','Ferista','Embaixador'].map(eq => (
            <option key={eq} value={eq} className={optionCls}>{eq}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <Users className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum bombeiro encontrado</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const isSelected = selectedId === b.id;
            const gozos = feriasGozo.filter(g => g.funcionarioId === b.id);
            const periodos = calcularPeriodosAquisitivos(b.dataAdmissao);
            const temGozado = periodos.some(p => gozos.find(x => x.periodoNumero === p.numero)?.status === 'Gozadas');

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
                      {b.foto ? <img src={b.foto} alt="" className="h-full w-full rounded-xl object-cover" /> : b.nomeGuerra.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-graphite-900 dark:text-graphite-100 truncate">{b.nomeCompleto}</p>
                      <div className="flex items-center gap-2 text-xs text-graphite-500 dark:text-graphite-400">
                        <span className="rounded-full bg-graphite-100 px-2 py-0.5 text-[10px] font-semibold dark:bg-surface-hover">{b.equipe}</span>
                        <span>{b.cargo}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmt(b.dataAdmissao)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0">
                      {periodos.map(p => {
                        const label = p.gozo
                          ? p.gozo.status === 'Gozadas' ? 'G' : p.gozo.status === 'Em Gozo' ? 'EG' : 'PR'
                          : p.status === 'Disponivel' ? 'D' : p.status === 'Vencido' ? 'V' : '?';
                        const color = p.gozo
                          ? p.gozo.status === 'Gozadas'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                            : p.gozo.status === 'Em Gozo'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                              : 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                          : p.status === 'Disponivel'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
                        return (
                          <span key={p.numero} title={`Periodo ${p.numero}: ${p.gozo ? p.gozo.status : p.status}`} className={`inline-flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold ${color}`}>
                            {label}
                          </span>
                        );
                      })}
                    </div>
                    {isSelected ? <ChevronDown className="h-5 w-5 shrink-0 text-graphite-400" /> : <ChevronRight className="h-5 w-5 shrink-0 text-graphite-400" />}
                  </div>
                </button>

                {isSelected && selectedBombeiro && (
                  <div className="mt-2 rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
                    <h4 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">
                      Periodos Aquisitivos - {selectedBombeiro.nomeCompleto}
                    </h4>
                    {selectedPeriodos.length === 0 ? (
                      <p className="text-sm text-graphite-400 dark:text-graphite-500">Nenhum período calculado.</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedPeriodos.map(p => (
                          <PeriodoCard key={p.numero} periodo={p} onSave={handleSaveGozo} onDelete={async (gozoId) => { await excluirFeriasGozo(gozoId); loadData(); }} saving={saving} />
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

// -- Tab Aprovacoes (Admin / Gerente) --------------------------------------------

function TabAprovacoes() {
  const { user } = useAuth();
  const [escalas, setEscalas] = useState<EscalaFerias[]>([]);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [items, setItems] = useState<EscalaFeriasItem[]>([]);
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ id: string; obs: string } | null>(null);
  const [itemRejectModal, setItemRejectModal] = useState<{ itemId: string; tipo: 'pessoa' | 'periodo' | 'substituto' | 'ferista' | 'geral'; obs: string } | null>(null);

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
    await aprovarEscalaEGerarGozos(id, user.username, user.name);
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

  async function handleItemReject() {
    if (!itemRejectModal || !itemRejectModal.obs.trim() || !user) return;
    await rejeitarItemEscala(itemRejectModal.itemId, itemRejectModal.obs, user.username);
    const it = await listarItensEscala(expandedId!);
    setItems(it);
    setItemRejectModal(null);
  }

  async function handleItemApprove(itemId: string) {
    await aprovarItemEscala(itemId);
    const it = await listarItensEscala(expandedId!);
    setItems(it);
  }

  function getTeamMembers(equipe: string): Bombeiro[] {
    return bombeiros.filter(b => b.equipe === equipe);
  }

  function getItemRejectLabel(tipo: string) {
    switch (tipo) {
      case 'pessoa': return 'Rejeitar pessoa';
      case 'periodo': return 'Rejeitar período';
      case 'substituto': return 'Rejeitar substituto';
      case 'ferista': return 'Rejeitar ferista';
      default: return 'Rejeitar item';
    }
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
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={`${selectCls} !w-auto`}>
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
          <p className="text-sm text-graphite-400 dark:text-graphite-500">As escalas enviadas pelos chefes aparecerao aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(esc => (
            <div key={esc.id} className="rounded-2xl border border-graphite-200 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
              <button onClick={() => handleExpand(esc)} className="flex w-full items-center gap-4 px-5 py-4 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-graphite-900 dark:text-graphite-100">Equipe {esc.equipe} - {esc.ano}</p>
                  <div className="flex items-center gap-2 text-xs text-graphite-500 dark:text-graphite-400">
                    <span className="flex items-center gap-1"><User className="h-3 w-3" /> {esc.chefeNome}</span>
                    {esc.enviadoEm && <span>Enviado: {fmt(esc.enviadoEm)}</span>}
                  </div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_ESCALA_COLORS[esc.status]}`}>{esc.status}</span>
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
                      <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{items.filter(i => !i.rejeitado).length} / {items.length}</p>
                    </div>
                  </div>

                  {items.length > 0 && (
                    <div className="mb-4">
                      <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Grade Mensal</h5>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12">
                        {MESES.map((mes, idx) => {
                          const mesNum = idx + 1;
                          const mesItems = items.filter(i => i.escalaId === esc.id && i.mes === mesNum);
                          return (
                            <div key={mesNum} className={`rounded-xl border p-2 text-center text-[10px] dark:border-border-dark ${mesItems.length > 0 ? (mesItems.some(i => i.rejeitado) ? 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20' : 'border-aviation-300 bg-aviation-50 dark:bg-aviation-900/20') : 'border-graphite-200 bg-graphite-50 dark:bg-surface-hover'}`}>
                              <p className="font-bold text-graphite-700 dark:text-graphite-300">{mes.substring(0, 3)}</p>
                              {mesItems.map(mi => (
                                <p key={mi.id} className={`mt-1 truncate ${mi.rejeitado ? 'text-red-500 line-through dark:text-red-400' : 'text-graphite-600 dark:text-graphite-400'}`} title={mi.funcionarioNome}>
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
                    <div key={item.id} className={`mb-3 rounded-xl border p-3 dark:bg-surface-hover ${item.rejeitado ? 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20' : 'border-graphite-200 dark:border-border-dark'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-bold ${item.rejeitado ? 'text-red-700 dark:text-red-300' : 'text-graphite-900 dark:text-graphite-100'}`}>
                            {MESES[item.mes - 1]} - {item.funcionarioNome}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-graphite-500 dark:text-graphite-400">
                            <span>{item.funcao}</span>
                            <span>{fmt(item.dataInicio)} - {fmt(item.dataFim)}</span>
                            <span>{item.dias} dias</span>
                          </div>
                        </div>
                        {esc.status === 'Enviado' && (
                          <div className="flex shrink-0 items-center gap-1">
                            {!item.rejeitado ? (
                              <>
                                <button onClick={() => setItemRejectModal({ itemId: item.id, tipo: 'pessoa', obs: '' })} className="rounded-lg px-2 py-1 text-[10px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" title="Rejeitar pessoa">
                                  Rejeitar
                                </button>
                              </>
                            ) : (
                              <button onClick={() => handleItemApprove(item.id)} className="rounded-lg px-2 py-1 text-[10px] font-medium text-green-600 transition-colors hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20">
                                Aprovar
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {item.rejeitado && item.motivoRejeicao && (
                        <div className="mt-2 rounded-lg border border-red-200 bg-red-100/50 px-3 py-2 dark:border-red-700 dark:bg-red-900/10">
                          <p className="text-[10px] font-bold text-red-600 dark:text-red-400">Rejeitado por {item.rejeitadoPor}:</p>
                          <p className="text-xs text-red-700 dark:text-red-300">{item.motivoRejeicao}</p>
                        </div>
                      )}

                      {(item.substitutoNome || item.feristaNome) && !item.rejeitado && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.substitutoNome && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-aviation-100 px-2 py-0.5 text-[10px] font-semibold text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                              <ArrowRightLeft className="h-3 w-3" /> Sub: {item.substitutoNome}
                              {item.funcaoSubstituicao ? ` (${ABBR_CARGO[item.funcaoSubstituicao as Cargo] || item.funcaoSubstituicao})` : ''}
                            </span>
                          )}
                          {item.feristaNome && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                              <User className="h-3 w-3" /> Ferista: {item.feristaNome}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="mb-4">
                    <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Efetivo da Equipe</h5>
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
                      <button onClick={() => handleAprovar(esc.id)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-600 to-green-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-green-500/20 transition-all hover:shadow-xl active:scale-[0.98]">
                        <Check className="h-4 w-4" /> Aprovar Tudo
                      </button>
                      <button onClick={() => setRejectModal({ id: esc.id, obs: '' })} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl active:scale-[0.98]">
                        <XCircle className="h-4 w-4" /> Rejeitar Tudo
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
              <label className={labelCls}>Observacoes *</label>
              <textarea
                value={rejectModal.obs}
                onChange={e => setRejectModal(m => m ? { ...m, obs: e.target.value } : null)}
                rows={4}
                placeholder="Descreva o motivo da rejeição..."
                className={`${inputCls} resize-none`}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setRejectModal(null)} className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                Cancelar
              </button>
              <button onClick={handleRejeitar} disabled={!rejectModal.obs.trim()} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl disabled:opacity-50 active:scale-[0.98]">
                <XCircle className="h-4 w-4" /> Rejeitar
              </button>
            </div>
          </div>
        </div>
      )}

      {itemRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">Rejeitar Item da Escala</h2>
              <button onClick={() => setItemRejectModal(null)} className="rounded-xl p-1 text-graphite-400 hover:bg-graphite-100 dark:hover:bg-surface-hover">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-4">
              <label className={labelCls}>O que deseja rejeitar?</label>
              <div className="flex flex-wrap gap-2">
                {([
                  { tipo: 'pessoa' as const, label: 'Pessoa', desc: 'Rejeitar apenas esta pessoa neste período' },
                  { tipo: 'periodo' as const, label: 'Período', desc: 'Rejeitar este período de férias' },
                  { tipo: 'substituto' as const, label: 'Substituto', desc: 'Rejeitar o substituto indicado' },
                  { tipo: 'ferista' as const, label: 'Ferista', desc: 'Rejeitar o ferista indicado' },
                ] as const).map(opt => (
                  <button key={opt.tipo} onClick={() => setItemRejectModal(m => m ? { ...m, tipo: opt.tipo } : null)}
                    className={`rounded-xl border px-3 py-2 text-left transition-all ${itemRejectModal.tipo === opt.tipo ? 'border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-900/20' : 'border-graphite-300 bg-white hover:border-graphite-400 dark:border-border-dark dark:bg-surface-card'}`}>
                    <p className={`text-sm font-bold ${itemRejectModal.tipo === opt.tipo ? 'text-red-700 dark:text-red-300' : 'text-graphite-900 dark:text-graphite-100'}`}>{opt.label}</p>
                    <p className="text-[10px] text-graphite-500 dark:text-graphite-400">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className={labelCls}>Motivo da rejeição *</label>
              <textarea
                value={itemRejectModal.obs}
                onChange={e => setItemRejectModal(m => m ? { ...m, obs: e.target.value } : null)}
                rows={3}
                placeholder={`Descreva o motivo para rejeitar ${getItemRejectLabel(itemRejectModal.tipo).toLowerCase()}...`}
                className={`${inputCls} resize-none`}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setItemRejectModal(null)} className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                Cancelar
              </button>
              <button onClick={handleItemReject} disabled={!itemRejectModal.obs.trim()} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl disabled:opacity-50 active:scale-[0.98]">
                <XCircle className="h-4 w-4" /> {getItemRejectLabel(itemRejectModal.tipo)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Tab Escala Geral (Admin / Gerente) ------------------------------------------

function TabEscalaGeral() {
  const { effectiveRole } = useAuth();
  const podeExcluir = effectiveRole === 'desenvolvedor' || effectiveRole === 'admin';
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [escalas, setEscalas] = useState<EscalaFerias[]>([]);
  const [itemsByEscala, setItemsByEscala] = useState<Map<string, EscalaFeriasItem[]>>(new Map());
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mes, setMes] = useState<number>(0);
  const [expandedEquipe, setExpandedEquipe] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteEscala, setConfirmDeleteEscala] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadData(); }, [ano, mes]);

  async function loadData() {
    setLoading(true);
    const [b, escalasList] = await Promise.all([listarAtivos(), listarEscalas(undefined, ano)]);
    setBombeiros(b);

    const itemsMap = new Map<string, EscalaFeriasItem[]>();
    await Promise.all(
      escalasList.map(async esc => {
        const it = await listarItensEscala(esc.id);
        itemsMap.set(esc.id, it);
      }),
    );

    setEscalas(escalasList);
    setItemsByEscala(itemsMap);
    setLoading(false);
  }

  const escalasByEquipe = useMemo(() => {
    const map = new Map<Equipe, EscalaFerias>();
    for (const esc of escalas) {
      if (!map.has(esc.equipe)) map.set(esc.equipe, esc);
    }
    return map;
  }, [escalas]);

  async function handleDeleteEscalaGeral(id: string) {
    try {
      setDeleting(true);
      await excluirEscala(id);
      setConfirmDeleteEscala(null);
      await loadData();
    } catch (err) {
      console.error('Erro ao excluir escala:', err);
      alert('Erro ao excluir escala: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setDeleting(false);
    }
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
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <div>
          <label className={labelCls}>Ano</label>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className={`${selectCls} !w-auto`}>
            {getAnos().map(a => <option key={a} value={a} className={optionCls}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Mês</label>
          <select value={mes} onChange={e => setMes(Number(e.target.value))} className={`${selectCls} !w-auto`}>
            <option value={0} className={optionCls}>Todos</option>
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1} className={optionCls}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {EQUIPES.map(eq => {
          const esc = escalasByEquipe.get(eq);
          const items = esc ? itemsByEscala.get(esc.id) || [] : [];
          const teamMembers = bombeiros.filter(b => b.equipe === eq);
          const isExpanded = expandedEquipe === eq;

          return (
            <div key={eq} className="rounded-2xl border border-graphite-200 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
              <button
                onClick={() => setExpandedEquipe(isExpanded ? null : eq)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-graphite-900 dark:text-graphite-100">Equipe {eq}</p>
                  <p className="text-xs text-graphite-500 dark:text-graphite-400">
                    {teamMembers.length} membros · {items.length} alocacoes
                  </p>
                </div>
                {esc && (
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS_ESCALA_COLORS[esc.status]}`}>{esc.status}</span>
                )}
                {!esc && (
                  <span className="shrink-0 rounded-full bg-graphite-100 px-2.5 py-0.5 text-[10px] font-bold text-graphite-500 dark:bg-graphite-700 dark:text-graphite-400">Sem escala</span>
                )}
                {isExpanded ? <ChevronDown className="h-4 w-4 shrink-0 text-graphite-400" /> : <ChevronRight className="h-4 w-4 shrink-0 text-graphite-400" />}
              </button>

              {isExpanded && (
                <div className="border-t border-graphite-200 px-5 py-5 dark:border-border-dark">
                  {esc && (
                    <div className="mb-4">
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl bg-graphite-50 p-3 dark:bg-surface-hover">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Chefe</p>
                          <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{esc.chefeNome}</p>
                        </div>
                        <div className="rounded-xl bg-graphite-50 p-3 dark:bg-surface-hover">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Status</p>
                          <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{esc.status}</p>
                        </div>
                        <div className="rounded-xl bg-graphite-50 p-3 dark:bg-surface-hover">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Itens</p>
                          <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{items.length}</p>
                        </div>
                        <div className="rounded-xl bg-graphite-50 p-3 dark:bg-surface-hover">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Enviado</p>
                          <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{esc.enviadoEm ? fmt(esc.enviadoEm) : '-'}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        {podeExcluir && (
                          <button onClick={() => setConfirmDeleteEscala(esc.id)}
                            className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                            <Trash2 className="h-3 w-3" /> Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {items.length > 0 && (
                    <div className="mb-4">
                      <h5 className="mb-3 text-xs font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Grade Mensal</h5>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12">
                        {MESES.map((mes, idx) => {
                          const mesNum = idx + 1;
                          const mesItems = items.filter(i => i.mes === mesNum);
                          return (
                            <div key={mesNum} className={`rounded-xl border p-2 text-center text-[10px] dark:border-border-dark ${mesItems.length > 0 ? 'border-aviation-300 bg-aviation-50 dark:bg-aviation-900/20' : 'border-graphite-200 bg-graphite-50 dark:bg-surface-hover'}`}>
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

                  {items.filter(item => mes === 0 || item.mes === mes).length > 0 ? (
                    <div className="space-y-2">
                      {items.filter(item => mes === 0 || item.mes === mes).map(item => (
                        <div key={item.id} className="rounded-xl border border-graphite-200 p-3 dark:border-border-dark dark:bg-surface-hover">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">
                                {MESES[item.mes - 1]} - {item.funcionarioNome}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-graphite-500 dark:text-graphite-400">
                                <span>{item.funcao}</span>
                                <span>{fmt(item.dataInicio)} - {fmt(item.dataFim)}</span>
                                <span>{item.dias} dias</span>
                              </div>
                            </div>
                          </div>
                          {(item.substitutoNome || item.feristaNome) && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {item.substitutoNome && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-aviation-100 px-2 py-0.5 text-[10px] font-semibold text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                                  <ArrowRightLeft className="h-3 w-3" /> Sub: {item.substitutoNome}
                                  {item.funcaoSubstituicao ? ` (${ABBR_CARGO[item.funcaoSubstituicao as Cargo] || item.funcaoSubstituicao})` : ''}
                                </span>
                              )}
                              {item.feristaNome && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                  <User className="h-3 w-3" /> Ferista: {item.feristaNome}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-graphite-400 dark:text-graphite-500">Nenhuma alocação para esta equipe neste ano.</p>
                  )}

                  <div className="mt-4">
                    <h5 className="mb-2 text-xs font-bold uppercase tracking-wider text-graphite-500 dark:text-graphite-400">Efetivo da Equipe</h5>
                    <div className="flex flex-wrap gap-2">
                      {[...teamMembers].sort((a, b) => {
                        const hierarquia: Record<string, number> = { 'BA-CE': 1, 'BA-LR': 2, 'BA-MC': 3, 'BA-2': 4, 'BA-RE': 5, 'GS': 6, 'OC': 7 };
                        return (hierarquia[a.cargo] || 99) - (hierarquia[b.cargo] || 99);
                      }).map(m => (
                        <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-graphite-100 px-2.5 py-1 text-[10px] font-semibold text-graphite-700 dark:bg-surface-hover dark:text-graphite-300">
                          {m.nomeGuerra} <span className="text-graphite-400 dark:text-graphite-500">({ABBR_CARGO[m.cargo] || m.cargo})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {confirmDeleteEscala && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusão</h3>
            <p className="mb-6 text-sm text-graphite-500 dark:text-graphite-400">Tem certeza que deseja excluir esta escala? Todos os itens serão removidos.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteEscala(null)} className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                Cancelar
              </button>
              <button onClick={() => handleDeleteEscalaGeral(confirmDeleteEscala)} disabled={deleting} className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl active:scale-[0.98]">
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Tab Escala Anual (Chefe de Equipe) ------------------------------------------

function TabEscalaAnual() {
  const { effectiveRole, user } = useAuth();
  const isAdmin = effectiveRole === 'desenvolvedor' || effectiveRole === 'admin' || effectiveRole === 'gerente';
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [myBombeiro, setMyBombeiro] = useState<Bombeiro | null>(null);
  const [selectedEquipe, setSelectedEquipe] = useState<Equipe | ''>('');
  const [escala, setEscala] = useState<EscalaFerias | null>(null);
  const [itens, setItens] = useState<EscalaFeriasItem[]>([]);
  const [feriasGozo, setFeriasGozo] = useState<FeriasGozo[]>([]);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formFuncId, setFormFuncId] = useState('');
  const [formPeriodo, setFormPeriodo] = useState<number>(0);
  const [formDias, setFormDias] = useState<number>(30);
  const [formDataInicio, setFormDataInicio] = useState('');
  const [formSubId, setFormSubId] = useState('');
  const [formFerista, setFormFerista] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeEquipe = isAdmin ? (selectedEquipe || '') : (myBombeiro?.equipe || '');

  const teamMembers = useMemo(
    () => activeEquipe ? bombeiros.filter(b => b.equipe === activeEquipe) : [],
    [bombeiros, activeEquipe],
  );

  const feristas = useMemo(
    () => bombeiros.filter(b => b.equipe === 'Ferista'),
    [bombeiros],
  );

  const formFuncPeriodos = useMemo(() => {
    if (!formFuncId) return [];
    const b = bombeiros.find(x => x.id === formFuncId);
    if (!b) return [];
    const allPeriodos = calcularPeriodosAquisitivos(b.dataAdmissao);
    const gozos = feriasGozo.filter(g => g.funcionarioId === b.id);
    return allPeriodos.filter(p => {
      if (p.status === 'Vencido') return false;
      const gozo = gozos.find(g => g.periodoNumero === p.numero);
      return !gozo;
    });
  }, [formFuncId, bombeiros, feriasGozo]);

  const feristaConflict = useMemo(() => {
    if (!formFerista || !escala) return null;
    const f = feristas.find(x => x.id === formFerista);
    if (!f) return null;
    for (const item of itens) {
      if (item.feristaId === formFerista && item.escalaId !== escala.id) {
        return { equipe: '', nome: f.nomeCompleto };
      }
    }
    return null;
  }, [formFerista, itens, escala, feristas]);

  const formSubAutoFuncao = useMemo(() => {
    if (!formSubId || !formFuncId) return '';
    const func = bombeiros.find(b => b.id === formFuncId);
    return func?.cargo || '';
  }, [formSubId, formFuncId, bombeiros]);

  const equipes: Equipe[] = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Ferista'];

  useEffect(() => {
    (async () => {
      const [all, gozos] = await Promise.all([listarAtivos(), listarFeriasGozo()]);
      setBombeiros(all);
      setFeriasGozo(gozos);
      if (user) {
        const me = all.find(b => b.nomeCompleto === user.name);
        setMyBombeiro(me || null);
        if (!isAdmin && me) setSelectedEquipe(me.equipe);
      }
      setLoading(false);
    })();
  }, [user, isAdmin]);

  useEffect(() => {
    if (!activeEquipe) return;
    (async () => {
      const escs = await listarEscalas(activeEquipe, ano);
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
      setEditingItemId(null);
    })();
  }, [activeEquipe, ano]);

  async function handleCreateEscala() {
    if (!activeEquipe || !user) return;
    setSaving(true);
    const e = await criarEscala({
      equipe: activeEquipe,
      ano,
      chefeId: myBombeiro?.id || user.name,
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
    const ferista = feristas.find(b => b.id === formFerista);

    const dataFim = new Date(formDataInicio);
    dataFim.setDate(dataFim.getDate() + formDias - 1);

    const data: Omit<EscalaFeriasItem, 'id' | 'createdAt'> = {
      escalaId: escala.id,
      mes,
      funcionarioId: formFuncId,
      funcionarioNome: member?.nomeCompleto || '',
      funcao: member?.cargo || 'BA-2',
      dias: formDias,
      dataInicio: formDataInicio,
      dataFim: dataFim.toISOString().split('T')[0],
      substitutoId: formSubId,
      substitutoNome: sub?.nomeCompleto || '',
      funcaoSubstituicao: sub ? (member?.cargo || 'BA-2') : '',
      feristaId: formFerista,
      feristaNome: ferista?.nomeCompleto || '',
      periodoNumero: formPeriodo,
    };

    setSaving(true);
    if (editingItemId) {
      await atualizarItemEscala(editingItemId, data);
    } else {
      await criarItemEscala(data);
    }
    const it = await listarItensEscala(escala.id);
    setItens(it);
    setEditingMonth(null);
    setEditingItemId(null);
    resetForm();
    setSaving(false);
  }

  async function handleDeleteItem(itemId: string) {
    if (!escala) return;
    setSaving(true);
    await excluirItemEscala(itemId);
    const it = await listarItensEscala(escala.id);
    setItens(it);
    setSaving(false);
    setEditingMonth(null);
    setEditingItemId(null);
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
    try {
      setSaving(true);
      await excluirEscala(escala.id);
      setEscala(null);
      setItens([]);
      setConfirmDelete(false);
    } catch (err) {
      console.error('Erro ao excluir escala:', err);
      alert('Erro ao excluir escala: ' + (err instanceof Error ? err.message : 'Erro desconhecido'));
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setFormFuncId('');
    setFormPeriodo(0);
    setFormDias(30);
    setFormDataInicio('');
    setFormSubId('');
    setFormFerista('');
  }

  function startEditMonth(mes: number) {
    resetForm();
    setEditingItemId(null);
    setEditingMonth(mes);
  }

  function startEditExistingItem(mes: number, itemId: string) {
    const existing = itens.find(i => i.id === itemId);
    if (existing) {
      setFormFuncId(existing.funcionarioId);
      setFormPeriodo(existing.periodoNumero || 0);
      setFormDias(existing.dias || 30);
      setFormDataInicio(existing.dataInicio || monthStart(ano, mes));
      setFormSubId(existing.substitutoId);
      setFormFerista(existing.feristaId || '');
    } else {
      resetForm();
    }
    setEditingItemId(itemId);
    setEditingMonth(mes);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" />
      </div>
    );
  }

  if (!activeEquipe && !loading && isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
        <CalendarDays className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
        <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Selecione uma equipe</h3>
        <p className="mb-4 text-sm text-graphite-400 dark:text-graphite-500">Escolha a equipe para gerenciar a escala.</p>
        <select value={selectedEquipe} onChange={e => setSelectedEquipe(e.target.value as Equipe)} className={`${selectCls} !w-auto`}>
          <option value="" className={optionCls}>Escolha a equipe</option>
          {equipes.map(eq => <option key={eq} value={eq} className={optionCls}>{eq}</option>)}
        </select>
      </div>
    );
  }

  if (!activeEquipe && !loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
        <AlertTriangle className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
        <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Registro de bombeiro não encontrado</h3>
        <p className="text-sm text-graphite-400 dark:text-graphite-500">Não foi possível vincular seu usuário a um bombeiro.</p>
      </div>
    );
  }

  const canEditBase = escala?.status === 'Rascunho' || escala?.status === 'Rejeitado';
  const isFeristaTeam = activeEquipe === 'Ferista';
  const canEdit = canEditBase && (!isFeristaTeam || isAdmin);
  const canDelete = effectiveRole === 'desenvolvedor' || effectiveRole === 'admin';
  const canDeleteItem = isAdmin;
  const canSend = escala?.status === 'Rascunho' || escala?.status === 'Rejeitado';

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {isAdmin && (
          <div>
            <label className={labelCls}>Equipe</label>
            <select value={selectedEquipe} onChange={e => setSelectedEquipe(e.target.value as Equipe)} className={`${selectCls} !w-auto`}>
              <option value="" className={optionCls}>Selecione a equipe</option>
              {equipes.map(eq => <option key={eq} value={eq} className={optionCls}>{eq}</option>)}
            </select>
          </div>
        )}
        <div>
          <label className={labelCls}>Ano</label>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className={`${selectCls} !w-auto`}>
            {getAnos().map(a => <option key={a} value={a} className={optionCls}>{a}</option>)}
          </select>
        </div>
        {escala && (
          <div className="flex items-center gap-2 self-end">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_ESCALA_COLORS[escala.status]}`}>{escala.status}</span>
            {escala.status === 'Aprovado' && escala.aprovadoPorNome && (
              <span className="text-xs text-graphite-500 dark:text-graphite-400">Aprovado por {escala.aprovadoPorNome} em {fmt(escala.aprovadoEm)}</span>
            )}
          </div>
        )}
      </div>

      {escala?.status === 'Rejeitado' && escala.observacoesRejeicao && (
        <div className="mb-6 rounded-xl border border-yellow-300 bg-yellow-50 p-4 dark:border-yellow-700 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">Escalas Rejeitadas - Observações</span>
          </div>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">{escala.observacoesRejeicao}</p>
        </div>
      )}

      {isFeristaTeam && !isAdmin && (
        <div className="mb-6 rounded-xl border border-orange-300 bg-orange-50 p-4 dark:border-orange-700 dark:bg-orange-900/20">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-bold text-orange-700 dark:text-orange-300">Restricao de Acesso</span>
          </div>
          <p className="text-sm text-orange-800 dark:text-orange-200">Somente gerente/admin pode gerenciar ferias da equipe Ferista</p>
        </div>
      )}

      {!escala && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <CalendarDays className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhuma escala para {ano}</h3>
          <p className="mb-4 text-sm text-graphite-400 dark:text-graphite-500">Equipe {activeEquipe}</p>
          <button onClick={handleCreateEscala} disabled={saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl active:scale-[0.98]">
            <Plus className="h-4 w-4" /> Criar Escala Anual
          </button>
        </div>
      )}

      {escala && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {[...teamMembers].sort((a, b) => {
              const h: Record<string, number> = { 'BA-CE': 1, 'BA-LR': 2, 'BA-MC': 3, 'BA-RE': 4, 'BA-2': 5, 'OC': 6, 'GS': 7 };
              return (h[a.cargo] || 99) - (h[b.cargo] || 99);
            }).map(m => (
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
              const mesItems = itens.filter(i => i.escalaId === escala.id && i.mes === mesNum);
              const isEditing = editingMonth === mesNum;
              const hasItems = mesItems.length > 0;

              return (
                <div key={mesNum} className={`rounded-2xl border p-4 transition-all dark:bg-surface-card ${hasItems ? 'border-aviation-200 bg-aviation-50/50 dark:border-aviation-800 dark:bg-aviation-900/10' : 'border-graphite-200 bg-white dark:border-border-dark'}`}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{mes}</span>
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button onClick={() => startEditMonth(mesNum)} className="flex items-center gap-1 rounded-lg bg-aviation-100 px-2.5 py-1 text-xs font-medium text-aviation-700 transition-colors hover:bg-aviation-200 dark:bg-aviation-900/30 dark:text-aviation-300 dark:hover:bg-aviation-900/50">
                          <Plus className="h-3.5 w-3.5" /> Adicionar pessoa
                        </button>
                      )}
                      {canSend && mesItems.length > 0 && (
                        <button onClick={async () => {
                          for (const item of mesItems) {
                            await enviarItemEscala(item.id);
                          }
                          const it = await listarItensEscala(escala.id);
                          setItens(it);
                        }} className="flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50">
                          <Send className="h-3.5 w-3.5" /> Enviar Mês
                        </button>
                      )}
                    </div>
                  </div>

                  {!hasItems && !isEditing && (
                    <p className="text-xs text-graphite-400 dark:text-graphite-500">Sem alocacao</p>
                  )}

                  {mesItems.map(item => (
                    <div key={item.id} className="mb-2 rounded-xl border border-graphite-200 bg-white p-3 shadow-sm last:mb-0 dark:border-border-dark dark:bg-surface-hover">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-graphite-800 dark:text-graphite-200 truncate">{item.funcionarioNome} ({item.dias}d)</p>
                          <div className="flex items-center gap-2 text-xs text-graphite-500 dark:text-graphite-400">
                            <span>{fmt(item.dataInicio)} - {fmt(item.dataFim)}</span>
                          </div>
                          {(item.substitutoNome || item.feristaNome) && (
                            <div className="mt-1 flex flex-wrap gap-2">
                              {item.substitutoNome && (
                                <span className="text-aviation-600 dark:text-aviation-400">Sub: {item.substitutoNome}</span>
                              )}
                              {item.feristaNome && (
                                <span className="text-orange-600 dark:text-orange-400">Ferista: {item.feristaNome}</span>
                              )}
                            </div>
                          )}
                        </div>
                        {(canEdit || canDeleteItem) && (
                          <div className="flex items-center gap-1 shrink-0">
                            {canEdit && (
                              <button onClick={() => startEditExistingItem(mesNum, item.id)} className="rounded-lg p-1.5 text-graphite-400 hover:bg-graphite-100 dark:hover:bg-surface-hover">
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            {canDeleteItem && (
                              <button onClick={() => handleDeleteItem(item.id)} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isEditing && (
                    <div className="mt-3 space-y-3 rounded-xl border border-graphite-200 bg-white p-4 dark:border-border-dark dark:bg-surface-hover">
                      <div>
                        <label className={labelCls}>Funcionario em Gozo *</label>
                        <select value={formFuncId} onChange={e => { setFormFuncId(e.target.value); setFormPeriodo(0); }} className={selectCls}>
                          <option value="" className={optionCls}>Selecione</option>
                          {teamMembers.map(m => (
                            <option key={m.id} value={m.id} className={optionCls}>{m.nomeCompleto} ({ABBR_CARGO[m.cargo] || m.cargo})</option>
                          ))}
                        </select>
                      </div>

                      {formFuncId && formFuncPeriodos.length > 0 && (
                        <div>
                          <label className={labelCls}>Período Aquisitivo *</label>
                          <select value={formPeriodo} onChange={e => setFormPeriodo(Number(e.target.value))} className={selectCls}>
                            <option value={0} className={optionCls}>Selecione o período</option>
                            {formFuncPeriodos.map(p => (
                              <option key={p.numero} value={p.numero} className={optionCls}>
                                Periodo {p.numero}: {fmt(p.dataInicio)} - {fmt(p.dataFim)} ({p.diasDireito} dias)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {formFuncId && formFuncPeriodos.length === 0 && (
                        <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-900/20">
                          <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">Nenhum período disponível para este funcionário.</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={labelCls}>Dias *</label>
                          <select value={formDias} onChange={e => setFormDias(Number(e.target.value))} className={selectCls}>
                            {[10, 15, 30].map(d => (
                              <option key={d} value={d} className={optionCls}>{d} dias</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>Data Inicio *</label>
                          <input type="date" value={formDataInicio} onChange={e => setFormDataInicio(e.target.value)} className={inputCls} />
                        </div>
                      </div>

                      <div className="rounded-lg border border-aviation-300 bg-aviation-50 p-3 dark:border-aviation-700 dark:bg-aviation-900/20">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-aviation-600 dark:text-aviation-400" />
                          <p className="text-xs font-semibold text-aviation-700 dark:text-aviation-300">
                            A data de inicio deve ser em um dia de plantao. Verifique a escala de trabalho da equipe antes de confirmar.
                          </p>
                        </div>
                      </div>

                      {formDataInicio && formDias > 0 && (
                        <div className="rounded-lg bg-graphite-50 p-2 text-xs text-graphite-600 dark:bg-surface-card dark:text-graphite-400">
                           Período: {fmt(formDataInicio)} até {fmt(new Date(new Date(formDataInicio).getTime() + (formDias - 1) * 86400000).toISOString().split('T')[0])}
                        </div>
                      )}

                      <div>
                        <label className={labelCls}>Substituto</label>
                        <select value={formSubId} onChange={e => setFormSubId(e.target.value)} className={selectCls}>
                          <option value="" className={optionCls}>Nenhum</option>
                          {(() => {
                            const func = bombeiros.find(b => b.id === formFuncId);
                            const isBA2 = func?.cargo === 'BA-2';
                            if (isBA2) {
                              return feristas.map(m => (
                                <option key={m.id} value={m.id} className={optionCls}>
                                  {m.nomeCompleto} ({ABBR_CARGO[m.cargo] || m.cargo}) [Ferista]
                                </option>
                              ));
                            }
                            return [...teamMembers.filter(m => m.id !== formFuncId), ...feristas].map(m => (
                              <option key={m.id} value={m.id} className={optionCls}>
                                {m.nomeCompleto} ({ABBR_CARGO[m.cargo] || m.cargo}){m.equipe === 'Ferista' ? ' [Ferista]' : ''}
                              </option>
                            ));
                          })()}
                        </select>
                      </div>

                      {formSubId && (
                        <div className="rounded-lg bg-graphite-50 p-2 dark:bg-surface-card">
                          <p className="text-xs text-graphite-600 dark:text-graphite-400">
                            Substituição automática: <span className="font-bold text-graphite-900 dark:text-graphite-100">{formSubAutoFuncao ? (ABBR_CARGO[formSubAutoFuncao] || formSubAutoFuncao) : '-'}</span> (mesma função do funcionário em gozo)
                          </p>
                        </div>
                      )}

                      {formSubId && (
                        <div>
                          <label className={labelCls}>Ferista</label>
                          <select value={formFerista} onChange={e => setFormFerista(e.target.value)} className={selectCls}>
                            <option value="" className={optionCls}>Nenhum</option>
                            {feristas.map(m => (
                              <option key={m.id} value={m.id} className={optionCls}>{m.nomeCompleto}</option>
                            ))}
                          </select>
                          {feristaConflict && (
                            <div className="mt-2 rounded-lg border border-yellow-300 bg-yellow-50 p-2 dark:border-yellow-700 dark:bg-yellow-900/20">
                              <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                                {feristaConflict.nome} ja esta designado em outra equipe. O gerente decidira qual equipe permanecera. Caso nao liberem, escolha outro ferista.
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button onClick={() => handleSaveItem(mesNum)} disabled={!formFuncId || !formPeriodo || !formDataInicio || saving} className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:shadow-md disabled:opacity-50">
                          <Save className="h-3.5 w-3.5" /> {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button onClick={() => { setEditingMonth(null); setEditingItemId(null); resetForm(); }} className="rounded-lg border border-graphite-300 bg-white px-3 py-1.5 text-xs font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-300">
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
                {canSend && (
                  <button onClick={handleSendApproval} disabled={saving} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl active:scale-[0.98]">
                    <Send className="h-4 w-4" /> Enviar para Aprovação
                  </button>
                )}
              </>
            )}
            {canDelete && (
              <button onClick={() => setConfirmDelete(true)} disabled={saving} className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition-all hover:bg-red-100 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400">
                <Trash2 className="h-4 w-4" /> Excluir Escala
              </button>
            )}
          </div>
        </>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated">
            <h3 className="mb-2 text-lg font-bold text-graphite-900 dark:text-graphite-100">Confirmar exclusão</h3>
            <p className="mb-6 text-sm text-graphite-500 dark:text-graphite-400">Tem certeza que deseja excluir esta escala? Todos os itens serão removidos.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                Cancelar
              </button>
              <button onClick={handleDeleteEscala} disabled={saving} className="rounded-xl bg-gradient-to-r from-alert-red to-red-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-xl active:scale-[0.98]">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -- Tab Minha Equipe (Chefe) ----------------------------------------------------

function TabMinhaEquipe() {
  const { effectiveRole, user } = useAuth();
  const isAdmin = effectiveRole === 'desenvolvedor' || effectiveRole === 'admin' || effectiveRole === 'gerente';
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [feriasGozo, setFeriasGozo] = useState<FeriasGozo[]>([]);
  const [allItems, setAllItems] = useState<EscalaFeriasItem[]>([]);
  const [myBombeiro, setMyBombeiro] = useState<Bombeiro | null>(null);
  const [selectedEquipe, setSelectedEquipe] = useState<Equipe | ''>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const equipes: Equipe[] = ['Alfa', 'Bravo', 'Charlie', 'Delta'];

  useEffect(() => {
    (async () => {
      const [all, gozos, escalas] = await Promise.all([listarAtivos(), listarFeriasGozo(), listarEscalas()]);
      setBombeiros(all);
      setFeriasGozo(gozos);
      const items: EscalaFeriasItem[] = [];
      for (const esc of escalas) {
        const it = await listarItensEscala(esc.id);
        items.push(...it);
      }
      setAllItems(items);
      if (user) {
        const me = all.find(b => b.nomeCompleto === user.name);
        setMyBombeiro(me || null);
        if (me && !isAdmin) setSelectedEquipe(me.equipe);
      }
      setLoading(false);
    })();
  }, [user, isAdmin]);

  const activeEquipe = isAdmin ? selectedEquipe : (myBombeiro?.equipe || '');

  const teamMembers = useMemo(
    () => activeEquipe ? bombeiros.filter(b => b.equipe === activeEquipe) : [],
    [bombeiros, activeEquipe],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" />
      </div>
    );
  }

  if (!activeEquipe && !loading && isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
        <Users className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
        <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Selecione uma equipe</h3>
        <div className="mt-4">
          <select value={selectedEquipe} onChange={e => setSelectedEquipe(e.target.value as Equipe)} className={selectCls}>
            <option value="" className={optionCls}>Escolha a equipe</option>
            {equipes.map(eq => <option key={eq} value={eq} className={optionCls}>{eq}</option>)}
          </select>
        </div>
      </div>
    );
  }

  if (!activeEquipe && !loading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
        <AlertTriangle className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
        <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Registro de bombeiro não encontrado</h3>
        <p className="text-sm text-graphite-400 dark:text-graphite-500">Não foi possível vincular seu usuário a um bombeiro.</p>
      </div>
    );
  }

  return (
    <div>
      {isAdmin && (
        <div className="mb-4">
          <label className={labelCls}>Equipe</label>
          <select value={selectedEquipe} onChange={e => setSelectedEquipe(e.target.value as Equipe)} className={`${selectCls} !w-auto`}>
            <option value="" className={optionCls}>Selecione a equipe</option>
            {equipes.map(eq => <option key={eq} value={eq} className={optionCls}>{eq}</option>)}
          </select>
        </div>
      )}
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />
        <h3 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">
          Equipe {activeEquipe} - {teamMembers.length} membros
        </h3>
      </div>

      <div className="space-y-3">
        {teamMembers.map(m => {
          const periodos = buildPeriodos(m, feriasGozo);
          const isExpanded = expandedId === m.id;
          return (
            <div key={m.id}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : m.id)}
                className={`w-full rounded-2xl border p-4 text-left shadow-sm transition-all hover:shadow-md dark:bg-surface-card ${
                  isExpanded
                    ? 'border-aviation-400 bg-aviation-50 dark:border-aviation-500 dark:bg-aviation-900/20'
                    : 'border-graphite-200 bg-white dark:border-border-dark'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white shadow-sm">
                    {m.foto ? <img src={m.foto} alt="" className="h-full w-full rounded-xl object-cover" /> : m.nomeGuerra.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-graphite-900 dark:text-graphite-100 truncate">{m.nomeCompleto}</p>
                    <div className="flex items-center gap-2 text-xs text-graphite-500 dark:text-graphite-400">
                      <span>{ABBR_CARGO[m.cargo] || m.cargo}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmt(m.dataAdmissao)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 shrink-0">
                    {periodos.map(p => {
                      const label = p.gozo
                        ? p.gozo.status === 'Gozadas' ? 'G' : p.gozo.status === 'Em Gozo' ? 'EG' : 'PR'
                        : p.status === 'Disponivel' ? 'D' : p.status === 'Vencido' ? 'V' : '?';
                      const color = p.gozo
                        ? p.gozo.status === 'Gozadas'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                          : p.gozo.status === 'Em Gozo'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                        : p.status === 'Disponivel'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
                      return (
                        <span key={p.numero} title={`Periodo ${p.numero}: ${p.gozo ? p.gozo.status : p.status}`} className={`inline-flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold ${color}`}>
                          {label}
                        </span>
                      );
                    })}
                  </div>
                  {isExpanded ? <ChevronDown className="h-5 w-5 shrink-0 text-graphite-400" /> : <ChevronRight className="h-5 w-5 shrink-0 text-graphite-400" />}
                </div>
              </button>

              {isExpanded && (
                <div className="mt-2 rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card space-y-4">
                  <h4 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">
                    Periodos Aquisitivos - {m.nomeCompleto}
                  </h4>
                  {periodos.length === 0 ? (
                    <p className="text-sm text-graphite-400 dark:text-graphite-500">Nenhum período calculado.</p>
                  ) : (
                    <div className="space-y-2">
                      {periodos.map(p => (
                        <div key={p.numero} className="rounded-xl border border-graphite-200 p-3 dark:border-border-dark dark:bg-surface-hover">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-graphite-900 dark:text-graphite-100">
                                Periodo {p.numero}: {fmt(p.dataInicio)} - {fmt(p.dataFim)}
                              </p>
                              <p className="text-[10px] text-graphite-400 dark:text-graphite-500">
                                Vence: {fmt(p.dataVencimento)} · {p.diasDireito} dias
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${PERIODO_STATUS_COLORS[p.status] || ''}`}>
                              {p.status}
                            </span>
                          </div>
                          {p.gozo && (
                            <div className="mt-2 rounded-lg border border-aviation-200 bg-aviation-50 p-2.5 dark:border-aviation-800 dark:bg-aviation-900/20">
                              <div className="flex items-center gap-2 text-xs">
                                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-aviation-600 dark:text-aviation-400" />
                                <span className="font-semibold text-aviation-700 dark:text-aviation-300">
                                  Gozo: {fmt(p.gozo.dataInicio)} - {fmt(p.gozo.dataFim)} ({p.gozo.dias} dias)
                                </span>
                              </div>
                              {p.gozo.substitutoNome && (
                                <div className="mt-1.5 flex items-center gap-2 text-xs text-graphite-600 dark:text-graphite-400">
                                  <ArrowRightLeft className="h-3 w-3 shrink-0 text-orange-500" />
                                  <span>
                                    Substituicao: <strong className="text-orange-700 dark:text-orange-300">{p.gozo.substitutoNome}</strong>
                                    {p.gozo.funcaoSubstituicao ? ` como ${ABBR_CARGO[p.gozo.funcaoSubstituicao] || p.gozo.funcaoSubstituicao}` : ''}
                                  </span>
                                </div>
                              )}
                              <p className="mt-1 text-[10px] text-graphite-400 dark:text-graphite-500">
                                Modificado por: {p.gozo.modificadoPor}{p.gozo.bloqueado ? ' · Bloqueado' : ''}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {allItems.filter(i => i.funcionarioId === m.id && !i.rejeitado).length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-graphite-900 dark:text-graphite-100 flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        Alocacoes na Escala Anual
                      </h4>
                      <div className="mt-2 space-y-1.5">
                        {allItems.filter(i => i.funcionarioId === m.id && !i.rejeitado).sort((a, b) => a.mes - b.mes).map(item => (
                          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-graphite-200 bg-white p-2.5 dark:border-border-dark dark:bg-surface-hover">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-100 text-[10px] font-bold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                              {MESES[item.mes - 1]?.substring(0, 3)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-graphite-800 dark:text-graphite-200 truncate">
                                {fmt(item.dataInicio)} - {fmt(item.dataFim)} ({item.dias}d)
                              </p>
                              {item.substitutoNome && (
                                <p className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                  <ArrowRightLeft className="h-2.5 w-2.5" />
                                  Sub: {item.substitutoNome}
                                  {item.funcaoSubstituicao ? ` (${ABBR_CARGO[item.funcaoSubstituicao] || item.funcaoSubstituicao})` : ''}
                                </p>
                              )}
                              {item.feristaNome && (
                                <p className="text-[10px] text-orange-600 dark:text-orange-400 flex items-center gap-1">
                                  <User className="h-2.5 w-2.5" />
                                  Ferista: {item.feristaNome}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {allItems.filter(i => i.substitutoId === m.id && !i.rejeitado).length > 0 && (
                    <div>
                      <h4 className="text-sm font-bold text-graphite-900 dark:text-graphite-100 flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        Substituicoes (como substituto)
                      </h4>
                      <div className="mt-2 space-y-1.5">
                        {allItems.filter(i => i.substitutoId === m.id && !i.rejeitado).sort((a, b) => a.mes - b.mes).map(item => (
                          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-orange-200 bg-orange-50 p-2.5 dark:border-orange-800 dark:bg-orange-900/10">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-[10px] font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                              {MESES[item.mes - 1]?.substring(0, 3)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-graphite-800 dark:text-graphite-200 truncate">
                                Cobrindo: {item.funcionarioNome} ({ABBR_CARGO[item.funcao] || item.funcao})
                              </p>
                              <p className="text-[10px] text-graphite-500 dark:text-graphite-400">
                                {fmt(item.dataInicio)} - {fmt(item.dataFim)} ({item.dias}d)
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {teamMembers.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
            <Users className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
            <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum membro encontrado</h3>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Tab Férias Feristas (Gerente) -------------------------------------------------

function TabEscalaFeristas() {
  const { effectiveRole, user } = useAuth();
  const canManage = effectiveRole === 'desenvolvedor' || effectiveRole === 'admin' || effectiveRole === 'gerente';
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [feriasGozo, setFeriasGozo] = useState<FeriasGozo[]>([]);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const feristas = useMemo(() => bombeiros.filter(b => b.equipe === 'Ferista'), [bombeiros]);

  async function carregar() {
    setLoading(true);
    const [all, gozos] = await Promise.all([listarAtivos(), listarFeriasGozo()]);
    setBombeiros(all);
    setFeriasGozo(gozos);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function handleSaveGozo(periodo: PeriodoAquisitivo, dataInicio: string, dataFim: string, ferista: Bombeiro) {
    if (!user) return;
    setSaving(true);
    const dias = calcDias(dataInicio, dataFim);
    await criarFeriasGozo({
      funcionarioId: ferista.id,
      funcionarioNome: ferista.nomeCompleto,
      equipe: 'Ferista',
      periodoNumero: periodo.numero,
      dataInicio, dataFim, dias,
      status: dataFim < new Date().toISOString().split('T')[0] ? 'Gozadas' : 'Programadas',
      substitutoId: '', substitutoNome: '', funcaoSubstituicao: '',
      observacoes: 'Férias Ferista',
      modificadoPor: user.username,
      bloqueado: true,
    });
    await carregar();
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
      <div className="mb-4 flex items-center gap-3">
        <User className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <span className="text-sm font-medium text-graphite-700 dark:text-graphite-300">
          {feristas.length} ferista(s) — Gerencie os períodos de férias
        </span>
      </div>

      {feristas.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <Users className="mb-4 h-12 w-12 text-graphite-300 dark:text-graphite-600" />
          <h3 className="mb-2 text-lg font-semibold text-graphite-700 dark:text-graphite-300">Nenhum ferista cadastrado</h3>
          <p className="text-sm text-graphite-400">Cadastre bombeiros com equipe "Ferista" para gerenciar férias.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {feristas.map(f => {
            const periodos = buildPeriodos(f, feriasGozo);
            const isSelected = selectedId === f.id;
            return (
              <div key={f.id}>
                <button
                  onClick={() => setSelectedId(isSelected ? null : f.id)}
                  className={`w-full rounded-2xl border p-4 text-left shadow-sm transition-all hover:shadow-md dark:bg-surface-card ${
                    isSelected ? 'border-aviation-400 bg-aviation-50 dark:border-aviation-500 dark:bg-aviation-900/20' : 'border-graphite-200 bg-white dark:border-border-dark'
                  }`}>
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 text-sm font-bold text-white shadow-sm">
                      {f.foto ? <img src={f.foto} alt="" className="h-full w-full rounded-xl object-cover" /> : f.nomeGuerra.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-graphite-900 dark:text-graphite-100 truncate">{f.nomeCompleto}</p>
                      <div className="flex items-center gap-2 text-xs text-graphite-500 dark:text-graphite-400">
                        <span>{f.cargo}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmt(f.dataAdmissao)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {periodos.map(p => {
                        const label = p.gozo
                          ? p.gozo.status === 'Gozadas' ? 'G' : p.gozo.status === 'Em Gozo' ? 'EG' : 'PR'
                          : p.status === 'Disponivel' ? 'D' : p.status === 'Vencido' ? 'V' : '?';
                        const color = p.gozo
                          ? p.gozo.status === 'Gozadas' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : p.gozo.status === 'Em Gozo' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400'
                          : p.status === 'Disponivel' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
                        return (
                          <span key={p.numero} title={`Periodo ${p.numero}: ${p.gozo ? p.gozo.status : p.status}`} className={`inline-flex h-5 w-5 items-center justify-center rounded text-[9px] font-bold ${color}`}>{label}</span>
                        );
                      })}
                    </div>
                    {isSelected ? <ChevronDown className="h-5 w-5 shrink-0 text-graphite-400" /> : <ChevronRight className="h-5 w-5 shrink-0 text-graphite-400" />}
                  </div>
                </button>
                {isSelected && (
                  <div className="mt-2 rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
                    <h4 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Períodos Aquisitivos — {f.nomeCompleto}</h4>
                    {periodos.length === 0 ? (
                      <p className="text-sm text-graphite-400">Nenhum período calculado.</p>
                    ) : (
                      <div className="space-y-3">
                        {periodos.map(p => (
                          <PeriodoCard key={p.numero} periodo={p} onSave={(periodo, dIni, dFim) => handleSaveGozo(periodo, dIni, dFim, f)} onDelete={async (gozoId) => { if (confirm('Excluir estas férias?')) { await excluirFeriasGozo(gozoId); carregar(); } }} saving={saving} />
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

// -- Tab Quadro de Efetivos (Gerente) ------------------------------------------------

function TabQuadroEfetivos() {
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [feriasGozo, setFeriasGozo] = useState<FeriasGozo[]>([]);
  const [allItems, setAllItems] = useState<EscalaFeriasItem[]>([]);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(true);

  const equipes: Equipe[] = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Ferista'];

  const CARGO_PRIORITY: Record<string, number> = {
    'BA-CE': 0,
    'BA-LR': 1,
    'BA-MC': 2,
    'BA-2': 3,
  };

  function sortPorHierarquia(lista: Bombeiro[]): Bombeiro[] {
    return [...lista].sort((a, b) => (CARGO_PRIORITY[a.cargo] ?? 99) - (CARGO_PRIORITY[b.cargo] ?? 99));
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [all, gozos, escalas] = await Promise.all([listarAtivos(), listarFeriasGozo(), listarEscalas()]);
      setBombeiros(all);
      setFeriasGozo(gozos);
      const items: EscalaFeriasItem[] = [];
      for (const esc of escalas) {
        const it = await listarItensEscala(esc.id);
        items.push(...it);
      }
      setAllItems(items);
      setLoading(false);
    })();
  }, []);

  function isEmGozo(b: Bombeiro, mes: number, anoRef: number): FeriasGozo | null {
    const mesInicio = new Date(anoRef, mes - 1, 1);
    const mesFim = new Date(anoRef, mes, 0);
    for (const g of feriasGozo) {
      if (g.funcionarioId !== b.id) continue;
      if (g.status === 'Gozadas' || g.status === 'Em Gozo' || g.status === 'Programadas') {
        const gInicio = new Date(g.dataInicio + 'T00:00:00');
        const gFim = new Date(g.dataFim + 'T00:00:00');
        if (gInicio <= mesFim && gFim >= mesInicio) return g;
      }
    }
    return null;
  }

  function getItemSubstituicao(b: Bombeiro, mes: number): EscalaFeriasItem | null {
    return allItems.find(i =>
      i.funcionarioId === b.id && i.mes === mes && !i.rejeitado && i.substitutoId
    ) || null;
  }

  function getSubstituindo(b: Bombeiro, mes: number): { funcionario: Bombeiro; cargo: Cargo } | null {
    const item = allItems.find(i =>
      i.substitutoId === b.id && i.mes === mes && !i.rejeitado
    );
    if (!item) return null;
    const func = bombeiros.find(bb => bb.id === item.funcionarioId);
    return func ? { funcionario: func, cargo: (item.funcaoSubstituicao || func.cargo) as Cargo } : null;
  }

  function getFeristaDesignado(b: Bombeiro, mes: number): EscalaFeriasItem | null {
    return allItems.find(i =>
      i.funcionarioId === b.id && i.mes === mes && !i.rejeitado && i.feristaId
    ) || null;
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
        <div>
          <label className={labelCls}>Ano</label>
          <select value={ano} onChange={e => setAno(Number(e.target.value))} className={`${selectCls} !w-auto`}>
            {getAnos().map(a => <option key={a} value={a} className={optionCls}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Mes</label>
          <select value={mesSelecionado} onChange={e => setMesSelecionado(Number(e.target.value))} className={`${selectCls} !w-auto`}>
            {MESES.map((m, idx) => (
              <option key={idx} value={idx + 1} className={optionCls}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />
        <h3 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">
          Quadro de Efetivos - {MESES[mesSelecionado - 1]} {ano}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {equipes.map(eq => {
          const membros = sortPorHierarquia(bombeiros.filter(b => b.equipe === eq));
          const emGozo = membros.filter(m => isEmGozo(m, mesSelecionado, ano));
          const disponiveis = membros.filter(m => !isEmGozo(m, mesSelecionado, ano));

          return (
            <div key={eq} className="rounded-2xl border border-graphite-200 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
              <div className="flex items-center justify-between border-b border-graphite-200 px-4 py-3 dark:border-border-dark">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-aviation-500 to-aviation-700 text-[10px] font-bold text-white">
                    {eq.charAt(0)}
                  </div>
                  <h4 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">Equipe {eq}</h4>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:bg-green-900/20 dark:text-green-400">
                    {disponiveis.length} efetivo(s)
                  </span>
                  {emGozo.length > 0 && (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-bold text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                      {emGozo.length} em gozo
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 space-y-1.5">
                {membros.length === 0 ? (
                  <p className="py-4 text-center text-xs text-graphite-400 dark:text-graphite-500">Nenhum membro</p>
                ) : (
                  <>
                    {disponiveis.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400 px-1">Efetivos</p>
                        {disponiveis.map(m => {
                          const substituindo = getSubstituindo(m, mesSelecionado);
                          const item = getItemSubstituicao(m, mesSelecionado);
                          const ferista = getFeristaDesignado(m, mesSelecionado);
                          const temSub = !!(item?.substitutoNome || ferista?.feristaNome);

                          if (substituindo) {
                            const func = substituindo.funcionario;
                            return (
                              <div key={m.id} className="group relative rounded-xl border border-amber-300 bg-amber-50/50 px-3 py-2 transition-all dark:border-amber-700 dark:bg-amber-900/10"
                                title={`${m.nomeGuerra} substituindo ${func.nomeGuerra} (${ABBR_CARGO[substituindo.cargo] || substituindo.cargo})`}>
                                <div className="flex items-center gap-2.5 transition-all duration-300 group-hover:opacity-0 group-hover:scale-95">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-[10px] font-bold text-white">
                                    {m.nomeGuerra.charAt(0)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-graphite-900 dark:text-graphite-100 truncate">{m.nomeGuerra}</p>
                                    <p className="text-[10px] text-graphite-500 dark:text-graphite-400">{ABBR_CARGO[substituindo.cargo] || substituindo.cargo} · Substituto</p>
                                  </div>
                                </div>
                                <div className="absolute inset-0 flex items-center gap-2.5 rounded-xl opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-90 bg-amber-50 dark:bg-amber-900/20 px-3 py-2">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-red-600 text-xs font-bold text-white shadow-md shadow-red-500/30">
                                    {func.nomeGuerra.charAt(0)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-red-700 dark:text-red-300 truncate">{func.nomeGuerra}</p>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className="rounded-full bg-red-200 px-1.5 py-0.5 text-[8px] font-bold text-red-800 dark:bg-red-800/40 dark:text-red-300">Em gozo</span>
                                      <span className="text-[10px] text-red-600 dark:text-red-400">{ABBR_CARGO[substituindo.cargo] || substituindo.cargo}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div key={m.id} className={`group relative rounded-xl border px-3 py-2 transition-all ${
                              temSub
                                ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-900/10'
                                : 'border-green-200 bg-green-50/50 dark:border-green-800/30 dark:bg-green-900/10'
                            }`}>
                              {temSub ? (
                                <div className="group relative" title={`${m.nomeGuerra} · Substituído por ${item?.substitutoNome || ferista?.feristaNome || ''}`}>
                                  <div className="flex items-center gap-2.5 transition-all duration-300 group-hover:opacity-0 group-hover:scale-95">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-[10px] font-bold text-white">
                                      {item?.substitutoNome ? item.substitutoNome.charAt(0).toUpperCase() : ferista?.feristaNome?.charAt(0).toUpperCase() || 'S'}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-graphite-900 dark:text-graphite-100 truncate flex items-center gap-1">
                                        {item?.substitutoNome || ferista?.feristaNome || ''}
                                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">↔</span>
                                      </p>
                                      <p className="text-[10px] text-graphite-500 dark:text-graphite-400">Substituto</p>
                                    </div>
                                  </div>
                                  <div className="absolute inset-0 flex items-center gap-2.5 rounded-xl opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:scale-100 scale-90">
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-xs font-bold text-white shadow-md shadow-green-500/30">
                                      {m.nomeGuerra.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-green-700 dark:text-green-300 truncate">
                                        {m.nomeGuerra}
                                      </p>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <span className="rounded-full bg-green-200 px-1.5 py-0.5 text-[8px] font-bold text-green-800 dark:bg-green-800/40 dark:text-green-300">Substituído</span>
                                        <span className="text-[10px] text-green-600 dark:text-green-400">
                                          {ABBR_CARGO[m.cargo] || m.cargo}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-green-600 text-[10px] font-bold text-white">
                                    {m.foto ? <img src={m.foto} alt="" className="h-full w-full rounded-lg object-cover" /> : m.nomeGuerra.charAt(0)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-graphite-900 dark:text-graphite-100 truncate">{m.nomeGuerra}</p>
                                    <p className="text-[10px] text-graphite-500 dark:text-graphite-400">{ABBR_CARGO[m.cargo] || m.cargo}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {emGozo.length > 0 && (
                      <div className="space-y-1 mt-2">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 px-1">Em Gozo</p>
                        {emGozo.map(m => {
                          const gozo = isEmGozo(m, mesSelecionado, ano);
                          return (
                            <div key={m.id} className="flex items-center gap-2.5 rounded-xl border border-yellow-200 bg-yellow-50/50 px-3 py-2 opacity-70 dark:border-yellow-800/30 dark:bg-yellow-900/10"
                              title={gozo?.substitutoNome ? `${m.nomeGuerra} (${ABBR_CARGO[m.cargo] || m.cargo}) em gozo · Substituído por ${gozo.substitutoNome}` : `${m.nomeGuerra} (${ABBR_CARGO[m.cargo] || m.cargo}) em gozo`}>
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 text-[10px] font-bold text-white">
                                {m.nomeGuerra.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-graphite-700 dark:text-graphite-300 truncate line-through">{m.nomeGuerra}</p>
                                <p className="text-[10px] text-graphite-500 dark:text-graphite-400">
                                  {ABBR_CARGO[m.cargo] || m.cargo}
                                  {gozo && ` · ${fmt(gozo.dataInicio)} - ${fmt(gozo.dataFim)}`}
                                </p>
                              </div>
                              {gozo?.substitutoNome && (
                                <span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-semibold text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                                  → {gozo.substitutoNome.split(' ')[0]}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -- Modal Cadastro Ferias Manual (Admin / Gerente) ---------------------------------

function ModalCadastroFeriasManual({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { user } = useAuth();
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [feriasGozo, setFeriasGozo] = useState<FeriasGozo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFuncId, setSelectedFuncId] = useState('');
  const [selectedPeriodo, setSelectedPeriodo] = useState<number>(0);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [dias, setDias] = useState(30);
  const [subTipo, setSubTipo] = useState<'mesma-equipe' | 'outras-equipes' | 'ferista'>('mesma-equipe');
  const [substitutoId, setSubstitutoId] = useState('');
  const [feristaId, setFeristaId] = useState('');

  useEffect(() => {
    (async () => {
      const [b, g] = await Promise.all([listarAtivos(), listarFeriasGozo()]);
      setBombeiros(b);
      setFeriasGozo(g);
      setLoading(false);
    })();
  }, []);

  const selectedBombeiro = useMemo(
    () => bombeiros.find(b => b.id === selectedFuncId),
    [bombeiros, selectedFuncId],
  );

  const availablePeriodos = useMemo(() => {
    if (!selectedBombeiro) return [];
    const allPeriodos = calcularPeriodosAquisitivos(selectedBombeiro.dataAdmissao);
    const gozos = feriasGozo.filter(g => g.funcionarioId === selectedBombeiro.id);
    return allPeriodos.filter(p => {
      if (p.status === 'Vencido') return false;
      return !gozos.some(g => g.periodoNumero === p.numero);
    });
  }, [selectedBombeiro, feriasGozo]);

  const equipe = selectedBombeiro?.equipe || '';

  const availableSubstitutes = useMemo(() => {
    if (!selectedBombeiro || !dataInicio || !dataFim) return [];
    const disponiveis = bombeiros.filter(p => {
      if (p.id === selectedBombeiro.id) return false;
      if (subTipo === 'mesma-equipe') {
        if (p.equipe !== equipe) return false;
      } else if (subTipo === 'outras-equipes') {
        if (p.equipe === equipe || p.equipe === 'Ferista') return false;
      } else if (subTipo === 'ferista') {
        if (p.equipe !== 'Ferista') return false;
      }
      const onVacation = feriasGozo.some(g => {
        if (g.funcionarioId !== p.id) return false;
        if (g.status === 'Gozadas') return false;
        const gIni = new Date(g.dataInicio + 'T00:00:00');
        const gFim = new Date(g.dataFim + 'T00:00:00');
        const selIni = new Date(dataInicio + 'T00:00:00');
        const selFim = new Date(dataFim + 'T00:00:00');
        return gIni <= selFim && gFim >= selIni;
      });
      return !onVacation;
    });
    return disponiveis;
  }, [selectedBombeiro, equipe, dataInicio, dataFim, bombeiros, feriasGozo, subTipo]);

  const feristas = useMemo(
    () => bombeiros.filter(b => b.equipe === 'Ferista'),
    [bombeiros],
  );

  const formSubAutoFuncao = useMemo(() => selectedBombeiro?.cargo || '', [selectedBombeiro]);

  function handleDataInicioChange(value: string) {
    setDataInicio(value);
    if (value) {
      const d = new Date(value);
      d.setDate(d.getDate() + 29);
      setDataFim(d.toISOString().split('T')[0]);
      setDias(30);
    }
  }

  function handleDataFimChange(value: string) {
    setDataFim(value);
    if (dataInicio && value) setDias(calcDias(dataInicio, value));
  }

  async function handleSave() {
    if (!selectedBombeiro || !user || !selectedPeriodo) return;
    setSaving(true);
    const sub = bombeiros.find(b => b.id === substitutoId);
    await criarFeriasGozo({
      funcionarioId: selectedBombeiro.id,
      funcionarioNome: selectedBombeiro.nomeCompleto,
      equipe: equipe as Equipe,
      periodoNumero: selectedPeriodo,
      dataInicio,
      dataFim,
      dias,
      status: dataFim < new Date().toISOString().split('T')[0] ? 'Gozadas' : 'Programadas',
      substitutoId: substitutoId || '',
      substitutoNome: sub?.nomeCompleto || '',
      funcaoSubstituicao: sub ? (selectedBombeiro.cargo || '') : '',
      observacoes: feristaId ? `Ferista: ${feristas.find(f => f.id === feristaId)?.nomeCompleto || ''}` : '',
      modificadoPor: user.username,
      bloqueado: true,
    });
    setSaving(false);
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-elevated max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">Cadastrar Férias Manual</h2>
          <button onClick={onClose} className="rounded-xl p-1 text-graphite-400 hover:bg-graphite-100 dark:hover:bg-surface-hover">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Funcionário *</label>
              <select value={selectedFuncId} onChange={e => { setSelectedFuncId(e.target.value); setSelectedPeriodo(0); setSubstitutoId(''); setFeristaId(''); setDataInicio(''); setDataFim(''); }} className={selectCls}>
                <option value="" className={optionCls}>Selecione o funcionário</option>
                {bombeiros.map(b => (
                  <option key={b.id} value={b.id} className={optionCls}>
                    {b.nomeCompleto} ({ABBR_CARGO[b.cargo] || b.cargo}) - {b.equipe}
                  </option>
                ))}
              </select>
            </div>

            {selectedFuncId && (
              <div>
                <label className={labelCls}>Período Aquisitivo *</label>
                {availablePeriodos.length > 0 ? (
                  <select value={selectedPeriodo} onChange={e => setSelectedPeriodo(Number(e.target.value))} className={selectCls}>
                    <option value={0} className={optionCls}>Selecione o período</option>
                    {availablePeriodos.map(p => (
                      <option key={p.numero} value={p.numero} className={optionCls}>
                        Período {p.numero}: {fmt(p.dataInicio)} - {fmt(p.dataFim)} ({p.diasDireito} dias)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-yellow-900/20">
                    <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">Nenhum período disponível para este funcionário.</p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Data Início *</label>
                <input type="date" value={dataInicio} onChange={e => handleDataInicioChange(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Data Fim *</label>
                <input type="date" value={dataFim} onChange={e => handleDataFimChange(e.target.value)} className={inputCls} />
              </div>
            </div>

            {dataInicio && dataFim && (
              <div className="rounded-lg bg-aviation-50 p-3 dark:bg-aviation-900/20">
                <p className="text-sm font-semibold text-aviation-700 dark:text-aviation-300">
                  Período: {fmt(dataInicio)} a {fmt(dataFim)} · {dias} dias
                </p>
              </div>
            )}

            {selectedFuncId && selectedPeriodo && dataInicio && (
              <div className="space-y-3">
                <label className={labelCls}>Substituto</label>
                <div className="flex gap-2">
                  {(['mesma-equipe', 'outras-equipes', 'ferista'] as const).map(tipo => (
                    <button key={tipo} type="button" onClick={() => { setSubTipo(tipo); setSubstitutoId(''); setFeristaId(''); }}
                      className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                        subTipo === tipo
                          ? 'bg-aviation-600 text-white shadow-md'
                          : 'border border-graphite-300 bg-white text-graphite-600 hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-300'
                      }`}>
                      {tipo === 'mesma-equipe' ? 'Mesma Equipe' : tipo === 'outras-equipes' ? 'Outras Equipes' : 'Ferista'}
                    </button>
                  ))}
                </div>
                <select value={substitutoId} onChange={e => setSubstitutoId(e.target.value)} className={selectCls}>
                  <option value="" className={optionCls}>Nenhum</option>
                  {availableSubstitutes.map(m => (
                    <option key={m.id} value={m.id} className={optionCls}>
                      {m.nomeCompleto} ({ABBR_CARGO[m.cargo] || m.cargo}) - {m.equipe}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {substitutoId && formSubAutoFuncao && (
              <div className="rounded-lg bg-graphite-50 p-2 dark:bg-surface-card">
                <p className="text-xs text-graphite-600 dark:text-graphite-400">
                  Substituição automática: <span className="font-bold text-graphite-900 dark:text-graphite-100">{ABBR_CARGO[formSubAutoFuncao] || formSubAutoFuncao}</span> (mesma função do funcionário em gozo)
                </p>
              </div>
            )}

            {substitutoId && subTipo !== 'ferista' && (
              <div>
                <label className={labelCls}>Ferista</label>
                <select value={feristaId} onChange={e => setFeristaId(e.target.value)} className={selectCls}>
                  <option value="" className={optionCls}>Nenhum</option>
                  {feristas.map(m => (
                    <option key={m.id} value={m.id} className={optionCls}>{m.nomeCompleto}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-graphite-200 dark:border-border-dark">
              <button onClick={onClose} className="rounded-xl border border-graphite-300 bg-white px-4 py-2.5 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card dark:text-graphite-200">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!selectedFuncId || !selectedPeriodo || !dataInicio || !dataFim || saving}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all hover:shadow-xl disabled:opacity-50 active:scale-[0.98]"
              >
                <Save className="h-4 w-4" /> {saving ? 'Salvando...' : 'Cadastrar Férias'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Pagina Principal -------------------------------------------------------------

export function Ferias() {
  const { effectiveRole, user } = useAuth();
  const canManage = effectiveRole === 'desenvolvedor' || effectiveRole === 'admin' || effectiveRole === 'gerente';
  const [myEquipe, setMyEquipe] = useState<string | null>(null);
  const [resolving, setResolving] = useState(!canManage);
  const [tab, setTab] = useState<string>('');
  const [showCadastroManual, setShowCadastroManual] = useState(false);

  useEffect(() => {
    if (canManage) { setResolving(false); return; }
    if (!user) { setResolving(false); return; }
    listarAtivos().then(all => {
      const me = all.find(b => b.nomeCompleto === user.name);
      setMyEquipe(me?.equipe ?? null);
      setResolving(false);
    }).catch(() => setResolving(false));
  }, [canManage, user]);

  const adminTabs = [
    { key: 'bombeiros', label: 'Bombeiros', icon: Users },
    { key: 'aprovacoes', label: 'Aprovações', icon: FileText },
    { key: 'escala-geral', label: 'Escala Geral', icon: Eye },
    { key: 'escala', label: 'Escala Anual', icon: CalendarDays },
    { key: 'feristas', label: 'Escala Feristas', icon: User },
    { key: 'equipe', label: 'Minha Equipe', icon: Users },
    { key: 'efetivos', label: 'Quadro de Efetivos', icon: BarChart3 },
  ] as const;

  const chefeTabs = [
    { key: 'escala', label: 'Escala Anual', icon: CalendarDays },
    { key: 'equipe', label: 'Minha Equipe', icon: Users },
  ] as const;

  const tabs = canManage ? adminTabs : chefeTabs;

  useEffect(() => {
    if (!tab && tabs.length > 0) setTab(tabs[0].key);
  }, [tab, tabs]);

  if (resolving) {
    return (
      <PageContainer>
        <PageTitle icon={CalendarDays} title="Ferias" />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageTitle icon={CalendarDays} title="Ferias" />

      <DashboardFerias myEquipe={myEquipe} />

      <div className="mt-6 mb-6 flex flex-wrap items-center gap-2">
        {canManage && (
          <button
            onClick={() => setShowCadastroManual(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" /> Cadastrar Férias Manual
          </button>
        )}
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
      {tab === 'escala-geral' && <TabEscalaGeral />}
      {tab === 'escala' && <TabEscalaAnual />}
      {tab === 'feristas' && <TabEscalaFeristas />}
      {tab === 'equipe' && <TabMinhaEquipe />}
      {tab === 'efetivos' && <TabQuadroEfetivos />}

      {showCadastroManual && (
        <ModalCadastroFeriasManual
          onClose={() => setShowCadastroManual(false)}
          onSuccess={() => { setShowCadastroManual(false); }}
        />
      )}
    </PageContainer>
  );
}

export default Ferias;
