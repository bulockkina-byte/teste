import { useState, useEffect, useMemo } from 'react';
import type { Bombeiro } from '../../types/bombeiro';
import {
  BarChart3, AlertTriangle, TrendingUp,
  Shield, FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { listarAtivos } from '../../services/bombeiroService';
import { listarOcorrencias } from '../../services/ocorrenciaService';
import { listarPTRBs } from '../../services/ptrbService';
import { listarCertificacoes } from '../../services/certificacaoService';
import { listarFerias } from '../../services/feriasService';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PieLabelProps = any;

const TABS = [
  { key: 'geral', label: 'Geral', icon: BarChart3 },
  { key: 'treinamentos', label: 'Treinamentos', icon: FileText },
  { key: 'certificacoes', label: 'Certificações', icon: Shield },
  { key: 'desempenho', label: 'Desempenho', icon: TrendingUp },
] as const;

type TabKey = typeof TABS[number]['key'];

const EQUIPES_OPERACIONAIS = ['Alfa', 'Bravo', 'Charlie', 'Delta'] as const;

const CORES_EQUIPE: Record<string, string> = {
  Alfa: '#3b82f6',
  Bravo: '#f59e0b',
  Charlie: '#10b981',
  Delta: '#8b5cf6',
  Feirista: '#ec4899',
  'Embaixador': '#6b7280',
};

const CORES_CATEGORIA: Record<string, string> = {
  'Incêndio': '#ef4444',
  'Resgate': '#f97316',
  'Emergência Aeronáutica': '#3b82f6',
  'Vazamento': '#06b6d4',
  'Equipamento': '#8b5cf6',
  'Infraestrutura': '#6b7280',
  'Treinamento': '#10b981',
  'Outros': '#a3a3a3',
};

const STATUS_CERT_COLORS = {
  valida: '#10b981',
  vencendo: '#f59e0b',
  vencida: '#ef4444',
};

function getMeses(): string[] {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const agora = new Date();
  const resultado: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    resultado.push(`${meses[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`);
  }
  return resultado;
}

function chaveMes(data: string): string {
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const d = new Date(data + (data.includes('T') ? '' : 'T00:00:00'));
  return `${meses[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`;
}

/* ───────── Tab: Geral ───────── */

