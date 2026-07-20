import { useState, useEffect, useMemo } from 'react';
import { FileText, ChevronDown, ChevronUp, Eye, Printer, ArrowLeft, Users } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { listarPTRBs } from '../../services/ptrbService';
import { listarBombeiros } from '../../services/bombeiroService';
import type { PTRB } from '../../types/ptrb';
import { EQUIPES } from '../../types/ptrb';

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function calcHoras(inicio: string, termino: string): number {
  if (!inicio || !termino) return 0;
  const [h1, m1] = inicio.split(':').map(Number);
  const [h2, m2] = termino.split(':').map(Number);
  let diff = h2 * 60 + m2 - (h1 * 60 + m1);
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}

function horasStr(h: number): string {
  const horas = Math.floor(h);
  const min = Math.round((h - horas) * 60);
  if (min === 0) return `${horas}h`;
  return `${horas}h${min.toString().padStart(2, '0')}min`;
}

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const inputClass = 'rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated';

type ViewLevel = 'summary' | 'person' | 'detail' | 'view-ptrb';

interface ExpandedPTRB {
  ptrb: PTRB;
  nome: string;
  funcao: string;
  horas: number;
}

function expandParticipants(ptrbs: PTRB[]): ExpandedPTRB[] {
  const result: ExpandedPTRB[] = [];
  for (const p of ptrbs) {
    const h = calcHoras(p.horaInicio, p.horaTermino);
    if (p.participantes.length === 0) {
      result.push({ ptrb: p, nome: '(sem participantes)', funcao: '', horas: h });
    } else {
      for (const part of p.participantes) {
        result.push({ ptrb: p, nome: part.nomeCompleto || '(sem nome)', funcao: part.funcao || '', horas: h });
      }
    }
  }
  return result;
}

type SortKey = 'label' | 'assunto' | 'horas' | 'qtd';

