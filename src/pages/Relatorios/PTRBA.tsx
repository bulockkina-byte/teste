import { useState, useEffect, useMemo } from 'react';
import { FileText, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { listarPTRBs } from '../../services/ptrbService';

function fmt(d: string) {
  if (!d) return '-';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

export function PTRBA() {
  const [ptrbs, setPtrbs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarPTRBs().then(setPtrbs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let lista = ptrbs;
    if (filterEquipe) lista = lista.filter(p => p.equipe === filterEquipe);
    if (search) {
      const t = search.toLowerCase();
      lista = lista.filter(p => p.assuntoMinistrado?.toLowerCase().includes(t) || p.descricao?.toLowerCase().includes(t) || p.instrutor?.toLowerCase().includes(t));
    }
    return lista.sort((a, b) => new Date(b.data || '').getTime() - new Date(a.data || '').getTime());
  }, [ptrbs, search, filterEquipe]);

  const equipes = useMemo(() => [...new Set(ptrbs.map(p => p.equipe).filter(Boolean))], [ptrbs]);

  const stats = useMemo(() => {
    let totalHoras = 0;
    ptrbs.forEach(p => {
      if (p.horaInicio && p.horaTermino) {
        const [h1, m1] = p.horaInicio.split(':').map(Number);
        const [h2, m2] = p.horaTermino.split(':').map(Number);
        totalHoras += (h2 - h1 + (m2 - m1) / 60);
      }
    });
    return { total: ptrbs.length, horas: Math.round(totalHoras), porEquipe: equipes.map(eq => ({ equipe: eq, total: ptrbs.filter(p => p.equipe === eq).length })) };
  }, [ptrbs, equipes]);

  if (loading) return <PageContainer><div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" /></div></PageContainer>;

  return (
    <PageContainer>
      <PageTitle icon={FileText} title="PTR-BA" />
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-graphite-200 bg-white p-3 text-center dark:border-border-dark dark:bg-surface-card">
          <p className="text-xl font-black text-graphite-900 dark:text-graphite-100">{stats.total}</p>
          <p className="text-[10px] font-medium text-graphite-500">Total</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{stats.horas}</p>
          <p className="text-[10px] font-medium text-emerald-500">Horas totais</p>
        </div>
        {stats.porEquipe.map(e => (
          <div key={e.equipe} className="rounded-xl border border-aviation-200 bg-aviation-50 p-3 text-center dark:border-aviation-800 dark:bg-aviation-900/20">
            <p className="text-xl font-black text-aviation-700 dark:text-aviation-300">{e.total}</p>
            <p className="text-[10px] font-medium text-aviation-500">Equipe {e.equipe}</p>
          </div>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..." className="w-full rounded-xl border border-graphite-300 bg-white py-2.5 pl-10 pr-4 text-sm dark:border-border-dark dark:bg-surface-card dark:text-graphite-100" />
        </div>
        <select value={filterEquipe} onChange={e => setFilterEquipe(e.target.value)} className="rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
          <option value="">Todas equipes</option>
          {equipes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <FileText className="mb-4 h-12 w-12 text-graphite-300" />
          <h3 className="text-lg font-semibold text-graphite-700">Nenhum PTR-BA encontrado</h3>
          <p className="text-sm text-graphite-400">Cadastre PTR-BAs pelos Registros Diários.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(p => (
            <div key={p.id} className="rounded-2xl border border-graphite-200 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
              <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="flex w-full items-center gap-4 px-5 py-4 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-bold text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{p.assuntoMinistrado || 'PTR-BA'}</p>
                  <p className="text-xs text-graphite-500">{fmt(p.data)} · Equipe {p.equipe} · {p.instrutor || 'N/A'}</p>
                </div>
                <span className="text-xs text-graphite-400">{p.horaInicio}-{p.horaTermino}</span>
                {expandedId === p.id ? <ChevronUp className="h-4 w-4 text-graphite-400" /> : <ChevronDown className="h-4 w-4 text-graphite-400" />}
              </button>
              {expandedId === p.id && (
                <div className="border-t border-graphite-200 px-5 py-4 dark:border-border-dark">
                  <p className="text-sm text-graphite-700 dark:text-graphite-300 whitespace-pre-wrap">{p.descricao || p.observacoes}</p>
                  {p.participantes?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {p.participantes.map((part: any, i: number) => (
                        <span key={i} className="inline-flex rounded-full bg-graphite-100 px-2 py-0.5 text-[10px] font-medium text-graphite-700 dark:bg-surface-hover dark:text-graphite-300">{part.nomeGuerra || part.nome}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export default PTRBA;