function TabGeral() {
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  useEffect(() => { (async () => { setBombeiros(await listarAtivos()); })(); }, []);
  const ocorrencias = useMemo(() => listarOcorrencias(), []);
  const ptrbs = useMemo(() => listarPTRBs(), []);
  const certificacoes = useMemo(() => listarCertificacoes(), []);
  const ferias = useMemo(() => listarFerias(), []);

  const agora = new Date();
  const mesAtual = agora.getMonth();
  const anoAtual = agora.getFullYear();

  const ocorrenciasMes = ocorrencias.filter(o => {
    const d = new Date(o.data + 'T00:00:00');
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  const ptrbsMes = ptrbs.filter(p => {
    const d = new Date(p.data + 'T00:00:00');
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  const certVencidas = certificacoes.filter(c => new Date(c.dataValidade + 'T00:00:00') < agora).length;

  const porEquipeOcorrencias = useMemo(() => {
    const mapa: Record<string, number> = {};
    EQUIPES_OPERACIONAIS.forEach(e => { mapa[e] = 0; });
    ocorrencias.forEach(o => {
      if (mapa[o.equipe] !== undefined) mapa[o.equipe]++;
    });
    return EQUIPES_OPERACIONAIS.map(e => ({ equipe: e, total: mapa[e] || 0, cor: CORES_EQUIPE[e] }));
  }, [ocorrencias]);

  const porCategoria = useMemo(() => {
    const mapa: Record<string, number> = {};
    ocorrencias.forEach(o => {
      mapa[o.categoria] = (mapa[o.categoria] || 0) + 1;
    });
    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value, cor: CORES_CATEGORIA[name] || '#a3a3a3' }))
      .sort((a, b) => b.value - a.value);
  }, [ocorrencias]);

  const timeline = useMemo(() => {
    const meses = getMeses();
    const mapaOcorrencias: Record<string, number> = {};
    const mapaPtrbs: Record<string, number> = {};
    meses.forEach(m => { mapaOcorrencias[m] = 0; mapaPtrbs[m] = 0; });
    ocorrencias.forEach(o => { const k = chaveMes(o.data); if (mapaOcorrencias[k] !== undefined) mapaOcorrencias[k]++; });
    ptrbs.forEach(p => { const k = chaveMes(p.data); if (mapaPtrbs[k] !== undefined) mapaPtrbs[k]++; });
    return meses.map(m => ({ mes: m, ocorrencias: mapaOcorrencias[m], treinamentos: mapaPtrbs[m] }));
  }, [ocorrencias, ptrbs]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-graphite-200 bg-white p-4 dark:border-border-dark dark:bg-surface-card">
          <p className="text-[10px] font-bold uppercase tracking-wider text-graphite-400">Efetivo Ativo</p>
          <p className="text-2xl font-black text-graphite-900 dark:text-graphite-100">{bombeiros.length}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Equipes</p>
          <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{EQUIPES_OPERACIONAIS.length}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Ocorrências (mês)</p>
          <p className="text-2xl font-black text-red-700 dark:text-red-300">{ocorrenciasMes.length}</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-500">Treinos (mês)</p>
          <p className="text-2xl font-black text-green-700 dark:text-green-300">{ptrbsMes.length}</p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">Cert. Válidas</p>
          <p className="text-2xl font-black text-yellow-700 dark:text-yellow-300">{certificacoes.length - certVencidas}</p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-900/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-500">Em Férias</p>
          <p className="text-2xl font-black text-orange-700 dark:text-orange-300">{ferias.filter(f => f.status === 'Em Gozo').length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Ocorrências por Equipe (Total)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={porEquipeOcorrencias}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="equipe" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {porEquipeOcorrencias.map((entry, i) => (
                  <Cell key={i} fill={entry.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Ocorrências por Categoria</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={porCategoria} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                paddingAngle={3} dataKey="value" label={(props: PieLabelProps) => `${String(props.name)} ${(((props.percent as number) || 0) * 100).toFixed(0)}%`}>
                {porCategoria.map((entry, i) => (
                  <Cell key={i} fill={entry.cor} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
        <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Evolução nos Últimos 12 Meses</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="ocorrencias" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Ocorrências" />
            <Line type="monotone" dataKey="treinamentos" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Treinamentos" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
        <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Efetivo por Equipe</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {EQUIPES_OPERACIONAIS.map(eq => {
            const membros = bombeiros.filter(b => b.equipe === eq);
            return (
              <div key={eq} className="rounded-xl border border-graphite-200 bg-graphite-50 p-4 dark:border-border-dark dark:bg-surface-hover">
                <div className="mb-2 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CORES_EQUIPE[eq] }} />
                  <span className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{eq}</span>
                </div>
                <p className="text-2xl font-black text-graphite-900 dark:text-graphite-100">{membros.length}</p>
                <div className="mt-2 space-y-0.5">
                  {(['BA-CE', 'BA-LR', 'BA-MC', 'BA-RE', 'BA-2', 'OC'] as const).map(cargo => {
                    const qtd = membros.filter(b => b.cargo === cargo).length;
                    if (qtd === 0) return null;
                    return (
                      <p key={cargo} className="text-[10px] text-graphite-500 dark:text-graphite-400">
                        {cargo}: {qtd}
                      </p>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ───────── Tab: Treinamentos ───────── */

function TabTreinamentos() {
  const ptrbs = useMemo(() => listarPTRBs(), []);
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  useEffect(() => { (async () => { setBombeiros(await listarAtivos()); })(); }, []);
  const [filtroMeses, setFiltroMeses] = useState<1 | 3 | 6 | 12>(6);
  const [expandedAssunto, setExpandedAssunto] = useState<string | null>(null);

  const ptrbsFiltrados = useMemo(() => {
    const agora = new Date();
    const desde = new Date(agora);
    desde.setMonth(desde.getMonth() - filtroMeses);
    return ptrbs.filter(p => new Date(p.data + 'T00:00:00') >= desde);
  }, [ptrbs, filtroMeses]);

  const porEquipe = useMemo(() => {
    const mapa: Record<string, number> = {};
    EQUIPES_OPERACIONAIS.forEach(e => { mapa[e] = 0; });
    ptrbsFiltrados.forEach(p => {
      if (mapa[p.equipe] !== undefined) mapa[p.equipe]++;
    });
    return EQUIPES_OPERACIONAIS.map(e => ({ equipe: e, total: mapa[e] || 0, cor: CORES_EQUIPE[e] }));
  }, [ptrbsFiltrados]);

  const porAssunto = useMemo(() => {
    const mapa: Record<string, { total: number; equipes: Set<string> }> = {};
    ptrbsFiltrados.forEach(p => {
      if (!mapa[p.assuntoMinistrado]) mapa[p.assuntoMinistrado] = { total: 0, equipes: new Set() };
      mapa[p.assuntoMinistrado].total++;
      mapa[p.assuntoMinistrado].equipes.add(p.equipe);
    });
    return Object.entries(mapa)
      .map(([assunto, dados]) => ({ assunto, ...dados, equipesList: Array.from(dados.equipes) }))
      .sort((a, b) => b.total - a.total);
  }, [ptrbsFiltrados]);

  const porInstrutor = useMemo(() => {
    const mapa: Record<string, number> = {};
    ptrbsFiltrados.forEach(p => {
      if (p.instrutor) mapa[p.instrutor] = (mapa[p.instrutor] || 0) + 1;
    });
    return Object.entries(mapa)
      .map(([nome, total]) => ({ nome, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [ptrbsFiltrados]);

  const participacoesPorMembro = useMemo(() => {
    const mapa: Record<string, { nome: string; equipe: string; total: number }> = {};
    ptrbsFiltrados.forEach(p => {
      p.participantes.forEach(part => {
        const key = part.nomeCompleto;
        if (!mapa[key]) {
          const b = bombeiros.find(x => x.nomeCompleto === part.nomeCompleto);
          mapa[key] = { nome: part.nomeCompleto, equipe: b?.equipe || 'N/A', total: 0 };
        }
        mapa[key].total++;
      });
    });
    return Object.values(mapa).sort((a, b) => b.total - a.total).slice(0, 15);
  }, [ptrbsFiltrados, bombeiros]);

  const horasPorEquipe = useMemo(() => {
    const mapa: Record<string, number> = {};
    EQUIPES_OPERACIONAIS.forEach(e => { mapa[e] = 0; });
    ptrbsFiltrados.forEach(p => {
      if (p.horaInicio && p.horaTermino && mapa[p.equipe] !== undefined) {
        const [h1, m1] = p.horaInicio.split(':').map(Number);
        const [h2, m2] = p.horaTermino.split(':').map(Number);
        const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (mins > 0) mapa[p.equipe] += mins / 60;
      }
    });
    return EQUIPES_OPERACIONAIS.map(e => ({
      equipe: e,
      horas: Math.round(mapa[e] * 10) / 10,
      cor: CORES_EQUIPE[e],
    }));
  }, [ptrbsFiltrados]);

  const timelinePtrbs = useMemo(() => {
    const meses = getMeses();
    const mapa: Record<string, Record<string, number>> = {};
    meses.forEach(m => { mapa[m] = {}; EQUIPES_OPERACIONAIS.forEach(e => { mapa[m][e] = 0; }); });
    ptrbs.forEach(p => {
      const k = chaveMes(p.data);
      if (mapa[k] && mapa[k][p.equipe] !== undefined) mapa[k][p.equipe]++;
    });
    return meses.map(m => ({ mes: m, ...mapa[m] }));
  }, [ptrbs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-graphite-700 dark:text-graphite-300">Período:</span>
        {[1, 3, 6, 12].map(m => (
          <button key={m} onClick={() => setFiltroMeses(m as 1 | 3 | 6 | 12)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
              filtroMeses === m
                ? 'bg-gradient-to-r from-aviation-600 to-aviation-700 text-white shadow-lg shadow-aviation-500/20'
                : 'border border-graphite-300 bg-white text-graphite-700 hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-300'
            }`}>
            {m === 1 ? '1 mês' : `${m} meses`}
          </button>
        ))}
        <span className="ml-auto text-sm text-graphite-500 dark:text-graphite-400">
          {ptrbsFiltrados.length} treinamento(s) encontrado(s)
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Treinamentos por Equipe</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={porEquipe}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="equipe" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {porEquipe.map((entry, i) => (
                  <Cell key={i} fill={entry.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Horas de Treinamento por Equipe</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={horasPorEquipe}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="equipe" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: unknown) => `${v ?? 0}h`} />
              <Bar dataKey="horas" radius={[6, 6, 0, 0]}>
                {horasPorEquipe.map((entry, i) => (
                  <Cell key={i} fill={entry.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
        <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Evolução por Equipe (12 meses)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timelinePtrbs}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip />
            <Legend />
            {EQUIPES_OPERACIONAIS.map(eq => (
              <Line key={eq} type="monotone" dataKey={eq} stroke={CORES_EQUIPE[eq]} strokeWidth={2} dot={{ r: 2 }} name={eq} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Assuntos Mais Ministrados</h3>
          {porAssunto.length === 0 ? (
            <p className="text-sm text-graphite-400">Nenhum treinamento registrado.</p>
          ) : (
            <div className="space-y-2">
              {porAssunto.map((a, i) => (
                <button key={i} onClick={() => setExpandedAssunto(expandedAssunto === a.assunto ? null : a.assunto)}
                  className="w-full rounded-xl border border-graphite-200 bg-graphite-50 p-3 text-left transition-all hover:bg-graphite-100 dark:border-border-dark dark:bg-surface-hover dark:hover:bg-surface-elevated">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100 truncate">{a.assunto}</p>
                      <p className="text-xs text-graphite-500">{a.equipesList.join(', ')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-aviation-100 px-2 py-0.5 text-xs font-bold text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                        {a.total}x
                      </span>
                      {expandedAssunto === a.assunto ? <ChevronUp className="h-4 w-4 text-graphite-400" /> : <ChevronDown className="h-4 w-4 text-graphite-400" />}
                    </div>
                  </div>
                  {expandedAssunto === a.assunto && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {a.equipesList.map(eq => (
                        <span key={eq} className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: CORES_EQUIPE[eq] }}>
                          {eq}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Instrutores Mais Ativos</h3>
          {porInstrutor.length === 0 ? (
            <p className="text-sm text-graphite-400">Nenhum instrutor registrado.</p>
          ) : (
            <div className="space-y-2">
              {porInstrutor.map((inst, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-graphite-50 px-4 py-3 dark:bg-surface-hover">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-aviation-100 text-xs font-bold text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                    {i + 1}
                  </div>
                  <span className="flex-1 text-sm font-medium text-graphite-900 dark:text-graphite-100">{inst.nome}</span>
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                    {inst.total} treino(s)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
        <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Participações por Membro</h3>
        {participacoesPorMembro.length === 0 ? (
          <p className="text-sm text-graphite-400">Nenhum participante registrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-graphite-200 dark:border-border-dark">
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-400">#</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-400">Nome</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-400">Equipe</th>
                  <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-graphite-400">Treinos</th>
                </tr>
              </thead>
              <tbody>
                {participacoesPorMembro.map((p, i) => (
                  <tr key={i} className="border-b border-graphite-100 dark:border-border-dark">
                    <td className="px-4 py-2.5 text-graphite-500">{i + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-graphite-900 dark:text-graphite-100">{p.nome}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: CORES_EQUIPE[p.equipe] || '#6b7280' }}>
                        {p.equipe}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-graphite-900 dark:text-graphite-100">{p.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────── Tab: Certificações ───────── */

function TabCertificacoes() {
  const certificacoes = useMemo(() => listarCertificacoes(), []);
  const [bombeiros, setBombeiros] = useState<Bombeiro[]>([]);
  useEffect(() => { (async () => { setBombeiros(await listarAtivos()); })(); }, []);
  const agora = new Date();

  const porEquipe = useMemo(() => {
    const mapa: Record<string, { validas: number; vencendo: number; vencidas: number }> = {};
    EQUIPES_OPERACIONAIS.forEach(e => { mapa[e] = { validas: 0, vencendo: 0, vencidas: 0 }; });
    const threeMonths = new Date(agora);
    threeMonths.setMonth(threeMonths.getMonth() + 3);

    certificacoes.forEach(c => {
      const b = bombeiros.find(x => x.id === c.funcionarioId);
      if (!b || mapa[b.equipe] === undefined) return;
      const validade = new Date(c.dataValidade + 'T00:00:00');
      if (validade < agora) mapa[b.equipe].vencidas++;
      else if (validade <= threeMonths) mapa[b.equipe].vencendo++;
      else mapa[b.equipe].validas++;
    });

    return EQUIPES_OPERACIONAIS.map(e => ({ equipe: e, ...mapa[e] }));
  }, [certificacoes, bombeiros, agora]);

  const porNR = useMemo(() => {
    const mapa: Record<string, number> = {};
    certificacoes.forEach(c => {
      const key = `${c.nrNumero} - ${c.nrNome}`;
      mapa[key] = (mapa[key] || 0) + 1;
    });
    return Object.entries(mapa)
      .map(([nr, total]) => ({ nr, total }))
      .sort((a, b) => b.total - a.total);
  }, [certificacoes]);

  const vencendo = useMemo(() => {
    const threeMonths = new Date(agora);
    threeMonths.setMonth(threeMonths.getMonth() + 3);
    return certificacoes
      .filter(c => {
        const v = new Date(c.dataValidade + 'T00:00:00');
        return v >= agora && v <= threeMonths;
      })
      .map(c => {
        const b = bombeiros.find(x => x.id === c.funcionarioId);
        const dias = Math.ceil((new Date(c.dataValidade + 'T00:00:00').getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
        return { ...c, funcionarioEquipe: b?.equipe || 'N/A', diasRestantes: dias };
      })
      .sort((a, b) => a.diasRestantes - b.diasRestantes);
  }, [certificacoes, bombeiros, agora]);

  const totalStacked = porEquipe.reduce((acc, e) => acc + e.validas + e.vencendo + e.vencidas, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-green-500">Válidas</p>
          <p className="text-2xl font-black text-green-700 dark:text-green-300">
            {porEquipe.reduce((acc, e) => acc + e.validas, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-yellow-500">Vencendo (3 meses)</p>
          <p className="text-2xl font-black text-yellow-700 dark:text-yellow-300">
            {porEquipe.reduce((acc, e) => acc + e.vencendo, 0)}
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Vencidas</p>
          <p className="text-2xl font-black text-red-700 dark:text-red-300">
            {porEquipe.reduce((acc, e) => acc + e.vencidas, 0)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Certificações por Equipe</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={porEquipe}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="equipe" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="validas" stackId="a" fill={STATUS_CERT_COLORS.valida} name="Válida" radius={[0, 0, 0, 0]} />
              <Bar dataKey="vencendo" stackId="a" fill={STATUS_CERT_COLORS.vencendo} name="Vencendo" radius={[0, 0, 0, 0]} />
              <Bar dataKey="vencidas" stackId="a" fill={STATUS_CERT_COLORS.vencida} name="Vencida" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Certificações por NR</h3>
          {porNR.length === 0 ? (
            <p className="text-sm text-graphite-400">Nenhuma certificação registrada.</p>
          ) : (
            <div className="max-h-[280px] space-y-2 overflow-y-auto">
              {porNR.map((nr, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-graphite-50 px-4 py-2.5 dark:bg-surface-hover">
                  <span className="flex-1 text-sm text-graphite-900 dark:text-graphite-100">{nr.nr}</span>
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-graphite-200 dark:bg-graphite-700">
                    <div className="h-full rounded-full bg-aviation-500" style={{ width: `${(nr.total / totalStacked) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right text-sm font-bold text-graphite-900 dark:text-graphite-100">{nr.total}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {vencendo.length > 0 && (
        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-graphite-900 dark:text-graphite-100">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Certificações Próximas ao Vencimento
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-graphite-200 dark:border-border-dark">
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-400">Funcionário</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-400">Equipe</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-400">NR</th>
                  <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-graphite-400">Validade</th>
                  <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider text-graphite-400">Dias Restantes</th>
                </tr>
              </thead>
              <tbody>
                {vencendo.map((c, i) => (
                  <tr key={i} className="border-b border-graphite-100 dark:border-border-dark">
                    <td className="px-4 py-2.5 font-medium text-graphite-900 dark:text-graphite-100">{c.funcionarioNome}</td>
                    <td className="px-4 py-2.5">
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: CORES_EQUIPE[c.funcionarioEquipe] || '#6b7280' }}>
                        {c.funcionarioEquipe}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-graphite-700 dark:text-graphite-300">{c.nrNumero}</td>
                    <td className="px-4 py-2.5 text-graphite-700 dark:text-graphite-300">
                      {new Date(c.dataValidade + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        c.diasRestantes <= 30 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : c.diasRestantes <= 60 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {c.diasRestantes} dias
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Tab: Desempenho ───────── */

function TabDesempenho() {
  const ptrbs = useMemo(() => listarPTRBs(), []);
  const ocorrencias = useMemo(() => listarOcorrencias(), []);
  const lros = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('sescinc-lros') || '[]') as Array<{ equipe: string; dataEntrada: string }>; }
    catch { return [] as Array<{ equipe: string; dataEntrada: string }>; }
  }, []);

  const meses = getMeses();

  const ptrbsPorMes = useMemo(() => {
    const mapa: Record<string, Record<string, number>> = {};
    meses.forEach(m => { mapa[m] = {}; EQUIPES_OPERACIONAIS.forEach(e => { mapa[m][e] = 0; }); });
    ptrbs.forEach(p => {
      const k = chaveMes(p.data);
      if (mapa[k] && mapa[k][p.equipe] !== undefined) mapa[k][p.equipe]++;
    });
    return meses.map(m => ({ mes: m, ...mapa[m] }));
  }, [ptrbs, meses]);

  const ocorrenciasPorMes = useMemo(() => {
    const mapa: Record<string, number> = {};
    meses.forEach(m => { mapa[m] = 0; });
    ocorrencias.forEach(o => { const k = chaveMes(o.data); if (mapa[k] !== undefined) mapa[k]++; });
    return meses.map(m => ({ mes: m, total: mapa[m] }));
  }, [ocorrencias, meses]);

  const statusOcorrencias = useMemo(() => {
    const mapa: Record<string, number> = {};
    ocorrencias.forEach(o => { mapa[o.status] = (mapa[o.status] || 0) + 1; });
    return Object.entries(mapa).map(([status, total]) => ({ status, total }));
  }, [ocorrencias]);

  const lrosPorEquipe = useMemo(() => {
    const mapa: Record<string, number> = {};
    EQUIPES_OPERACIONAIS.forEach(e => { mapa[e] = 0; });
    lros.forEach(l => { if (mapa[l.equipe] !== undefined) mapa[l.equipe]++; });
    return EQUIPES_OPERACIONAIS.map(e => ({ equipe: e, total: mapa[e] || 0, cor: CORES_EQUIPE[e] }));
  }, [lros]);

  const [efetivoPorTurno, setEfetivoPorTurno] = useState<{turno: string; total: number}[]>([]);
  useEffect(() => { (async () => {
    const bombeiros = await listarAtivos();
    const mapa: Record<string, number> = { Diurno: 0, Noturno: 0, Feirista: 0, Administrativo: 0 };
    bombeiros.forEach(b => { mapa[b.turno] = (mapa[b.turno] || 0) + 1; });
    setEfetivoPorTurno(Object.entries(mapa).map(([turno, total]) => ({ turno, total })));
  })(); }, []);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Treinamentos por Equipe (12 meses)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ptrbsPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Legend />
              {EQUIPES_OPERACIONAIS.map(eq => (
                <Bar key={eq} dataKey={eq} fill={CORES_EQUIPE[eq]} radius={[4, 4, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Ocorrências Mensais (12 meses)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ocorrenciasPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Status das Ocorrências</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusOcorrencias} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="total"
                label={(props: PieLabelProps) => `${String(props.status)} ${(((props.percent as number) || 0) * 100).toFixed(0)}%`}>
                {statusOcorrencias.map((_, i) => (
                  <Cell key={i} fill={['#3b82f6', '#f59e0b', '#f97316', '#10b981'][i % 4]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">LROs por Equipe</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={lrosPorEquipe}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="equipe" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {lrosPorEquipe.map((entry, i) => (
                  <Cell key={i} fill={entry.cor} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-graphite-200 bg-white p-5 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <h3 className="mb-4 text-sm font-bold text-graphite-900 dark:text-graphite-100">Efetivo por Turno</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={efetivoPorTurno} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="total"
                label={(props: PieLabelProps) => `${String(props.turno)} ${(((props.percent as number) || 0) * 100).toFixed(0)}%`}>
                {efetivoPorTurno.map((_, i) => (
                  <Cell key={i} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'][i % 4]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* ───────── Página principal ───────── */

export function Estatisticas() {
  const [tab, setTab] = useState<TabKey>('geral');

  return (
    <PageContainer>
      <PageTitle icon={BarChart3} title="Estatísticas" />

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

      {tab === 'geral' && <TabGeral />}
      {tab === 'treinamentos' && <TabTreinamentos />}
      {tab === 'certificacoes' && <TabCertificacoes />}
      {tab === 'desempenho' && <TabDesempenho />}
    </PageContainer>
  );
}