function gerarHTMLImpressao(titulo: string, colunas: string[], linhas: string[][]): string {
  const rowsHtml = linhas.map(row => `<tr>${row.map(c => `<td style="border:1px solid #000;padding:4px 8px;font-size:12px;text-align:left;">${c}</td>`).join('')}</tr>`).join('\n');
  const colsHtml = colunas.map(c => `<th style="border:1px solid #000;padding:6px 8px;font-size:12px;font-weight:bold;text-align:left;background:#eee;">${c}</th>`).join('');
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${titulo}</title>
    <style>
      @page { margin: 20mm; size: landscape; }
      body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
      h1 { font-size: 18px; margin-bottom: 8px; }
      p.filtros { font-size: 12px; color: #555; margin-bottom: 16px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #000; padding: 4px 8px; font-size: 12px; text-align: left; }
      th { background: #eee; font-weight: bold; }
      .footer { margin-top: 16px; font-size: 10px; color: #888; }
    </style>
    </head>
    <body>
      <h1>${titulo}</h1>
      <p class="filtros">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
      <table><thead><tr>${colsHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
      <p class="footer">Relatório PTR-BA - Seção de Instrução</p>
    </body>
    </html>
  `;
}

function imprimirHTML(titulo: string, colunas: string[], linhas: string[][]) {
  const html = gerarHTMLImpressao(titulo, colunas, linhas);
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }
}

export function PTRBA() {
  const [ptrbs, setPtrbs] = useState<PTRB[]>([]);
  const [bombeiros, setBombeiros] = useState<Map<string, { nomeGuerra: string; cargo: string; equipe: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewLevel>('summary');
  const [filterMode, setFilterMode] = useState<'mes-ano' | 'periodo'>('mes-ano');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAno, setFiltroAno] = useState(new Date().getFullYear().toString());
  const [dataInicio, setDataInicio] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [filtroEquipe, setFiltroEquipe] = useState('');
  const [filtroAssunto, setFiltroAssunto] = useState('');
  const [selectedEquipe, setSelectedEquipe] = useState('');
  const [selectedPessoa, setSelectedPessoa] = useState('');
  const [selectedPTRB, setSelectedPTRB] = useState<PTRB | null>(null);
  const [expandedPTRB, setExpandedPTRB] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('label');
  const [sortAsc, setSortAsc] = useState(false);

  const ANOS = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  useEffect(() => {
    async function load() {
      try {
        const [p, b] = await Promise.all([listarPTRBs(), listarBombeiros()]);
        setPtrbs(p);
        const map = new Map<string, { nomeGuerra: string; cargo: string; equipe: string }>();
        for (const bom of b) {
          map.set(bom.nomeCompleto, { nomeGuerra: bom.nomeGuerra, cargo: bom.cargo, equipe: bom.equipe });
        }
        setBombeiros(map);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  function applyPeriodFilter(lista: PTRB[]): PTRB[] {
    if (filterMode === 'mes-ano') {
      if (filtroMes) {
        lista = lista.filter(p => {
          const d = new Date(p.data + 'T12:00:00');
          return (d.getMonth() + 1).toString() === filtroMes;
        });
      }
      if (filtroAno) {
        lista = lista.filter(p => p.data?.startsWith(filtroAno));
      }
    } else {
      if (dataInicio) {
        lista = lista.filter(p => p.data >= dataInicio);
      }
      if (dataFinal) {
        lista = lista.filter(p => p.data <= dataFinal);
      }
    }
    return lista;
  }

  const filtered = useMemo(() => {
    let lista = ptrbs;
    if (filtroEquipe) lista = lista.filter(p => p.equipe === filtroEquipe);
    if (filtroAssunto) lista = lista.filter(p => p.assuntoMinistrado === filtroAssunto);
    lista = applyPeriodFilter(lista);
    if (view === 'detail' && selectedPessoa) {
      lista = lista.filter(p =>
        p.participantes.some(part => part.nomeCompleto === selectedPessoa)
      );
    }
    return lista.sort((a, b) => new Date(b.data || '').getTime() - new Date(a.data || '').getTime());
  }, [ptrbs, filtroMes, filtroAno, dataInicio, dataFinal, filterMode, filtroEquipe, filtroAssunto, view, selectedPessoa]);

  const expanded = useMemo(() => expandParticipants(filtered), [filtered]);

  const pessoasDisponiveis = useMemo(() => {
    const nomes = new Set<string>();
    let base = ptrbs;
    if (filtroEquipe) base = base.filter(p => p.equipe === filtroEquipe);
    base = applyPeriodFilter(base);
    for (const p of base) {
      for (const part of p.participantes) {
        if (part.nomeCompleto) nomes.add(part.nomeCompleto);
      }
    }
    return [...nomes].sort();
  }, [ptrbs, filtroEquipe, filtroMes, filtroAno, dataInicio, dataFinal, filterMode]);

  const assuntosDisponiveis = useMemo(() => {
    const set = new Set<string>();
    let base = ptrbs;
    if (filtroEquipe) base = base.filter(p => p.equipe === filtroEquipe);
    for (const p of base) {
      if (p.assuntoMinistrado) set.add(p.assuntoMinistrado);
    }
    return [...set].sort();
  }, [ptrbs, filtroEquipe]);

  const equipesPresentes = useMemo(() => {
    return [...EQUIPES];
  }, []);

  function getNomeGuerra(nomeCompleto: string): string {
    return bombeiros.get(nomeCompleto)?.nomeGuerra || nomeCompleto;
  }

  function getEquipe(nomeCompleto: string): string {
    return bombeiros.get(nomeCompleto)?.equipe || '';
  }

  function getFuncaoPadrao(nomeCompleto: string, expandedList: ExpandedPTRB[]): string {
    const fromBombeiro = bombeiros.get(nomeCompleto)?.cargo;
    if (fromBombeiro) return fromBombeiro;
    const funcoes = expandedList.filter(e => e.nome === nomeCompleto).map(e => e.funcao).filter(Boolean);
    if (funcoes.length === 0) return '';
    return funcoes.sort((a, b) => funcoes.filter(f => f === a).length - funcoes.filter(f => f === b).length).pop() || '';
  }

  function goToSummary() {
    setView('summary');
    setSelectedEquipe('');
    setSelectedPessoa('');
    setSelectedPTRB(null);
  }

  function goToPerson(equipe: string) {
    setSelectedEquipe(equipe);
    setFiltroEquipe(equipe);
    setView('person');
    setSelectedPessoa('');
    setSelectedPTRB(null);
  }

  function goToDetail(pessoa: string) {
    setSelectedPessoa(pessoa);
    setView('detail');
    setSelectedPTRB(null);
  }

  function goToViewPTRB(ptrb: PTRB) {
    setSelectedPTRB(ptrb);
    setView('view-ptrb');
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const statsFiltered = useMemo(() => {
    let totalHoras = 0;
    let totalPessoas = new Set<string>();
    for (const e of expanded) {
      totalHoras += e.horas;
      totalPessoas.add(e.nome);
    }
    return {
      registros: filtered.length,
      horas: totalHoras,
      pessoas: totalPessoas.size,
    };
  }, [expanded, filtered]);

  const equipeAssuntoData = useMemo(() => {
    const map = new Map<string, Map<string, { horas: number; qtd: number }>>();
    for (const e of expanded) {
      const eq = e.ptrb.equipe || '(sem equipe)';
      const as = e.ptrb.assuntoMinistrado || '(sem assunto)';
      if (!map.has(eq)) map.set(eq, new Map());
      const sub = map.get(eq)!;
      if (!sub.has(as)) sub.set(as, { horas: 0, qtd: 0 });
      const item = sub.get(as)!;
      item.horas += e.horas;
      item.qtd++;
    }

    const rows: { equipe: string; assunto: string; horas: number; qtd: number }[] = [];
    for (const [equipe, assuntos] of map) {
      for (const [assunto, data] of assuntos) {
        rows.push({ equipe, assunto, horas: data.horas, qtd: data.qtd });
      }
    }
    return rows;
  }, [expanded]);

  const sortedEqRows = useMemo(() => {
    const sorted = [...equipeAssuntoData];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'label') cmp = a.equipe.localeCompare(b.equipe) || a.assunto.localeCompare(b.assunto);
      else if (sortKey === 'assunto') cmp = a.assunto.localeCompare(b.assunto);
      else if (sortKey === 'horas') cmp = a.horas - b.horas;
      else if (sortKey === 'qtd') cmp = a.qtd - b.qtd;
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [equipeAssuntoData, sortKey, sortAsc]);

  const pessoaAssuntoData = useMemo(() => {
    const map = new Map<string, Map<string, { horas: number; qtd: number; funcao: string; equipe: string }>>();
    const pessoaFuncoes = new Map<string, Map<string, number>>();
    for (const e of expanded) {
      const as = e.ptrb.assuntoMinistrado || '(sem assunto)';
      if (!map.has(e.nome)) map.set(e.nome, new Map());
      const sub = map.get(e.nome)!;
      const homeEquipe = getEquipe(e.nome) || e.ptrb.equipe;
      if (!sub.has(as)) sub.set(as, { horas: 0, qtd: 0, funcao: e.funcao, equipe: homeEquipe });
      const item = sub.get(as)!;
      item.horas += e.horas;
      item.qtd++;
      if (e.funcao) {
        if (!pessoaFuncoes.has(e.nome)) pessoaFuncoes.set(e.nome, new Map());
        const fc = pessoaFuncoes.get(e.nome)!;
        fc.set(e.funcao, (fc.get(e.funcao) || 0) + 1);
      }
    }

    const rows: { pessoa: string; assunto: string; horas: number; qtd: number; funcao: string; equipe: string }[] = [];
    for (const [pessoa, assuntos] of map) {
      const funcaoMaisComum = [...(pessoaFuncoes.get(pessoa)?.entries() || [])]
        .sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      for (const [assunto, data] of assuntos) {
        rows.push({ pessoa, assunto, horas: data.horas, qtd: data.qtd, funcao: funcaoMaisComum || data.funcao, equipe: data.equipe });
      }
    }
    return rows;
  }, [expanded]);

  const sortedPessoaRows = useMemo(() => {
    const sorted = [...pessoaAssuntoData];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'label') cmp = a.pessoa.localeCompare(b.pessoa) || a.assunto.localeCompare(b.assunto);
      else if (sortKey === 'assunto') cmp = a.assunto.localeCompare(b.assunto);
      else if (sortKey === 'horas') cmp = a.horas - b.horas;
      else if (sortKey === 'qtd') cmp = a.qtd - b.qtd;
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [pessoaAssuntoData, sortKey, sortAsc]);

  const detailPTRBs = useMemo(() => filtered, [filtered]);

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <span className="ml-1 text-graphite-300">↕</span>;
    return <span className="ml-1 text-aviation-600">{sortAsc ? '↑' : '↓'}</span>;
  }

  function SortHeader({ column, children }: { column: SortKey; children: React.ReactNode }) {
    return (
      <th
        className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-graphite-500 hover:text-graphite-700 dark:text-graphite-400 dark:hover:text-graphite-200"
        onClick={() => handleSort(column)}
      >
        {children} <SortIcon column={column} />
      </th>
    );
  }

  function handlePrintSummary() {
    const allAssuntos = [...new Set(ptrbs.map(p => p.assuntoMinistrado).filter(Boolean))].sort();
    const colunas = ['Equipe', ...allAssuntos, 'Total Horas'];
    const eqMap = new Map<string, Map<string, number>>();
    for (const e of expanded) {
      const eq = e.ptrb.equipe || '(sem equipe)';
      const as = e.ptrb.assuntoMinistrado || '(sem assunto)';
      if (!eqMap.has(eq)) eqMap.set(eq, new Map());
      const sub = eqMap.get(eq)!;
      sub.set(as, (sub.get(as) || 0) + e.horas);
    }
    const linhas = [...eqMap.entries()].map(([equipe, valores]) =>
      [equipe, ...allAssuntos.map(a => { const v = valores.get(a); return v ? horasStr(v) : '-'; }), horasStr([...valores.values()].reduce((s, v) => s + v, 0))]
    );
    const totalRow = ['TOTAL', ...allAssuntos.map(a => {
      const t = [...eqMap.values()].reduce((s, sub) => s + (sub.get(a) || 0), 0);
      return t > 0 ? horasStr(t) : '-';
    }), horasStr([...eqMap.values()].reduce((s, sub) => s + [...sub.values()].reduce((s2, v) => s2 + v, 0), 0))];
    linhas.push(totalRow);
    imprimirHTML('Relatório PTR-BA - Horas por Equipe e Assunto', colunas, linhas);
  }

  function handlePrintPerson() {
    const allAssuntos = [...new Set(ptrbs.map(p => p.assuntoMinistrado).filter(Boolean))].sort();
    const colunas = ['Militar', ...allAssuntos, 'Total Horas'];
    const pesMap = new Map<string, { funcao: string; equipe: string; valores: Map<string, number> }>();
    const funcaoCount = new Map<string, Map<string, number>>();
    for (const e of expanded) {
      const as = e.ptrb.assuntoMinistrado || '(sem assunto)';
      if (!pesMap.has(e.nome)) pesMap.set(e.nome, { funcao: e.funcao, equipe: e.ptrb.equipe, valores: new Map() });
      const item = pesMap.get(e.nome)!;
      item.valores.set(as, (item.valores.get(as) || 0) + e.horas);
      item.equipe = e.ptrb.equipe || item.equipe;
      if (e.funcao) {
        if (!funcaoCount.has(e.nome)) funcaoCount.set(e.nome, new Map());
        const fc = funcaoCount.get(e.nome)!;
        fc.set(e.funcao, (fc.get(e.funcao) || 0) + 1);
      }
    }
    const linhas = [...pesMap.entries()].map(([nome, item]) => {
      const funcao = [...(funcaoCount.get(nome)?.entries() || [])].sort((a, b) => b[1] - a[1])[0]?.[0] || item.funcao;
      const homeEquipe = getEquipe(nome) || item.equipe;
      return [
        `${funcao} ${getNomeGuerra(nome)} (${homeEquipe})`,
        ...allAssuntos.map(a => { const v = item.valores.get(a); return v ? horasStr(v) : '-'; }),
        horasStr([...item.valores.values()].reduce((s, v) => s + v, 0)),
      ];
    });
    const totalRow = ['TOTAL', ...allAssuntos.map(a => {
      const t = [...pesMap.values()].reduce((s, item) => s + (item.valores.get(a) || 0), 0);
      return t > 0 ? horasStr(t) : '-';
    }), horasStr([...pesMap.values()].reduce((s, item) => s + [...item.valores.values()].reduce((s2, v) => s2 + v, 0), 0))];
    linhas.push(totalRow);
    imprimirHTML(`Relatório PTR-BA - Horas por Pessoa e Assunto (${selectedEquipe})`, colunas, linhas);
  }

  function handlePrintDetail() {
    const colunas = ['Data', 'Equipe', 'Assunto', 'Horário', 'Duração', 'Instrutor'];
    const linhas = detailPTRBs.map(p => [
      formatDate(p.data),
      p.equipe,
      p.assuntoMinistrado || '-',
      `${p.horaInicio || '-'} às ${p.horaTermino || '-'}`,
      p.duracao || '-',
      p.instrutor || '-',
    ]);
    imprimirHTML(`Relatório PTR-BA - Registros de ${selectedPessoa}`, colunas, linhas);
  }

  const filtroPeriodoLabel = filterMode === 'mes-ano'
    ? `${filtroMes ? MESES[Number(filtroMes)] : 'Todos os meses'} ${filtroAno}`
    : `${dataInicio || '...'} a ${dataFinal || '...'}`;
  const filtrosAtivos = (filterMode === 'mes-ano' && (filtroMes || filtroAno)) || (filterMode === 'periodo' && (dataInicio || dataFinal))
    ? ` · ${filtroPeriodoLabel}`
    : '';
  const filtroEquipeLabel = filtroEquipe ? ` · Equipe ${filtroEquipe}` : ' · Todas as equipes';

  function FilterBar() {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-xl border border-graphite-300/60 bg-white/70 text-xs font-medium dark:border-border-dark dark:bg-surface-card">
          <button
            onClick={() => setFilterMode('mes-ano')}
            className={`px-3 py-2 transition-colors ${filterMode === 'mes-ano' ? 'bg-aviation-600 text-white' : 'text-graphite-600 hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover'}`}
          >
            Mês/Ano
          </button>
          <button
            onClick={() => setFilterMode('periodo')}
            className={`px-3 py-2 transition-colors ${filterMode === 'periodo' ? 'bg-aviation-600 text-white' : 'text-graphite-600 hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover'}`}
          >
            Período
          </button>
        </div>

        {filterMode === 'mes-ano' ? (
          <>
            <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className={inputClass}>
              {ANOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} className={inputClass}>
              <option value="">Todos os meses</option>
              {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
          </>
        ) : (
          <>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className={inputClass} placeholder="Data início" />
            <span className="text-xs text-graphite-400">a</span>
            <input type="date" value={dataFinal} onChange={e => setDataFinal(e.target.value)}
              className={inputClass} placeholder="Data fim" />
          </>
        )}

        <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)} className={inputClass}>
          <option value="">Todas as equipes</option>
          {equipesPresentes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
        <select value={filtroAssunto} onChange={e => setFiltroAssunto(e.target.value)} className={inputClass}>
          <option value="">Todos os assuntos</option>
          {assuntosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <span className="text-xs text-graphite-400">{filtered.length} registro(s)</span>
      </div>
    );
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-aviation-500 border-t-transparent" />
        </div>
      </PageContainer>
    );
  }

  if (view === 'view-ptrb' && selectedPTRB) {
    return (
      <PageContainer>
        <div className="mb-4 flex items-center gap-3">
          <button onClick={() => goToDetail(selectedPessoa)}
            className="flex items-center gap-1 rounded-xl border border-graphite-300/60 bg-white/80 px-3 py-2 text-sm font-medium text-graphite-700 shadow-sm transition-all duration-200 hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card/80 dark:text-graphite-200">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        </div>
        <div className="mb-4 flex items-center justify-between">
          <PageTitle icon={FileText} title={`PTR-BA - ${selectedPTRB.equipe} - ${formatDate(selectedPTRB.data)}`} />
          <button onClick={() => window.print()}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 hover:from-aviation-500 hover:to-aviation-600 active:scale-[0.98]">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        </div>
        <div id="ptrb-print-area" className="rounded-2xl border border-graphite-200/60 bg-white/80 p-6 shadow-sm dark:border-border-dark dark:bg-surface-card print:border-none print:shadow-none">
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div><p className="text-xs text-graphite-400">Data</p><p className="text-sm font-medium dark:text-graphite-100">{formatDate(selectedPTRB.data)}</p></div>
            <div><p className="text-xs text-graphite-400">Equipe</p><p className="text-sm font-medium dark:text-graphite-100">{selectedPTRB.equipe}</p></div>
            <div><p className="text-xs text-graphite-400">Horário</p><p className="text-sm font-medium dark:text-graphite-100">{selectedPTRB.horaInicio} às {selectedPTRB.horaTermino} ({selectedPTRB.duracao}h)</p></div>
            <div><p className="text-xs text-graphite-400">Turno</p><p className="text-sm font-medium dark:text-graphite-100">{selectedPTRB.turno}</p></div>
          </div>
          {selectedPTRB.participantes.length > 0 && (
            <div className="mb-6">
              <p className="mb-2 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Participantes</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-graphite-200 dark:border-border-dark">
                    <th className="px-3 py-1.5 text-left text-xs text-graphite-500">Função</th>
                    <th className="px-3 py-1.5 text-left text-xs text-graphite-500">Nome</th>
                    <th className="px-3 py-1.5 text-left text-xs text-graphite-500">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPTRB.participantes.map((part, i) => (
                    <tr key={i} className="border-b border-graphite-100 dark:border-border-dark">
                      <td className="px-3 py-1.5 dark:text-graphite-100">{part.funcao || '-'}</td>
                      <td className="px-3 py-1.5 dark:text-graphite-100">{part.nomeCompleto || '-'}</td>
                      <td className="px-3 py-1.5 dark:text-graphite-100">{part.situacao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {selectedPTRB.observacoes && <div className="mb-4"><p className="mb-1 text-xs font-semibold text-aviation-600">Observações</p><p className="text-sm whitespace-pre-wrap dark:text-graphite-100">{selectedPTRB.observacoes}</p></div>}
          {selectedPTRB.instrutor && <div className="mb-4"><p className="mb-1 text-xs font-semibold text-aviation-600">Instrutor</p><p className="text-sm dark:text-graphite-100">{selectedPTRB.instrutor}</p></div>}
          {selectedPTRB.assuntoMinistrado && <div className="mb-4"><p className="mb-1 text-xs font-semibold text-aviation-600">Assunto Ministrado</p><p className="text-sm dark:text-graphite-100">{selectedPTRB.assuntoMinistrado}</p></div>}
          {selectedPTRB.descricao && <div className="mb-4"><p className="mb-1 text-xs font-semibold text-aviation-600">Descrição</p><p className="text-sm whitespace-pre-wrap dark:text-graphite-100">{selectedPTRB.descricao}</p></div>}
          {selectedPTRB.informacoesComplementares && <div className="mb-4"><p className="mb-1 text-xs font-semibold text-aviation-600">Informações Complementares</p><p className="text-sm whitespace-pre-wrap dark:text-graphite-100">{selectedPTRB.informacoesComplementares}</p></div>}
          {selectedPTRB.fotos.some(f => f) && (
            <div>
              <p className="mb-1 text-xs font-semibold text-aviation-600">Fotos</p>
              <div className="grid grid-cols-3 gap-4">
                {selectedPTRB.fotos.filter(f => f).map((f, i) => (
                  <img key={i} src={f} alt={`Foto ${i + 1}`} className="w-full rounded-lg object-cover" />
                ))}
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    );
  }

  if (view === 'summary') {
    return (
      <PageContainer>
        <PageTitle icon={FileText} title={`PTR-BA${filtrosAtivos}${filtroEquipeLabel}`} subtitle="Relatório de horas por equipe e assunto" />
        <FilterBar />
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-graphite-200 bg-white p-3 text-center dark:border-border-dark dark:bg-surface-card">
            <p className="text-xl font-black text-graphite-900 dark:text-graphite-100">{statsFiltered.registros}</p>
            <p className="text-[10px] font-medium text-graphite-500">Registros</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{horasStr(statsFiltered.horas)}</p>
            <p className="text-[10px] font-medium text-emerald-500">Horas totais</p>
          </div>
          <div className="rounded-xl border border-aviation-200 bg-aviation-50 p-3 text-center dark:border-aviation-800 dark:bg-aviation-900/20">
            <p className="text-xl font-black text-aviation-700 dark:text-aviation-300">{statsFiltered.pessoas}</p>
            <p className="text-[10px] font-medium text-aviation-500">Pessoas</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-xl font-black text-amber-700 dark:text-amber-300">{equipesPresentes.length}</p>
            <p className="text-[10px] font-medium text-amber-500">Equipes</p>
          </div>
        </div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-graphite-700 dark:text-graphite-300">
            Clique em uma equipe para ver detalhamento por pessoa
          </p>
          {sortedEqRows.length > 0 && (
            <button onClick={handlePrintSummary}
              className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 active:scale-[0.98]">
              <Printer className="h-4 w-4" /> Imprimir
            </button>
          )}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-graphite-200/60 bg-white/80 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 dark:border-border-dark">
                <SortHeader column="label">Equipe</SortHeader>
                <SortHeader column="assunto">Assunto</SortHeader>
                <SortHeader column="horas">Horas</SortHeader>
                <SortHeader column="qtd">Registros</SortHeader>
              </tr>
            </thead>
            <tbody>
              {sortedEqRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-graphite-400">
                    Nenhum PTR-BA encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                sortedEqRows.map((r, i) => (
                  <tr
                    key={`${r.equipe}-${r.assunto}-${i}`}
                    className="border-b border-graphite-100 transition-colors hover:bg-aviation-50/50 dark:border-border-dark dark:hover:bg-aviation-900/10 cursor-pointer"
                    onClick={() => goToPerson(r.equipe)}
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-aviation-100 px-2.5 py-0.5 text-xs font-semibold text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300">
                        <Users className="h-3 w-3" /> {r.equipe}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-graphite-900 dark:text-graphite-100">{r.assunto}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">{horasStr(r.horas)}</td>
                    <td className="px-4 py-3 text-graphite-600 dark:text-graphite-400">{r.qtd}x</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageContainer>
    );
  }

  if (view === 'person') {
    return (
      <PageContainer>
        <div className="mb-4 flex items-center gap-3">
          <button onClick={goToSummary}
            className="flex items-center gap-1 rounded-xl border border-graphite-300/60 bg-white/80 px-3 py-2 text-sm font-medium text-graphite-700 shadow-sm transition-all duration-200 hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card/80 dark:text-graphite-200">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
          <PageTitle icon={FileText} title={`PTR-BA · Equipe ${selectedEquipe}${filtrosAtivos}`} subtitle="Horas por pessoa e assunto" />
        </div>
        <FilterBar />
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-graphite-200 bg-white p-3 text-center dark:border-border-dark dark:bg-surface-card">
            <p className="text-xl font-black text-graphite-900 dark:text-graphite-100">{statsFiltered.pessoas}</p>
            <p className="text-[10px] font-medium text-graphite-500">Pessoas</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">{horasStr(statsFiltered.horas)}</p>
            <p className="text-[10px] font-medium text-emerald-500">Horas totais</p>
          </div>
          <div className="rounded-xl border border-aviation-200 bg-aviation-50 p-3 text-center dark:border-aviation-800 dark:bg-aviation-900/20">
            <p className="text-xl font-black text-aviation-700 dark:text-aviation-300">{statsFiltered.registros}</p>
            <p className="text-[10px] font-medium text-aviation-500">Registros</p>
          </div>
        </div>
        <div className="mb-4 flex justify-end">
          {sortedPessoaRows.length > 0 && (
            <button onClick={handlePrintPerson}
              className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 active:scale-[0.98]">
              <Printer className="h-4 w-4" /> Imprimir
            </button>
          )}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-graphite-200/60 bg-white/80 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 dark:border-border-dark">
                <SortHeader column="label">Militar</SortHeader>
                <SortHeader column="assunto">Assunto</SortHeader>
                <SortHeader column="horas">Horas</SortHeader>
                <SortHeader column="qtd">Registros</SortHeader>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-graphite-500">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedPessoaRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-graphite-400">
                    Nenhum PTR-BA encontrado com os filtros atuais.
                  </td>
                </tr>
              ) : (
                sortedPessoaRows.map((r, i) => (
                  <tr
                    key={`${r.pessoa}-${r.assunto}-${i}`}
                    className="border-b border-graphite-100 transition-colors hover:bg-aviation-50/50 dark:border-border-dark dark:hover:bg-aviation-900/10"
                  >
                    <td className="px-4 py-3 font-medium text-graphite-900 dark:text-graphite-100">
                      {r.funcao && <span className="rounded bg-aviation-100 px-1.5 py-0.5 text-xs font-semibold text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300 mr-1.5">{r.funcao}</span>}
                      {getNomeGuerra(r.pessoa)}
                      <span className="ml-2 rounded bg-graphite-100 px-1.5 py-0.5 text-[10px] font-medium text-graphite-500 dark:bg-surface-hover dark:text-graphite-400">{getEquipe(r.pessoa) || r.equipe}</span>
                    </td>
                    <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{r.assunto}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">{horasStr(r.horas)}</td>
                    <td className="px-4 py-3 text-graphite-600 dark:text-graphite-400">{r.qtd}x</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => goToDetail(r.pessoa)}
                        className="inline-flex items-center gap-1 rounded-lg bg-aviation-100 px-2 py-1 text-xs font-medium text-aviation-700 transition-colors hover:bg-aviation-200 dark:bg-aviation-900/30 dark:text-aviation-300 dark:hover:bg-aviation-900/50"
                      >
                        <Eye className="h-3 w-3" /> Ver PTR-BAs
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-4 flex items-center gap-3">
        <button onClick={() => goToPerson(selectedEquipe)}
          className="flex items-center gap-1 rounded-xl border border-graphite-300/60 bg-white/80 px-3 py-2 text-sm font-medium text-graphite-700 shadow-sm transition-all duration-200 hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card/80 dark:text-graphite-200">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <PageTitle icon={FileText} title={`PTR-BA · ${selectedPessoa}${filtrosAtivos}`} subtitle={`Equipe ${selectedEquipe}`} />
      </div>

      <FilterBar />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-graphite-200 bg-white p-3 text-center dark:border-border-dark dark:bg-surface-card">
          <p className="text-xl font-black text-graphite-900 dark:text-graphite-100">{detailPTRBs.length}</p>
          <p className="text-[10px] font-medium text-graphite-500">Registros</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center dark:border-emerald-800 dark:bg-emerald-900/20">
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-300">
            {horasStr(detailPTRBs.reduce((s, p) => s + calcHoras(p.horaInicio, p.horaTermino), 0))}
          </p>
          <p className="text-[10px] font-medium text-emerald-500">Horas totais</p>
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        {detailPTRBs.length > 0 && (
          <button onClick={handlePrintDetail}
            className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 active:scale-[0.98]">
            <Printer className="h-4 w-4" /> Imprimir
          </button>
        )}
      </div>

      {detailPTRBs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-graphite-300 bg-white/50 p-12 text-center dark:border-border-dark dark:bg-surface-card">
          <FileText className="mb-4 h-12 w-12 text-graphite-300" />
          <h3 className="text-lg font-semibold text-graphite-700">Nenhum PTR-BA encontrado</h3>
          <p className="text-sm text-graphite-400">{selectedPessoa} não possui registros com os filtros atuais.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {detailPTRBs.map(p => (
            <div key={p.id} className="rounded-2xl border border-graphite-200 bg-white shadow-sm dark:border-border-dark dark:bg-surface-card">
              <button
                onClick={() => setExpandedPTRB(expandedPTRB === p.id ? null : p.id)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-bold text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-graphite-900 dark:text-graphite-100">{p.assuntoMinistrado || 'PTR-BA'}</p>
                  <p className="text-xs text-graphite-500">{formatDate(p.data)} · Equipe {p.equipe} · {p.instrutor || 'N/A'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); goToViewPTRB(p); }}
                    className="rounded-lg border border-graphite-200 bg-white px-2 py-1 text-xs font-medium text-graphite-600 transition-colors hover:bg-graphite-50 dark:border-border-dark dark:bg-surface-card dark:text-graphite-300 dark:hover:bg-surface-hover"
                    title="Visualizar detalhes"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs text-graphite-400">{p.horaInicio}-{p.horaTermino}</span>
                  {expandedPTRB === p.id ? <ChevronUp className="h-4 w-4 text-graphite-400" /> : <ChevronDown className="h-4 w-4 text-graphite-400" />}
                </div>
              </button>
              {expandedPTRB === p.id && (
                <div className="border-t border-graphite-200 px-5 py-4 dark:border-border-dark">
                  <p className="text-sm text-graphite-700 dark:text-graphite-300 whitespace-pre-wrap">{p.descricao || p.observacoes || 'Sem descrição'}</p>
                  {p.participantes?.length > 0 && (
                    <div className="mt-3 border-t border-graphite-100 pt-3 dark:border-border-dark">
                      <p className="mb-2 text-xs font-semibold text-aviation-600 dark:text-aviation-400">Participantes</p>
                      <div className="flex flex-wrap gap-1">
                        {p.participantes.map((part, i) => (
                          <span key={i}
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              part.nomeCompleto === selectedPessoa
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 ring-1 ring-emerald-400'
                                : 'bg-graphite-100 text-graphite-700 dark:bg-surface-hover dark:text-graphite-300'
                            }`}
                          >
                            {part.nomeCompleto || part.nomeGuerra || '(sem nome)'} ({part.situacao})
                          </span>
                        ))}
                      </div>
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
