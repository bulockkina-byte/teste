import { useState, useEffect, useMemo } from 'react';
import type { Bombeiro } from '../../types/bombeiro';
import {
  BarChart3, TrendingUp, Shield, FileText, AlertTriangle, Users,
  Calendar, Clock, Flame, Droplets, Truck, Activity, Award,
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, Eye,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { listarAtivos } from '../../services/bombeiroService';
import { listarOcorrencias } from '../../services/ocorrenciaService';
import { listarPTRBs } from '../../services/ptrbService';
import { listarCertificacoes } from '../../services/certificacaoService';
import { listarFeriasGozo } from '../../services/feriasService';
import { listarSubstituicoesTemporarias } from '../../services/substituicaoTemporariaService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, AreaChart, Area,
  RadialBarChart, RadialBar,
} from 'recharts';

type PieLabelProps = any;

const EQUIPES = ['Alfa', 'Bravo', 'Charlie', 'Delta'] as const;

const CORES = {
  Alfa: '#3b82f6', Bravo: '#f59e0b', Charlie: '#10b981', Delta: '#8b5cf6',
  Feirista: '#ec4899', Embaixador: '#6b7280',
};

const CATEGORIA_CORES: Record<string, string> = {
  'Incêndio': '#ef4444', 'Resgate': '#f97316', 'Emergência Aeronáutica': '#3b82f6',
  'Vazamento': '#06b6d4', 'Equipamento': '#8b5cf6', 'Infraestrutura': '#6b7280',
  'Treinamento': '#10b981', 'Outros': '#a3a3a3',
};

function getMeses(count = 12) {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return `${meses[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`;
  });
}

function chaveMes(data: string) {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const d = new Date(data + (data.includes('T') ? '' : 'T00:00:00'));
  return `${meses[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`;
}

function fmtNum(n: number) {
  return n.toLocaleString('pt-BR');
}

// ── Stat Card ─────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, trend, color, onClick }: {
  icon: any; label: string; value: string | number; sub?: string; trend?: 'up' | 'down'; color: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} disabled={!onClick}
      className="group relative overflow-hidden rounded-2xl border border-graphite-200/60 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 dark:border-border-dark dark:bg-surface-card">
      <div className={`absolute right-0 top-0 h-24 w-24 -translate-y-6 translate-x-6 rounded-full opacity-[0.08] transition-all duration-500 group-hover:scale-150 ${color}`} />
      <div className="relative">
        <div className="mb-3 flex items-center justify-between">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          {trend && (
            <span className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
              trend === 'up' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            </span>
          )}
        </div>
        <p className="text-3xl font-black text-graphite-900 dark:text-graphite-100">{typeof value === 'number' ? fmtNum(value) : value}</p>
        <p className="mt-0.5 text-xs font-medium text-graphite-500 dark:text-graphite-400">{label}</p>
        {sub && <p className="mt-0.5 text-[10px] text-graphite-400 dark:text-graphite-500">{sub}</p>}
      </div>
    </button>
  );
}

// ── Section Card ──────────────────────────────────────────

