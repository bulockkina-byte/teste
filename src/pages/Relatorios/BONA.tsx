import { useState, useEffect, useMemo } from 'react';
import { FileCheck, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { listarOcorrencias } from '../../services/ocorrenciaService';
import { CATEGORIAS_OCORRENCIA } from '../../types/ocorrencia';

function fmt(d: string) {
  if (!d) return '-';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

export function BONA() {
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarOcorrencias().then(setOcorrencias).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let lista = ocorrencias;
    if (filterCat) lista = lista.filter(o => o.categoria === filterCat);
    if (search) {
      const t = search.toLowerCase();
      lista = lista.filter(o => o.titulo?.toLowerCase().includes(t) || o.descricao?.toLowerCase().includes(t) || o.numero?.toLowerCase().includes(t));
    }
    return lista.sort((a, b) => new Date(b.data || '').getTime() - new Date(a.data || '').getTime());
  }, [ocorrencias, search, filterCat]);

  const stats = useMemo(() => ({
    total: ocorrencias.length, abertas: ocorrencias.filter(o => o.status === 'Aberta').length,
  }), [ocorrencias]);

  if (loading) return <PageContainer><div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" /></div></PageContainer>;

  return (
    <PageContainer>
      <PageTitle icon={FileCheck} title="BONA - Ocorrências" />
      <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-4 max-w-md">
        <div className="rounded-xl border border-graphite-200 bg-white p-3 text-center dark:border-border-dark dark:bg-surface-card">
          <p className="text-xl font-black text-graphite-900 dark:text-graphite-100">{stats.total}</p>
          <p className="text-[10px] font-medium text-graphite-500">Total</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-center dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-xl font-black text-blue-700 dark:text-blue-300">{stats.abertas}</p>
          <p className="text-[10px] font-medium text-blue-500">Abertas</p>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-center dark:border-green-800 dark:bg-green-900/20">
          <p className="text-xl font-black text-green-700 dark:text-green-300">{stats.total - stats.abertas}</p>
          <p className="text-[10px] font-medium text-green-500">Encerradas</p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..." className="w-full rounded-xl border border-graphite-300 bg-white py-2.5 pl-10 pr-4 text-sm dark:border-border-dark dark:bg-surface-card dark:text-graphite-100" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="rounded-xl border border-graphite-300 bg-white px-3 py-2.5 text-sm dark:border-border-dark dark:bg-surface-card dark:text-graphite-100">
          <option value="">Todas categorias</option>
          {CATEGORIAS_OCORRENCIA.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <FileCheck className="mb-4 h-12 w-12 text-graphite-300" />
          <h3 className="text-lg font-semibold text-graphite-700">Nenhuma ocorrência</h3>
          <p className="text-sm text-graphite-400">Cadastre ocorrências pelo menu Ocorrências.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(oc => (
            <div key={oc.id} className="rounded-2xl border border-graphite-200 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
              <button onClick={() => setExpandedId(expandedId === oc.id ? null : oc.id)} className="flex w-full items-center gap-4 px-5 py-4 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-red-700 text-sm font-bold text-white">
                  <FileCheck className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{oc.titulo || 'Sem título'}</p>
                  <p className="text-xs text-graphite-500">{fmt(oc.data)} · {oc.equipe || 'N/A'} · {oc.categoria}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${oc.status === 'Aberta' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'} dark:${oc.status === 'Aberta' ? 'bg-blue-900/30 text-blue-300' : 'bg-green-900/30 text-green-300'}`}>{oc.status}</span>
                {expandedId === oc.id ? <ChevronUp className="h-4 w-4 text-graphite-400" /> : <ChevronDown className="h-4 w-4 text-graphite-400" />}
              </button>
              {expandedId === oc.id && (
                <div className="border-t border-graphite-200 px-5 py-4 dark:border-border-dark">
                  <p className="text-sm text-graphite-700 dark:text-graphite-300 whitespace-pre-wrap">{oc.descricao}</p>
                  {oc.acoesTomadas && <p className="mt-2 text-xs text-graphite-500"><span className="font-semibold">Ações:</span> {oc.acoesTomadas}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

export default BONA;
