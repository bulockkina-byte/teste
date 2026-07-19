import { useState, useEffect, useMemo } from 'react';
import { FileText, Search, ChevronDown, ChevronUp, Users, Clock, BarChart3, Eye } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { listarPTRBs } from '../../services/ptrbService';
import { listarAtivos } from '../../services/bombeiroService';
import { EQUIPES } from '../../types/ptrb';

function fmt(d: string) {
  if (!d) return '-';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function calcHoras(inicio: string, termino: string): number {
  if (!inicio || !termino) return 0;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = termino.split(':').map(Number);
  let inicioMin = h1 * 60 + m1;
  let terminoMin = h2 * 60 + m2;
  if (terminoMin <= inicioMin) terminoMin += 24 * 60;
  return (terminoMin - inicioMin) / 60;
}

export function PTRBA() {
  const [ptrbs, setPtrbs] = useState<any[]>([]);
  const [bombeiros, setBombeiros] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEquipe, setFilterEquipe] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [filtroPessoa, setFiltroPessoa] = useState('');
  const [filtroAssunto, setFiltroAssunto] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<'pessoas' | 'lista'>('pessoas');
  const [expandedPessoa, setExpandedPessoa] = useState<string | null>(null);
  const [expandedAssunto, setExpandedAssunto] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visualizandoPtrb, setVisualizandoPtrb] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([
      listarPTRBs(),
      listarAtivos(),
    ]).then(([p, b]) => {
      setPtrbs(p);
      setBombeiros(b);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const equipes = [...EQUIPES];

  const todasPessoas = useMemo(() => {
    const map = new Map<string, { nomeCompleto: string; funcoes: Set<string> }>();
    if (filterEquipe) {
      bombeiros.filter(b => b.equipe === filterEquipe).forEach(b => {
        map.set(b.nomeCompleto, { nomeCompleto: b.nomeCompleto, funcoes: new Set([b.cargo]) });
      });
    }
    ptrbs.forEach(p => {
      (p.participantes || []).forEach((part: any) => {
        const nome = part.nomeCompleto || part.nome || '';
        if (!nome) return;
        if (!map.has(nome)) map.set(nome, { nomeCompleto: nome, funcoes: new Set() });
        if (part.funcao) map.get(nome)!.funcoes.add(part.funcao);
      });
    });
    return Array.from(map.values()).sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
  }, [ptrbs, bombeiros, filterEquipe]);

  const todosAssuntos = useMemo(() => {
    const set = new Set<string>();
    ptrbs.forEach(p => { if (p.assuntoMinistrado) set.add(p.assuntoMinistrado); });
    return Array.from(set).sort();
  }, [ptrbs]);

  const listaFiltrada = useMemo(() => {
    let lista = ptrbs;
    if (dataInicio) lista = lista.filter(p => p.data >= dataInicio);
    if (dataFim) lista = lista.filter(p => p.data <= dataFim);
    if (filterEquipe) lista = lista.filter(p => p.equipe === filterEquipe);
    if (filtroAssunto) lista = lista.filter(p => p.assuntoMinistrado === filtroAssunto);
    if (filtroPessoa) {
      lista = lista.filter(p => (p.participantes || []).some((part: any) =>
        (part.nomeCompleto || part.nome) === filtroPessoa
      ));
    }
    if (search) {
      const t = search.toLowerCase();
      lista = lista.filter(p => p.assuntoMinistrado?.toLowerCase().includes(t) || p.descricao?.toLowerCase().includes(t) || p.instrutor?.toLowerCase().includes(t));
    }
    return lista.sort((a, b) => new Date(b.data || '').getTime() - new Date(a.data || '').getTime());
  }, [ptrbs, dataInicio, dataFim, filterEquipe, filtroAssunto, filtroPessoa, search]);

  const stats = useMemo(() => {
    let totalHoras = 0;
    const pessoasSet = new Set<string>();
    listaFiltrada.forEach(p => {
      const h = calcHoras(p.horaInicio, p.horaTermino);
      totalHoras += h;
      (p.participantes || []).forEach((part: any) => {
        const nome = part.nomeCompleto || part.nome || '';
        if (nome) pessoasSet.add(nome);
      });
    });
    return { total: listaFiltrada.length, horas: Math.round(totalHoras), pessoas: pessoasSet.size };
  }, [listaFiltrada]);

  const resumoPessoas = useMemo(() => {
    type AssuntoEntry = { assunto: string; qtd: number; horas: number };
    type DocumentoEntry = { id: string; assunto: string; data: string; equipe: string; horaInicio: string; horaTermino: string; horas: number };
    type PessoaEntry = { nome: string; funcao: string; totalQtd: number; totalHoras: number; assuntos: AssuntoEntry[]; documentos: DocumentoEntry[] };

    const pessoaMap = new Map<string, Map<string, { qtd: number; horas: number }>>();
    const pessoaDocs = new Map<string, DocumentoEntry[]>();
    const pessoaFuncao = new Map<string, string>();

    listaFiltrada.forEach(p => {
      const h = calcHoras(p.horaInicio, p.horaTermino);
      const assunto = p.assuntoMinistrado || 'Sem assunto';
      (p.participantes || []).forEach((part: any) => {
        const nome = part.nomeCompleto || part.nome || '';
        if (!nome) return;
        if (part.funcao) pessoaFuncao.set(nome, part.funcao);
        if (!pessoaMap.has(nome)) pessoaMap.set(nome, new Map());
        const assuntoMap = pessoaMap.get(nome)!;
        if (!assuntoMap.has(assunto)) assuntoMap.set(assunto, { qtd: 0, horas: 0 });
        const entry = assuntoMap.get(assunto)!;
        entry.qtd += 1;
        entry.horas += h;

        if (!pessoaDocs.has(nome)) pessoaDocs.set(nome, []);
        pessoaDocs.get(nome)!.push({ id: p.id, assunto, data: fmt(p.data), equipe: p.equipe, horaInicio: p.horaInicio, horaTermino: p.horaTermino, horas: Math.round(h * 10) / 10 });
      });
    });

    const nomesBase = filterEquipe
      ? bombeiros.filter(b => b.equipe === filterEquipe).map(b => b.nomeCompleto)
      : [];

    const todosNomes = new Set([...nomesBase, ...pessoaMap.keys()]);

    const resultado: PessoaEntry[] = [];
    todosNomes.forEach(nome => {
      const assuntoMap = pessoaMap.get(nome);
      const assuntos: AssuntoEntry[] = [];
      let totalQtd = 0, totalHoras = 0;
      if (assuntoMap) {
        assuntoMap.forEach((val, assunto) => {
          assuntos.push({ assunto, qtd: val.qtd, horas: Math.round(val.horas * 10) / 10 });
          totalQtd += val.qtd;
          totalHoras += val.horas;
        });
        assuntos.sort((a, b) => b.horas - a.horas);
      }
      const docs = (pessoaDocs.get(nome) || []).sort((a, b) => b.data.localeCompare(a.data));
      resultado.push({
        nome,
        funcao: pessoaFuncao.get(nome) || bombeiros.find(b => b.nomeCompleto === nome)?.cargo || '',
        totalQtd,
        totalHoras: Math.round(totalHoras * 10) / 10,
        assuntos,
        documentos: docs,
      });
    });

    resultado.sort((a, b) => b.totalHoras - a.totalHoras);
    return resultado;
  }, [listaFiltrada, bombeiros, filterEquipe]);

  function togglePessoa(nome: string) {
    setExpandedPessoa(expandedPessoa === nome ? null : nome);
  }

  if (loading) return <PageContainer><div className="flex justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" /></div></PageContainer>;

  const inputClass = 'rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated';

  return (
    <PageContainer>
      <PageTitle icon={BarChart3} title="PTR-BA — Relatório de Horas" />

      {/* ===== Filtros ===== */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-graphite-500">Data Início</label>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-graphite-500">Data Fim</label>
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-graphite-500">Pessoa</label>
          <select value={filtroPessoa} onChange={e => setFiltroPessoa(e.target.value)} className={inputClass}>
            <option value="">Todas</option>
            {todasPessoas.map(p => (
              <option key={p.nomeCompleto} value={p.nomeCompleto}>{p.nomeCompleto} ({[...p.funcoes].join(', ')})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-graphite-500">Assunto</label>
          <select value={filtroAssunto} onChange={e => setFiltroAssunto(e.target.value)} className={inputClass}>
            <option value="">Todos</option>
            {todosAssuntos.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-graphite-500">Equipe</label>
          <select value={filterEquipe} onChange={e => setFilterEquipe(e.target.value)} className={inputClass}>
            <option value="">Todas</option>
            {equipes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
          </select>
        </div>
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-graphite-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Pesquisar..." className="w-full rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 pl-10 text-sm backdrop-blur-sm dark:border-border-dark dark:bg-surface-card dark:text-graphite-100" />
        </div>
      </div>

      {/* ===== Cards de resumo ===== */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-graphite-200 bg-white p-3 text-center dark:border-border-dark dark:bg-surface-card">
          <FileText className="mx-auto mb-1 h-5 w-5 text-graphite-400" />
          <p className="text-xl font-black text-graphite-900 dark:text-graphite-100">{stats.total}</p>
          <p className="text-[10px] font-medium text-graphite-500">PTR-BAs</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
          <Clock className="mx-auto mb-1 h-5 w-5 text-emerald-500" />
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{stats.horas}h</p>
          <p className="text-[10px] font-medium text-emerald-500">Horas totais</p>
        </div>
        <div className="rounded-xl border border-aviation-200 bg-aviation-50 p-3 text-center dark:border-aviation-800 dark:bg-aviation-900/20">
          <Users className="mx-auto mb-1 h-5 w-5 text-aviation-500" />
          <p className="text-xl font-black text-aviation-700 dark:text-aviation-300">{stats.pessoas}</p>
          <p className="text-[10px] font-medium text-aviation-500">Pessoas</p>
        </div>
      </div>

      {/* ===== Abas ===== */}
      <div className="mb-4 flex gap-1 rounded-xl border border-graphite-200/60 bg-graphite-50/50 p-1 dark:border-border-dark dark:bg-surface-card/50">
        <button onClick={() => setAbaAtiva('pessoas')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${abaAtiva === 'pessoas' ? 'bg-white text-aviation-700 shadow-sm dark:bg-surface-elevated dark:text-aviation-400' : 'text-graphite-500 hover:text-graphite-700 dark:text-graphite-400'}`}>
          <Users className="mr-1.5 inline h-4 w-4" /> Por Pessoa
        </button>
        <button onClick={() => setAbaAtiva('lista')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${abaAtiva === 'lista' ? 'bg-white text-aviation-700 shadow-sm dark:bg-surface-elevated dark:text-aviation-400' : 'text-graphite-500 hover:text-graphite-700 dark:text-graphite-400'}`}>
          <FileText className="mr-1.5 inline h-4 w-4" /> Por Período
        </button>
      </div>

      {/* ===== Aba: Por Pessoa ===== */}
      {abaAtiva === 'pessoas' && (
        <div className="space-y-2">
          {resumoPessoas.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
              <BarChart3 className="mb-4 h-12 w-12 text-graphite-300" />
              <h3 className="text-lg font-semibold text-graphite-700">Nenhum dado encontrado</h3>
              <p className="text-sm text-graphite-400">Ajuste os filtros para visualizar o relatório.</p>
            </div>
          ) : (
            resumoPessoas.map(pessoa => (
              <div key={pessoa.nome} className="rounded-2xl border border-graphite-200/60 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
                <button onClick={() => togglePessoa(pessoa.nome)}
                  className="flex w-full items-center gap-4 px-5 py-4 text-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aviation-500 to-aviation-700 text-sm font-bold text-white">
                    {pessoa.nome.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">
                      {pessoa.nome} <span className="font-normal text-graphite-500">({pessoa.funcao || '—'})</span>
                    </p>
                    <p className="text-xs text-graphite-500">
                      {pessoa.totalQtd} PTR-BA{pessoa.totalQtd !== 1 ? 's' : ''} · {pessoa.totalHoras}h totais
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{pessoa.totalHoras}h</p>
                  </div>
                  {expandedPessoa === pessoa.nome
                    ? <ChevronUp className="h-4 w-4 text-graphite-400" />
                    : <ChevronDown className="h-4 w-4 text-graphite-400" />
                  }
                </button>

                {expandedPessoa === pessoa.nome && (
                  <div className="border-t border-graphite-200/60 dark:border-border-dark">
                    {pessoa.assuntos.length === 0 ? (
                      <div className="px-5 py-6 text-center text-sm text-graphite-400">
                        Nenhum PTR-BA neste período
                      </div>
                    ) : (
                      pessoa.assuntos.map((a, idx) => {
                        const chave = `${pessoa.nome}-${a.assunto}`;
                        const docsAssunto = pessoa.documentos.filter(d => d.assunto === a.assunto);
                        return (
                          <div key={idx} className="border-b border-graphite-100 last:border-0 dark:border-border-dark/50">
                            <button onClick={() => setExpandedAssunto(expandedAssunto === chave ? null : chave)}
                              className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-graphite-50 dark:hover:bg-surface-hover/50">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100">{a.assunto}</p>
                              </div>
                              <span className="shrink-0 text-xs text-graphite-500">{a.qtd} PTR-BA{a.qtd !== 1 ? 's' : ''}</span>
                              <span className="shrink-0 text-sm font-bold text-emerald-600 dark:text-emerald-400">{a.horas}h</span>
                              {expandedAssunto === chave
                                ? <ChevronUp className="h-4 w-4 text-graphite-400" />
                                : <ChevronDown className="h-4 w-4 text-graphite-400" />
                              }
                            </button>
                            {expandedAssunto === chave && (
                              <div className="space-y-1.5 px-5 pb-4">
                                {docsAssunto.map((doc, di) => (
                                  <div key={di} className="flex items-center gap-3 rounded-lg border border-graphite-100 bg-graphite-50/50 px-3 py-2 dark:border-border-dark dark:bg-surface-card/50">
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs text-graphite-700 dark:text-graphite-300">{doc.data} · Equipe {doc.equipe} · {doc.horaInicio}-{doc.horaTermino}</p>
                                    </div>
                                    <span className="shrink-0 text-xs text-graphite-400">{doc.horas}h</span>
                                    <button onClick={() => setVisualizandoPtrb(ptrbs.find(p => p.id === doc.id))}
                                      className="shrink-0 rounded-lg p-1.5 text-aviation-600 transition-colors hover:bg-aviation-50 dark:text-aviation-400 dark:hover:bg-aviation-900/20"
                                      title="Visualizar">
                                      <Eye className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ===== Aba: Por Período (lista) ===== */}
      {abaAtiva === 'lista' && (
        <>
          {listaFiltrada.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300/60 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
              <FileText className="mb-4 h-12 w-12 text-graphite-300" />
              <h3 className="text-lg font-semibold text-graphite-700">Nenhum PTR-BA encontrado</h3>
              <p className="text-sm text-graphite-400">Ajuste os filtros para visualizar os registros.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {listaFiltrada.map(p => (
                <div key={p.id} className="rounded-2xl border border-graphite-200/60 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
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
                    <div className="border-t border-graphite-200/60 px-5 py-4 dark:border-border-dark">
                      <p className="text-sm text-graphite-700 dark:text-graphite-300 whitespace-pre-wrap">{p.descricao || p.informacoesComplementares}</p>
                      {p.participantes?.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {p.participantes.map((part: any, i: number) => (
                            <span key={i} className="inline-flex rounded-full bg-graphite-100 px-2 py-0.5 text-[10px] font-medium text-graphite-700 dark:bg-surface-hover dark:text-graphite-300">
                              {part.nomeCompleto || part.nome} ({part.funcao || '—'})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {visualizandoPtrb && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-8 sm:pt-16" onClick={() => setVisualizandoPtrb(null)}>
          <div className="w-full max-w-2xl rounded-2xl bg-white/95 p-6 shadow-2xl shadow-black/10 backdrop-blur-sm dark:bg-surface-elevated/95" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-graphite-900 dark:text-graphite-100">PTR-BA — {fmt(visualizandoPtrb.data)}</h3>
              <button onClick={() => setVisualizandoPtrb(null)} className="rounded-lg p-1 text-graphite-400 hover:bg-graphite-100 dark:hover:bg-surface-hover">✕</button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase text-graphite-500">Data</p>
                  <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100">{fmt(visualizandoPtrb.data)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-graphite-500">Horário</p>
                  <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100">{visualizandoPtrb.horaInicio} às {visualizandoPtrb.horaTermino} ({visualizandoPtrb.duracao}h)</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-graphite-500">Equipe</p>
                  <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100">{visualizandoPtrb.equipe}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase text-graphite-500">Turno</p>
                  <p className="text-sm font-medium text-graphite-900 dark:text-graphite-100">{visualizandoPtrb.turno}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase text-graphite-500">Assunto Ministrado</p>
                <p className="text-sm text-graphite-900 dark:text-graphite-100">{visualizandoPtrb.assuntoMinistrado}</p>
              </div>
              {visualizandoPtrb.instrutor && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-graphite-500">Instrutor</p>
                  <p className="text-sm text-graphite-900 dark:text-graphite-100">{visualizandoPtrb.instrutor}</p>
                </div>
              )}
              {visualizandoPtrb.participantes?.length > 0 && (
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase text-graphite-500">Participantes</p>
                  <div className="flex flex-wrap gap-1">
                    {visualizandoPtrb.participantes.map((part: any, i: number) => (
                      <span key={i} className="rounded-full bg-graphite-100 px-2 py-0.5 text-[10px] font-medium text-graphite-700 dark:bg-surface-hover dark:text-graphite-300">
                        {part.nomeCompleto || part.nome} ({part.funcao || '—'})
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {visualizandoPtrb.descricao && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-graphite-500">Atividades Desenvolvidas</p>
                  <p className="text-sm whitespace-pre-wrap text-graphite-700 dark:text-graphite-300">{visualizandoPtrb.descricao}</p>
                </div>
              )}
              {visualizandoPtrb.informacoesComplementares && (
                <div>
                  <p className="text-[10px] font-semibold uppercase text-graphite-500">Informações Complementares</p>
                  <p className="text-sm whitespace-pre-wrap text-graphite-700 dark:text-graphite-300">{visualizandoPtrb.informacoesComplementares}</p>
                </div>
              )}
              {visualizandoPtrb.fotos?.some((f: string) => f) && (
                <div className="grid grid-cols-3 gap-3">
                  {visualizandoPtrb.fotos.filter((f: string) => f).map((f: string, i: number) => (
                    <img key={i} src={f} alt={`Foto ${i + 1}`} className="w-full rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setVisualizandoPtrb(null)}
                className="rounded-xl border border-graphite-300/60 bg-white/80 px-4 py-2 text-sm font-medium text-graphite-700 dark:border-border-dark dark:bg-surface-card/80 dark:text-graphite-200">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

export default PTRBA;