function SectionCard({ title, icon: Icon, children, className = '' }: { title: string; icon?: any; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-graphite-200/60 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card ${className}`}>
      {title && (
        <div className="flex items-center gap-2 border-b border-graphite-200/60 px-6 py-4 dark:border-border-dark">
          {Icon && <Icon className="h-4 w-4 text-aviation-600 dark:text-aviation-400" />}
          <h3 className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{title}</h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Mini Progress ─────────────────────────────────────────

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-graphite-700 dark:text-graphite-300">{label}</span>
        <span className="font-bold text-graphite-900 dark:text-graphite-100">{value}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-graphite-100 dark:bg-graphite-800">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  TAB: VISÃO GERAL
// ═══════════════════════════════════════════════════════════

function TabVisaoGeral() {
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [ptrbs, setPtrbs] = useState<any[]>([]);
  const [certsCount, setCertsCount] = useState(0);
  const [subsCount, setSubsCount] = useState(0);
  useEffect(() => { listarAtivos().then(setBombeiros); }, []);
  useEffect(() => { listarOcorrencias().then(setOcorrencias); }, []);
  useEffect(() => { listarPTRBs().then(setPtrbs); }, []);
  useEffect(() => { listarCertificacoes().then(c => setCertsCount(c.length)); }, []);
  useEffect(() => { listarSubstituicoesTemporarias().then(s => { if (Array.isArray(s)) setSubsCount(s.filter((x: any) => x.status === 'Pendente').length); }); }, []);
  const feriasGozo = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('sescinc-ferias-gozo') || '[]'); } catch { return []; }
  }, []) as any[];

  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  const stats = useMemo(() => {
    const ocorrenciasMes = ocorrencias.filter(o => {
      const d = new Date(o.data + 'T00:00:00');
      return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    });
    const emFerias = feriasGozo.filter((g: any) => g.status === 'Em Gozo');
    const porEquipe = EQUIPES.map(eq => ({
      equipe: eq, total: bombeiros.filter(b => b.equipe === eq).length, cor: CORES[eq],
    }));
    const porCargo = ['BA-CE', 'BA-LR', 'BA-MC', 'BA-2', 'BA-RE'].map(c => ({
      cargo: c, total: bombeiros.filter(b => b.cargo === c).length,
    }));
    return { ocorrenciasMes: ocorrenciasMes.length, emFerias: emFerias.length, porEquipe, porCargo };
  }, [bombeiros, ocorrencias, feriasGozo, mesAtual, anoAtual]);

  const timeline = useMemo(() => {
    const meses = getMeses();
    const mapO: Record<string, number> = {}; meses.forEach(m => mapO[m] = 0);
    const mapT: Record<string, number> = {}; meses.forEach(m => mapT[m] = 0);
    ocorrencias.forEach(o => { const k = chaveMes(o.data); if (k in mapO) mapO[k]++; });
    ptrbs.forEach(p => { const k = chaveMes(p.data); if (k in mapT) mapT[k]++; });
    return meses.map(m => ({ mes: m, Ocorrências: mapO[m], Treinamentos: mapT[m] }));
  }, [ocorrencias]);

  const porCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    ocorrencias.forEach(o => { map[o.categoria] = (map[o.categoria] || 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value, cor: CATEGORIA_CORES[name] || '#a3a3a3' })).sort((a, b) => b.value - a.value);
  }, [ocorrencias]);

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="Efetivo Total" value={bombeiros.length} sub={`${stats.porEquipe.length} equipes`} trend="up" color="bg-gradient-to-br from-blue-500 to-blue-700" />
        <StatCard icon={AlertTriangle} label="Ocorrências (mês)" value={stats.ocorrenciasMes} sub={`${ocorrencias.length} total`} color="bg-gradient-to-br from-red-500 to-red-700" />
        <StatCard icon={Calendar} label="Em Férias" value={stats.emFerias} color="bg-gradient-to-br from-amber-500 to-amber-700" />
        <StatCard icon={Activity} label="Certificações" value={certsCount} color="bg-gradient-to-br from-emerald-500 to-emerald-700" />
        <StatCard icon={Truck} label="Viaturas CCI" value={useMemo(() => { try { return JSON.parse(localStorage.getItem('sescinc-viaturas') || '[]').length; } catch { return 0; }}, [])} color="bg-gradient-to-br from-cyan-500 to-cyan-700" />
        <StatCard icon={Clock} label="Substituições" value={subsCount} color="bg-gradient-to-br from-purple-500 to-purple-700" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Efetivo por Equipe" icon={Users}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.porEquipe} barSize={48}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="equipe" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {stats.porEquipe.map((e, i) => <Cell key={i} fill={e.cor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {stats.porEquipe.map(e => (
              <div key={e.equipe} className="rounded-xl bg-graphite-50 p-2 text-center dark:bg-surface-hover">
                <p className="text-lg font-black" style={{ color: e.cor }}>{e.total}</p>
                <p className="text-[10px] font-medium text-graphite-500">{e.equipe}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Ocorrências por Categoria" icon={Flame}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={porCategoria} cx="50%" cy="50%" innerRadius={55} outerRadius={100}
                paddingAngle={3} dataKey="value"
                label={({ name, percent }: PieLabelProps) => `${String(name)} ${((percent || 0) * 100).toFixed(0)}%`}>
                {porCategoria.map((e, i) => <Cell key={i} fill={e.cor} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* Timeline */}
      <SectionCard title="Evolução — Ocorrências e Treinamentos" icon={TrendingUp}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={timeline}>
            <defs>
              <linearGradient id="gradO" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
              <linearGradient id="gradT" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.2} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip />
            <Legend iconType="circle" />
            <Area type="monotone" dataKey="Ocorrências" stroke="#ef4444" strokeWidth={2} fill="url(#gradO)" dot={{ r: 3, fill: '#ef4444' }} />
            <Area type="monotone" dataKey="Treinamentos" stroke="#10b981" strokeWidth={2} fill="url(#gradT)" dot={{ r: 3, fill: '#10b981' }} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* Cargos */}
      <SectionCard title="Distribuição por Cargo" icon={Award}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
          {stats.porCargo.map(c => (
            <div key={c.cargo} className="rounded-xl border border-graphite-200/60 bg-graphite-50/50 p-4 text-center dark:border-border-dark dark:bg-surface-hover/50">
              <p className="text-xl font-black text-graphite-900 dark:text-graphite-100">{c.total}</p>
              <p className="mt-0.5 text-[10px] font-semibold text-graphite-500">{c.cargo}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  TAB: TREINAMENTOS
// ═══════════════════════════════════════════════════════════

function TabTreinamentos() {
  const [ptrbs, setPtrbs] = useState<any[]>([]);
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  useEffect(() => { listarAtivos().then(setBombeiros); }, []);
  useEffect(() => { listarPTRBs().then(setPtrbs); }, []);
  const [periodo, setPeriodo] = useState<1 | 3 | 6 | 12>(6);

  const filtrados = useMemo(() => {
    const d = new Date(); d.setMonth(d.getMonth() - periodo);
    return ptrbs.filter(p => new Date(p.data + 'T00:00:00') >= d);
  }, [ptrbs, periodo]);

  const porEquipe = useMemo(() => EQUIPES.map(e => ({
    equipe: e, total: filtrados.filter(p => p.equipe === e).length, cor: CORES[e],
  })), [filtrados]);

  const horasPorEquipe = useMemo(() => EQUIPES.map(e => {
    let horas = 0;
    filtrados.filter(p => p.equipe === e).forEach(p => {
      if (p.horaInicio && p.horaTermino) {
        const [h1, m1] = p.horaInicio.split(':').map(Number);
        const [h2, m2] = p.horaTermino.split(':').map(Number);
        const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (mins > 0) horas += mins / 60;
      }
    });
    return { equipe: e, horas: Math.round(horas * 10) / 10, cor: CORES[e] };
  }), [filtrados]);

  const topAssuntos = useMemo(() => {
    const map: Record<string, number> = {};
    filtrados.forEach(p => { map[p.assuntoMinistrado] = (map[p.assuntoMinistrado] || 0) + 1; });
    return Object.entries(map).map(([a, t]) => ({ assunto: a, total: t })).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [filtrados]);

  const topInstrutores = useMemo(() => {
    const map: Record<string, number> = {};
    filtrados.forEach(p => { if (p.instrutor) map[p.instrutor] = (map[p.instrutor] || 0) + 1; });
    return Object.entries(map).map(([n, t]) => ({ nome: n, total: t })).sort((a, b) => b.total - a.total).slice(0, 6);
  }, [filtrados]);

  const participacoes = useMemo(() => {
    const map: Record<string, { nome: string; equipe: string; total: number }> = {};
    filtrados.forEach(p => {
      p.participantes.forEach(part => {
        if (!map[part.nomeCompleto]) {
          const b = bombeiros.find(x => x.nomeCompleto === part.nomeCompleto);
          map[part.nomeCompleto] = { nome: part.nomeCompleto, equipe: b?.equipe || 'N/A', total: 0 };
        }
        map[part.nomeCompleto].total++;
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filtrados, bombeiros]);

  const maxP = Math.max(...participacoes.map(p => p.total), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-graphite-600 dark:text-graphite-400">Período:</span>
        {([1, 3, 6, 12] as const).map(m => (
          <button key={m} onClick={() => setPeriodo(m)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              periodo === m ? 'bg-gradient-to-r from-aviation-600 to-aviation-700 text-white shadow-lg' : 'border border-graphite-300 bg-white text-graphite-600 hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card'
            }`}>{m === 1 ? '1 mês' : `${m} meses`}</button>
        ))}
        <span className="ml-auto text-xs text-graphite-400">{filtrados.length} treino(s)</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard title="Treinos por Equipe" icon={Activity}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={porEquipe} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="equipe" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {porEquipe.map((e, i) => <Cell key={i} fill={e.cor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Horas de Treinamento" icon={Clock}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={horasPorEquipe} barSize={40}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="equipe" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip cursor={{ fill: 'rgba(0,0,0,0.04)' }} formatter={(v: unknown) => `${v}h`} />
              <Bar dataKey="horas" radius={[6, 6, 0, 0]}>
                {horasPorEquipe.map((e, i) => <Cell key={i} fill={e.cor} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Top Assuntos" icon={FileText}>
          <div className="space-y-2">
            {topAssuntos.map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-graphite-50 px-3 py-2 dark:bg-surface-hover">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-aviation-100 text-[10px] font-bold text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">{i + 1}</span>
                <span className="flex-1 truncate text-sm font-medium text-graphite-900 dark:text-graphite-100">{a.assunto}</span>
                <span className="rounded-full bg-aviation-100 px-2 py-0.5 text-[10px] font-bold text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">{a.total}x</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Instrutores Mais Ativos" icon={Award}>
          <div className="space-y-2">
            {topInstrutores.map((inst, i) => {
              const maxV = Math.max(...topInstrutores.map(x => x.total), 1);
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-graphite-50 px-4 py-2.5 dark:bg-surface-hover">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-aviation-500 to-aviation-700 text-xs font-bold text-white">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100 truncate">{inst.nome}</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-graphite-200 dark:bg-graphite-700">
                      <div className="h-full rounded-full bg-gradient-to-r from-aviation-500 to-aviation-600" style={{ width: `${(inst.total / maxV) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{inst.total}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Maiores Participações" icon={Users}>
          <div className="space-y-2">
            {participacoes.map((p, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-graphite-50 px-3 py-2 dark:bg-surface-hover">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-graphite-200 text-[10px] font-bold text-graphite-600 dark:bg-graphite-700 dark:text-graphite-300">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-graphite-900 dark:text-graphite-100 truncate">{p.nome}</p>
                  <p className="text-[10px] text-graphite-500">{p.equipe}</p>
                </div>
                <div className="h-1.5 w-16 rounded-full bg-graphite-200 dark:bg-graphite-700">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(p.total / maxP) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-graphite-900 dark:text-graphite-100">{p.total}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  TAB: CERTIFICAÇÕES
// ═══════════════════════════════════════════════════════════

function TabCertificacoes() {
  const [certs, setCerts] = useState<any[]>([]);
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  useEffect(() => { listarAtivos().then(setBombeiros); }, []);
  useEffect(() => { listarCertificacoes().then(setCerts); }, []);
  const agora = new Date();

  const stats = useMemo(() => {
    const validas: Record<string, number> = {}; const vencendo: Record<string, number> = {}; const vencidas: Record<string, number> = {};
    EQUIPES.forEach(e => { validas[e] = 0; vencendo[e] = 0; vencidas[e] = 0; });
    const tresMeses = new Date(agora); tresMeses.setMonth(tresMeses.getMonth() + 3);
    certs.forEach(c => {
      const b = bombeiros.find(x => x.id === c.funcionarioId);
      if (!b || !(b.equipe in validas)) return;
      const v = new Date(c.dataValidade + 'T00:00:00');
      if (v < agora) vencidas[b.equipe]++;
      else if (v <= tresMeses) vencendo[b.equipe]++;
      else validas[b.equipe]++;
    });
    const totalV = Object.values(validas).reduce((a, b) => a + b, 0);
    const totalVe = Object.values(vencendo).reduce((a, b) => a + b, 0);
    const totalVenc = Object.values(vencidas).reduce((a, b) => a + b, 0);
    return { validas, vencendo, vencidas, totalV, totalVe, totalVenc, porEquipe: EQUIPES.map(e => ({ equipe: e, validas: validas[e], vencendo: vencendo[e], vencidas: vencidas[e] })) };
  }, [certs, bombeiros, agora]);

  const porNR = useMemo(() => {
    const map: Record<string, number> = {};
    certs.forEach(c => { const k = `${c.nrNumero} - ${c.nrNome}`; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([nr, total]) => ({ nr, total })).sort((a, b) => b.total - a.total);
  }, [certs]);

  const vencendoList = useMemo(() => {
    const tresMeses = new Date(agora); tresMeses.setMonth(tresMeses.getMonth() + 3);
    return certs.filter(c => { const v = new Date(c.dataValidade + 'T00:00:00'); return v >= agora && v <= tresMeses; })
      .map(c => {
        const b = bombeiros.find(x => x.id === c.funcionarioId);
        return { ...c, equipe: b?.equipe || 'N/A', dias: Math.ceil((new Date(c.dataValidade + 'T00:00:00').getTime() - agora.getTime()) / 86400000) };
      }).sort((a, b) => a.dias - b.dias).slice(0, 8);
  }, [certs, bombeiros, agora]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 dark:border-emerald-800 dark:from-emerald-900/20 dark:to-surface-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Válidas</p>
          <p className="text-3xl font-black text-emerald-700 dark:text-emerald-300">{stats.totalV}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 dark:border-amber-800 dark:from-amber-900/20 dark:to-surface-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Vencendo (3m)</p>
          <p className="text-3xl font-black text-amber-700 dark:text-amber-300">{stats.totalVe}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-white p-5 dark:border-red-800 dark:from-red-900/20 dark:to-surface-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Vencidas</p>
          <p className="text-3xl font-black text-red-700 dark:text-red-300">{stats.totalVenc}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Certificações por Equipe" icon={Shield}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={stats.porEquipe} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="equipe" tick={{ fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip />
              <Legend iconType="circle" />
              <Bar dataKey="validas" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} name="Válidas" />
              <Bar dataKey="vencendo" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} name="Vencendo" />
              <Bar dataKey="vencidas" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} name="Vencidas" />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Certificações por NR" icon={FileText}>
          <div className="max-h-[260px] space-y-2 overflow-y-auto">
            {porNR.map((nr, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl bg-graphite-50 px-3 py-2 dark:bg-surface-hover">
                <span className="flex-1 text-xs text-graphite-900 dark:text-graphite-100 truncate">{nr.nr}</span>
                <div className="h-2 w-20 rounded-full bg-graphite-200 dark:bg-graphite-700">
                  <div className="h-full rounded-full bg-aviation-500" style={{ width: `${(nr.total / Math.max(...porNR.map(x => x.total))) * 100}%` }} />
                </div>
                <span className="text-xs font-bold text-graphite-900 dark:text-graphite-100 w-6 text-right">{nr.total}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {vencendoList.length > 0 && (
        <SectionCard title="Certificações Próximas ao Vencimento" icon={AlertTriangle}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-graphite-200 dark:border-border-dark">
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-graphite-400">Funcionário</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-graphite-400">Eq.</th>
                  <th className="px-3 py-2 text-left text-[10px] font-bold uppercase text-graphite-400">NR</th>
                  <th className="px-3 py-2 text-right text-[10px] font-bold uppercase text-graphite-400">Dias</th>
                </tr>
              </thead>
              <tbody>
                {vencendoList.map((c, i) => (
                  <tr key={i} className="border-b border-graphite-100 dark:border-border-dark">
                    <td className="px-3 py-2.5 font-medium text-graphite-900 dark:text-graphite-100">{c.funcionarioNome}</td>
                    <td className="px-3 py-2.5"><span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: CORES[c.equipe] || '#6b7280' }}>{c.equipe}</span></td>
                    <td className="px-3 py-2.5 text-graphite-600 dark:text-graphite-400">{c.nrNumero}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.dias <= 30 ? 'bg-red-100 text-red-700' : c.dias <= 60 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>{c.dias}d</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  TAB: DESEMPENHO
// ═══════════════════════════════════════════════════════════

function TabDesempenho() {
  const [ptrbs, setPtrbs] = useState<any[]>([]);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  useEffect(() => { listarAtivos().then(setBombeiros); }, []);
  useEffect(() => { listarPTRBs().then(setPtrbs); }, []);
  useEffect(() => { listarOcorrencias().then(setOcorrencias); }, []);

  const meses = getMeses();

  const ocorrenciasPorMes = useMemo(() => {
    const map: Record<string, number> = {};
    meses.forEach(m => map[m] = 0);
    ocorrencias.forEach(o => { const k = chaveMes(o.data); if (k in map) map[k]++; });
    return meses.map(m => ({ mes: m, total: map[m] }));
  }, [ocorrencias, meses]);

  const ptrbsPorMes = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    meses.forEach(m => { map[m] = {}; EQUIPES.forEach(e => { map[m][e] = 0; }); });
    ptrbs.forEach(p => {
      const k = chaveMes(p.data);
      if (map[k] && p.equipe in map[k]) map[k][p.equipe]++;
    });
    return meses.map(m => ({ mes: m, ...map[m] }));
  }, [ptrbs, meses]);

  const statusOcor = useMemo(() => {
    const map: Record<string, number> = {};
    ocorrencias.forEach(o => { map[o.status] = (map[o.status] || 0) + 1; });
    return Object.entries(map).map(([s, t]) => ({ status: s, total: t }));
  }, [ocorrencias]);

  const efetivoTurno = useMemo(() => {
    const map: Record<string, number> = {};
    bombeiros.forEach(b => { map[b.turno] = (map[b.turno] || 0) + 1; });
    return Object.entries(map).map(([turno, total]) => ({ turno, total }));
  }, [bombeiros]);

  const topOcorrencias = useMemo(() => {
    const map: Record<string, number> = {};
    ocorrencias.forEach(o => { const k = `${o.categoria}`; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([c, t]) => ({ categoria: c, total: t })).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [ocorrencias]);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <SectionCard title="Ocorrências Mensais" icon={AlertTriangle}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={ocorrenciasPorMes}>
              <defs><linearGradient id="gradO2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} /><stop offset="100%" stopColor="#ef4444" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#ef4444" strokeWidth={2} fill="url(#gradO2)" dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Treinos por Equipe (12m)" icon={Activity}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ptrbsPorMes}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis hide allowDecimals={false} />
              <Tooltip />
              <Legend iconType="circle" />
              {EQUIPES.map(eq => <Bar key={eq} dataKey={eq} fill={CORES[eq]} radius={[4, 4, 0, 0]} stackId="a" />)}
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Status das Ocorrências" icon={Activity}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusOcor} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="total"
                label={({ status, percent }: PieLabelProps) => `${String(status)} ${((percent || 0) * 100).toFixed(0)}%`}>
                {statusOcor.map((_, i) => <Cell key={i} fill={['#3b82f6', '#f59e0b', '#f97316', '#10b981'][i % 4]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Efetivo por Turno" icon={Users}>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={efetivoTurno} cx="50%" cy="50%" outerRadius={80} paddingAngle={3} dataKey="total"
                label={({ turno, percent }: PieLabelProps) => `${String(turno)} ${((percent || 0) * 100).toFixed(0)}%`}>
                {efetivoTurno.map((_, i) => <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'][i % 4]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Top Categorias de Ocorrências" icon={Flame}>
          <div className="space-y-2">
            {topOcorrencias.map((o, i) => {
              const maxV = Math.max(...topOcorrencias.map(x => x.total), 1);
              return (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-graphite-50 px-3 py-2 dark:bg-surface-hover">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100 text-[10px] font-bold text-red-600 dark:bg-red-900/30 dark:text-red-400">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-graphite-900 dark:text-graphite-100">{o.categoria}</p>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-graphite-200 dark:bg-graphite-700">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${(o.total / maxV) * 100}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{o.total}</span>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════

const TABS = [
  { key: 'geral', label: 'Visão Geral', icon: BarChart3 },
  { key: 'treinamentos', label: 'Treinamentos', icon: Activity },
  { key: 'certificacoes', label: 'Certificações', icon: Shield },
  { key: 'desempenho', label: 'Desempenho', icon: TrendingUp },
] as const;

type TabKey = typeof TABS[number]['key'];

export function Estatisticas() {
  const [tab, setTab] = useState<TabKey>('geral');

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between">
        <PageTitle icon={BarChart3} title="Estatísticas" />
      </div>

      <div className="mb-6 flex gap-1 rounded-2xl border border-graphite-200/60 bg-graphite-50/50 p-1 dark:border-border-dark dark:bg-surface-card/50">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
              tab === t.key
                ? 'bg-white text-graphite-900 shadow-sm dark:bg-surface-card dark:text-graphite-100'
                : 'text-graphite-500 hover:text-graphite-700 dark:text-graphite-400 dark:hover:text-graphite-300'
            }`}>
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'geral' && <TabVisaoGeral />}
      {tab === 'treinamentos' && <TabTreinamentos />}
      {tab === 'certificacoes' && <TabCertificacoes />}
      {tab === 'desempenho' && <TabDesempenho />}
    </PageContainer>
  );
}

export default Estatisticas;
