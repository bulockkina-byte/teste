import { useState, useEffect, useMemo } from 'react';
import { FileText, ChevronDown, ChevronUp, Eye, Printer, ArrowLeft, Users } from 'lucide-react';
import { PageContainer } from '../../components/layout/PageContainer';
import { PageTitle } from '../../components/layout/PageTitle';
import { listarPTRBs } from '../../services/ptrbService';
import { listarBombeiros } from '../../services/bombeiroService';
import type { PTRB } from '../../types/ptrb';
import { EQUIPES, ASSUNTOS } from '../../types/ptrb';

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

const fmt = formatDate;

function calcHoras(inicio: string, termino: string): number {
  if (!inicio || !termino) return 0;
  const numsI = inicio.trim().match(/\d+/g);
  const numsT = termino.trim().match(/\d+/g);
  if (!numsI || !numsT) return 0;
  const h1 = Number(numsI[0]), m1 = Number(numsI[1] ?? 0);
  const h2 = Number(numsT[0]), m2 = Number(numsT[1] ?? 0);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return 0;
  let diff = h2 * 60 + m2 - (h1 * 60 + m1);
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}

function parseDuracao(d: string): number {
  if (!d) return 0;
  const nums = d.trim().match(/\d+/g);
  if (!nums) return 0;
  const h = Number(nums[0]), m = Number(nums[1] ?? 0);
  if (isNaN(h) || isNaN(m)) return 0;
  return h + m / 60;
}

function horasStr(h: number): string {
  const horas = Math.floor(h);
  const min = Math.round((h - horas) * 60);
  if (min === 0) return `${horas}h`;
  return `${horas}h${min.toString().padStart(2, '0')}min`;
}

const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const inputClass = 'rounded-xl border border-graphite-300/60 bg-white/70 px-3 py-2.5 text-sm backdrop-blur-sm transition-all duration-200 hover:border-graphite-300/70 focus:border-aviation-500/50 focus:bg-white focus:ring-2 focus:ring-aviation-500/10 dark:border-border-dark dark:bg-surface-card dark:text-graphite-100 dark:focus:border-aviation-400/50 dark:focus:bg-surface-elevated';

const HIERARQUIA = ['BA-CE', 'BA-LR', 'BA-MC', 'BA-RE', 'BA-2', 'GS', 'OC', 'APOC', ''];
const EQUIPE_ORDER = ['Alfa', 'Bravo', 'Charlie', 'Delta', 'Feirista'];

type ViewLevel = 'summary' | 'person' | 'detail' | 'view-ptrb';
type ViewMode = 'equipe' | 'membros';

interface ExpandedPTRB {
  ptrb: PTRB;
  nome: string;
  funcao: string;
  horas: number;
}

function expandParticipants(ptrbs: PTRB[]): ExpandedPTRB[] {
  const result: ExpandedPTRB[] = [];
  for (const p of ptrbs) {
    const h = p.horas || calcHoras(p.horaInicio, p.horaTermino) || parseDuracao(p.duracao);
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
  const colLabels = colunas.map(abreviarLabel);
  const colsHtml = colLabels.map((c, i) => `<th${i === 0 ? ' style="width:16%;text-align:left;"' : ''} title="${c}">${c}</th>`).join('');
  const rowsHtml = linhas.map(row => `<tr>${row.map(c => `<td>${c}</td>`).join('')}</tr>`).join('\n');
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>${titulo}</title>
    <style>
      @page { margin: 8mm; size: landscape; }
      body { font-family: Arial, sans-serif; margin: 0; padding: 8px; }
      h1 { font-size: 14px; margin-bottom: 4px; }
      p.filtros { font-size: 10px; color: #555; margin-bottom: 6px; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: auto; }
      th, td { border: 1px solid #000; padding: 2px 4px; font-size: 11px; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      th { background: #4472C4; color: #fff; font-weight: bold; text-align: center; }
      .footer { margin-top: 8px; font-size: 9px; color: #888; }
      .legenda { margin-top: 10px; }
      .legenda td { border: none; padding: 1px 3px; font-size: 9px; }
      .legenda td:first-child { width: 22px; }
    </style>
    </head>
    <body>
      <h1>${titulo}</h1>
      <p class="filtros">Gerado em ${new Date().toLocaleString('pt-BR')}</p>
      <table><thead><tr>${colsHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>
      <div class="legenda">
        <p><strong>Legenda — Assuntos Ministrados:</strong></p>
        <table style="table-layout:auto;">${ASSUNTOS.map((a, i) => { const txt = a.replace(/^\d+\.\s*/, ''); return '<tr><td>' + (i + 1) + '.</td><td>' + txt + '</td></tr>'; }).join('\n')}</table>
      </div>
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

function abreviarLabel(a: string): string {
  const num = a.match(/^(\d+)\.\s*/);
  if (num) return num[1];
  return a.length > 10 ? a.substring(0, 10) + '\u2026' : a;
}

function imprimirHTMLEfetivo(titulo: string, allAssuntos: string[], equipes: { equipe: string; pessoas: { num: number; funcao: string; nome: string; valores: string[]; totalHoras: string; registros: number }[] }[]) {
  const colLabels = allAssuntos.map(abreviarLabel);
  const colsHtml = '<th style="width:3%">N\u00ba</th><th style="width:7%">Fun\u00e7\u00e3o</th><th style="width:14%">Nome</th>' + colLabels.map(c => '<th title="' + c + '">' + c + '</th>').join('') + '<th style="width:6%">Total</th><th style="width:3%">Reg.</th>';

  function renderEquipeTable(eq: typeof equipes[0]) {
    const pessoasRows = eq.pessoas.map(p =>
      '<tr' + (p.funcao === 'BA-CE' ? ' style="background:#e8f0fe;"' : '') + '>' +
      '<td>' + p.num + '</td>' +
      '<td style="font-weight:' + (p.funcao === 'BA-CE' ? 'bold' : 'normal') + ';">' + p.funcao + '</td>' +
      '<td style="text-align:left;">' + p.nome + '</td>' +
      p.valores.map(v => '<td>' + v + '</td>').join('') +
      '<td style="font-weight:bold;">' + p.totalHoras + '</td>' +
      '<td>' + p.registros + '</td>' +
      '</tr>'
    ).join('\n');
    const headerRow = '<tr class="eq-header"><td colspan="' + (allAssuntos.length + 4) + '">Equipe ' + eq.equipe + '</td></tr>';
    return '<table><thead><tr>' + colsHtml + '</tr></thead><tbody>' + headerRow + '\n' + pessoasRows + '</tbody></table>';
  }

  const chunks: typeof equipes[] = [];
  for (let i = 0; i < equipes.length; i += 3) {
    chunks.push(equipes.slice(i, i + 3));
  }

  let html = '<!DOCTYPE html>\n<html><head><meta charset="utf-8"><title>' + titulo + '</title>\n<style>\n';
  html += '  @page { margin: 8mm; size: landscape; }\n';
  html += '  body { font-family: Arial, sans-serif; margin: 0; padding: 8px; }\n';
  html += '  h1 { font-size: 14px; margin-bottom: 4px; }\n';
  html += '  p.filtros { font-size: 10px; color: #555; margin-bottom: 6px; }\n';
  html += '  .chunk { page-break-after: always; }\n';
  html += '  table { width: 100%; border-collapse: collapse; table-layout: fixed; page-break-inside: avoid; margin-bottom: 4px; }\n';
  html += '  th, td { border: 1px solid #000; padding: 2px 4px; font-size: 11px; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n';
  html += '  th { background: #4472C4; color: #fff; font-weight: bold; }\n';
  html += '  .eq-header td { background: #2b5797; color: #fff; font-weight: bold; font-size: 11px; text-align: left; padding: 3px 6px; }\n';
  html += '  .footer { margin-top: 8px; font-size: 9px; color: #888; }\n';
  html += '  .legenda { margin-top: 10px; }\n';
  html += '  .legenda td { border: none; padding: 1px 3px; font-size: 9px; text-align: left; }\n';
  html += '  .legenda td:first-child { width: 22px; }\n';
  html += '</style></head><body>\n';
  html += '  <h1>' + titulo + '</h1>\n';
  html += '  <p class="filtros">Gerado em ' + new Date().toLocaleString('pt-BR') + ' \u00b7 Total de pessoas: ' + equipes.reduce(function(s, e) { return s + e.pessoas.length; }, 0) + '</p>\n';
  for (let i = 0; i < chunks.length; i++) {
    html += '  <div class="chunk">\n';
    for (const eq of chunks[i]) {
      html += '    ' + renderEquipeTable(eq) + '\n';
    }
    html += '  </div>\n';
  }
  html += '  <div class="legenda">\n';
  html += '    <p><strong>Legenda \u2014 Assuntos Ministrados:</strong></p>\n';
  html += '    <table style="table-layout:auto;">' + ASSUNTOS.map((a, i) => { const txt = a.replace(/^\d+\.\s*/, ''); return '<tr><td>' + (i + 1) + '.</td><td>' + txt + '</td></tr>'; }).join('\n') + '</table>\n';
  html += '  </div>\n';
  html += '  <p class="footer">Relat\u00f3rio PTR-BA - Se\u00e7\u00e3o de Instru\u00e7\u00e3o</p>\n';
  html += '</body></html>';
  var w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(function() { w.print(); }, 700); }
}

export function PTRBA() {
  const [ptrbs, setPtrbs] = useState<PTRB[]>([]);
  const [bombeiros, setBombeiros] = useState<Map<string, { nomeGuerra: string; cargo: string; equipe: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewLevel>('summary');
  const [filterMode, setFilterMode] = useState<'mes-ano' | 'periodo'>('mes-ano');
  const [filtroMes, setFiltroMes] = useState('');
  const [filtroAno, setFiltroAno] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFinal, setDataFinal] = useState('');
  const [filtroEquipe, setFiltroEquipe] = useState('');
  const [filtroAssunto, setFiltroAssunto] = useState('');
  const [filtroPessoa, setFiltroPessoa] = useState('');
  const [selectedEquipe, setSelectedEquipe] = useState('');
  const [selectedPessoa, setSelectedPessoa] = useState('');
  const [selectedPTRB, setSelectedPTRB] = useState<PTRB | null>(null);
  const [visualizandoPtrb, setVisualizandoPtrb] = useState<PTRB | null>(null);
  const [expandedPTRB, setExpandedPTRB] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('label');
  const [sortAsc, setSortAsc] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('equipe');

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
    if (filtroEquipe) lista = lista.filter(p => p.equipe?.trim() === filtroEquipe);
    if (filtroAssunto) lista = lista.filter(p => p.assuntoMinistrado?.trim() === filtroAssunto);
  if (filtroPessoa) {
    const nomeBusca = filtroPessoa.trim().toLowerCase();
    lista = lista.filter(p =>
      p.participantes.some(part => part.nomeCompleto.trim().toLowerCase() === nomeBusca)
    );
  }
    lista = applyPeriodFilter(lista);
  if (view === 'detail' && selectedPessoa) {
    const nomeBusca = selectedPessoa.trim().toLowerCase();
    lista = lista.filter(p =>
      p.participantes.some(part => part.nomeCompleto.trim().toLowerCase() === nomeBusca)
    );
  }
    return lista.sort((a, b) => new Date(b.data || '').getTime() - new Date(a.data || '').getTime());
  }, [ptrbs, filtroMes, filtroAno, dataInicio, dataFinal, filterMode, filtroEquipe, filtroAssunto, filtroPessoa, view, selectedPessoa]);

  const expanded = useMemo(() => expandParticipants(filtered), [filtered]);

  const pessoasFiltro = useMemo(() => {
    const nomes = new Set<string>();
    for (const [nome, info] of bombeiros) {
      if (filtroEquipe && info.equipe !== filtroEquipe) continue;
      nomes.add(nome);
    }
    return [...nomes].sort();
  }, [bombeiros, filtroEquipe]);

  const assuntosDisponiveis = useMemo(() => {
    const set = new Set(ASSUNTOS);
    for (const p of ptrbs) {
      const a = p.assuntoMinistrado?.trim();
      if (a) set.add(a);
    }
    return [...set].sort();
  }, [ptrbs]);

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
    setViewMode('equipe');
  }

  function goToPerson(equipe: string) {
    setSelectedEquipe(equipe);
    setFiltroEquipe(equipe);
    setViewMode('membros');
    setView('person');
    setSelectedPessoa('');
    setFiltroPessoa('');
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

  const equipeRows = useMemo(() => {
    const map = new Map<string, Map<string, { horas: number; qtd: number }>>();
    for (const p of filtered) {
      const eq = p.equipe || '(sem equipe)';
      const as = p.assuntoMinistrado || '(sem assunto)';
      const h = p.horas || calcHoras(p.horaInicio, p.horaTermino) || parseDuracao(p.duracao);
      if (!map.has(eq)) map.set(eq, new Map());
      const sub = map.get(eq)!;
      if (!sub.has(as)) sub.set(as, { horas: 0, qtd: 0 });
      const item = sub.get(as)!;
      item.horas += h;
      item.qtd++;
    }
    const rows: { equipe: string; assunto: string; horas: number; qtd: number }[] = [];
    for (const [equipe, assuntos] of map) {
      for (const [assunto, data] of assuntos) {
        rows.push({ equipe, assunto, horas: data.horas, qtd: data.qtd });
      }
    }
    return rows;
  }, [filtered]);

  const statsFiltered = useMemo(() => {
    if (viewMode === 'equipe') {
      let totalHoras = 0;
      const equipesSet = new Set<string>();
      for (const r of equipeRows) {
        totalHoras += r.horas;
        equipesSet.add(r.equipe);
      }
      return {
        registros: filtered.length,
        horas: totalHoras,
        pessoas: equipesSet.size,
        totalBombeiros: equipesPresentes.length,
      };
    }
    let totalHoras = 0;
    let totalPessoas = new Set<string>();
    for (const e of expanded) {
      totalHoras += e.horas;
      totalPessoas.add(e.nome);
    }
    const totalBombeiros = filtroEquipe
      ? [...bombeiros.values()].filter(b => b.equipe === filtroEquipe).length
      : bombeiros.size;
    return {
      registros: filtered.length,
      horas: totalHoras,
      pessoas: totalPessoas.size,
      totalBombeiros,
    };
  }, [viewMode, equipeRows, expanded, filtered, bombeiros, filtroEquipe, equipesPresentes.length]);

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
    const source = viewMode === 'equipe' ? equipeRows : equipeAssuntoData;
    const sorted = [...source];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'label') {
        const eqCmp = EQUIPE_ORDER.indexOf(a.equipe) - EQUIPE_ORDER.indexOf(b.equipe);
        if (eqCmp !== 0) return eqCmp;
        return a.assunto.localeCompare(b.assunto);
      }
      else if (sortKey === 'assunto') cmp = a.assunto.localeCompare(b.assunto);
      else if (sortKey === 'horas') cmp = a.horas - b.horas;
      else if (sortKey === 'qtd') cmp = a.qtd - b.qtd;
      return sortAsc ? cmp : -cmp;
    });
    return sorted;
  }, [viewMode, equipeRows, equipeAssuntoData, sortKey, sortAsc]);

  const pessoaAssuntoData = useMemo(() => {
    const map = new Map<string, Map<string, { horas: number; qtd: number; funcao: string; equipe: string }>>();
    const pessoaFuncoes = new Map<string, Map<string, number>>();
    for (const e of expanded) {
      const as = e.ptrb.assuntoMinistrado || '(sem assunto)';
      if (!map.has(e.nome)) map.set(e.nome, new Map());
      const sub = map.get(e.nome)!;
      const homeEquipe = e.ptrb.equipe || getEquipe(e.nome);
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
      if (sortKey === 'label') {
        const eqCmp = EQUIPE_ORDER.indexOf(a.equipe) - EQUIPE_ORDER.indexOf(b.equipe);
        if (eqCmp !== 0) return eqCmp;
        const hCmp = HIERARQUIA.indexOf(a.funcao) - HIERARQUIA.indexOf(b.funcao);
        if (hCmp !== 0) return hCmp;
        const nCmp = a.pessoa.localeCompare(b.pessoa);
        if (nCmp !== 0) return nCmp;
        return a.assunto.localeCompare(b.assunto);
      }
      let cmp = 0;
      if (sortKey === 'assunto') cmp = a.assunto.localeCompare(b.assunto);
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
    const allAssuntos = filtroAssunto ? [filtroAssunto] : assuntosDisponiveis;
    const colunas = ['Equipe', ...allAssuntos, 'Total Horas'];
    const eqMap = new Map<string, Map<string, number>>();
    const source = viewMode === 'equipe' ? filtered : expanded;
    for (const item of source) {
      const eq = viewMode === 'equipe' ? (item as PTRB).equipe || '(sem equipe)' : (item as ExpandedPTRB).ptrb.equipe || '(sem equipe)';
      const as = viewMode === 'equipe' ? ((item as PTRB).assuntoMinistrado || '(sem assunto)').trim() : ((item as ExpandedPTRB).ptrb.assuntoMinistrado || '(sem assunto)').trim();
      const horas = viewMode === 'equipe' ? ((item as PTRB).horas || calcHoras((item as PTRB).horaInicio, (item as PTRB).horaTermino) || parseDuracao((item as PTRB).duracao)) : (item as ExpandedPTRB).horas;
      if (!eqMap.has(eq)) eqMap.set(eq, new Map());
      const sub = eqMap.get(eq)!;
      sub.set(as, (sub.get(as) || 0) + horas);
    }
    const linhas = [...eqMap.entries()]
      .sort((a, b) => {
        const ia = EQUIPE_ORDER.indexOf(a[0]);
        const ib = EQUIPE_ORDER.indexOf(b[0]);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      })
      .map(([equipe, valores]) =>
      [equipe, ...allAssuntos.map(a => { const v = valores.get(a.trim()); return v != null ? horasStr(v) : '-'; }), horasStr([...valores.values()].reduce((s, v) => s + v, 0))]
    );
    const totalRow = ['TOTAL', ...allAssuntos.map(a => {
      const t = [...eqMap.values()].reduce((s, sub) => s + (sub.get(a) || 0), 0);
      return t > 0 ? horasStr(t) : '-';
    }), horasStr([...eqMap.values()].reduce((s, sub) => s + [...sub.values()].reduce((s2, v) => s2 + v, 0), 0))];
    linhas.push(totalRow);
    imprimirHTML('Relatório PTR-BA - Horas por Equipe e Assunto', colunas, linhas);
  }

  function handlePrintPerson() {
    const allAssuntos = filtroAssunto ? [filtroAssunto] : assuntosDisponiveis;
    const pesMap = new Map<string, { funcao: string; equipe: string; valores: Map<string, number> }>();
    const funcaoCount = new Map<string, Map<string, number>>();
    for (const e of expanded) {
      const as = (e.ptrb.assuntoMinistrado || '(sem assunto)').trim();
      if (filtroAssunto && as !== filtroAssunto) continue;
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
    const pesEntries = [...pesMap.entries()].map(([nome, item]) => {
      const funcao = [...(funcaoCount.get(nome)?.entries() || [])].sort((a, b) => b[1] - a[1])[0]?.[0] || item.funcao;
      const homeEquipe = getEquipe(nome) || item.equipe;
      const valores = allAssuntos.map(a => { const v = item.valores.get(a.trim()); return v != null ? horasStr(v) : '-'; });
      const total = [...item.valores.values()].reduce((s, v) => s + v, 0);
      return { nome, funcao, equipe: homeEquipe, valores, totalHoras: horasStr(total), registros: [...item.valores.values()].reduce((s, v) => s + (v > 0 ? 1 : 0), 0) };
    });
    pesEntries.sort((a, b) => {
      if (a.equipe !== b.equipe) return EQUIPE_ORDER.indexOf(a.equipe) - EQUIPE_ORDER.indexOf(b.equipe);
      const hA = HIERARQUIA.indexOf(a.funcao);
      const hB = HIERARQUIA.indexOf(b.funcao);
      if (hA !== hB) return hA - hB;
      return a.nome.localeCompare(b.nome);
    });
    const grupos = new Map<string, typeof pesEntries>();
    for (const p of pesEntries) {
      if (!grupos.has(p.equipe)) grupos.set(p.equipe, []);
      grupos.get(p.equipe)!.push(p);
    }
    const equipesArr = EQUIPE_ORDER.filter(eq => grupos.has(eq)).map(eq => ({
      equipe: eq,
      pessoas: grupos.get(eq)!.map((p, i) => ({ num: i + 1, funcao: p.funcao, nome: getNomeGuerra(p.nome), valores: p.valores, totalHoras: p.totalHoras, registros: p.registros })),
    }));
    imprimirHTMLEfetivo(`Relatório PTR-BA${filtrosAtivos}${filtroEquipeLabel}${filtroAssuntoLabel}`, allAssuntos, equipesArr);
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

  function handlePrintEfetivo() {
    const assuntoLabel = filtroAssunto || 'Todos';

    const dados: Record<string, Record<string, number>> = {};
    const registros: Record<string, number> = {};
    for (const e of expanded) {
      const assunto = (e.ptrb.assuntoMinistrado || '').trim();
      if (!assunto || (filtroAssunto && assunto !== filtroAssunto)) continue;
      (dados[e.nome] ??= {})[assunto] = (dados[e.nome][assunto] || 0) + e.horas;
      registros[e.nome] = (registros[e.nome] || 0) + 1;
    }

    const allAssuntos = filtroAssunto ? [filtroAssunto] : assuntosDisponiveis;

    function lookupAssunto(assuntos: Record<string, number>, chave: string): number | undefined {
      const v = assuntos[chave];
      if (v !== undefined) return v;
      const t = chave.trim();
      if (t !== chave) return assuntos[t];
      const num = chave.match(/^(\d+)\.\s*/)?.[1];
      if (num) {
        for (const k of Object.keys(assuntos)) {
          if (k.startsWith(num + '.') || k.startsWith(num.padStart(2, '0') + '.')) return assuntos[k];
        }
      }
      return undefined;
    }

    const pessoasMap = new Map<string, { funcao: string; equipe: string }>();
    const eqFilter = filtroEquipe || '';
    for (const [nome, info] of bombeiros) {
      if (eqFilter && info.equipe !== eqFilter) continue;
      if (filtroPessoa && nome !== filtroPessoa) continue;
      pessoasMap.set(nome, { funcao: info.cargo, equipe: info.equipe });
    }
    for (const nome of Object.keys(dados)) {
      if (!pessoasMap.has(nome)) {
        pessoasMap.set(nome, { funcao: '', equipe: '' });
      }
    }

    const pessoas = [...pessoasMap.entries()].map(([nome, info]) => {
      let assuntos = dados[nome];
      if (!assuntos) {
        const lower = nome.toLowerCase().trim();
        for (const key of Object.keys(dados)) {
          if (key.toLowerCase().trim() === lower) { assuntos = dados[key]; break; }
        }
      }
      assuntos = assuntos || {};
      const valores = allAssuntos.map(a => {
        const v = lookupAssunto(assuntos!, a);
        return v != null ? horasStr(v) : '-';
      });
      const total = Object.values(assuntos).reduce((s, v) => s + (v > 0 ? v : 0), 0);
      return {
        nome,
        funcao: info.funcao,
        equipe: info.equipe,
        valores,
        totalHoras: horasStr(total),
        registros: registros[nome] || 0,
      };
    });

    pessoas.sort((a, b) => {
      const eqA = EQUIPE_ORDER.indexOf(a.equipe);
      const eqB = EQUIPE_ORDER.indexOf(b.equipe);
      if (eqA !== eqB) return eqA - eqB;
      const hA = HIERARQUIA.indexOf(a.funcao);
      const hB = HIERARQUIA.indexOf(b.funcao);
      if (hA !== hB) return hA - hB;
      return a.nome.localeCompare(b.nome);
    });

    const grupos = new Map<string, typeof pessoas>();
    for (const p of pessoas) {
      if (!grupos.has(p.equipe)) grupos.set(p.equipe, []);
      grupos.get(p.equipe)!.push(p);
    }

    const equipesArr = EQUIPE_ORDER
      .filter(eq => grupos.has(eq))
      .map(eq => ({
        equipe: eq,
        pessoas: grupos.get(eq)!.map((p, i) => ({
          num: i + 1,
          funcao: p.funcao,
          nome: getNomeGuerra(p.nome),
          valores: p.valores,
          totalHoras: p.totalHoras,
          registros: p.registros,
        })),
      }));

    imprimirHTMLEfetivo(
      `Relatório PTR-BA - Efetivo (${assuntoLabel})${filtrosAtivos}${filtroEquipeLabel}`,
      allAssuntos,
      equipesArr,
    );
  }

  const filtroPeriodoLabel = filterMode === 'mes-ano'
    ? `${filtroMes ? MESES[Number(filtroMes)] : ''} ${filtroAno || ''}`.trim() || 'Todo período'
    : `${dataInicio || '...'} a ${dataFinal || '...'}`;
  const filtrosAtivos = (filterMode === 'mes-ano' && (filtroMes || filtroAno)) || (filterMode === 'periodo' && (dataInicio || dataFinal))
    ? ` · ${filtroPeriodoLabel}`
    : '';
  const filtroEquipeLabel = filtroEquipe ? ` · Equipe ${filtroEquipe}` : '';
  const filtroAssuntoLabel = filtroAssunto ? ` · ${filtroAssunto}` : '';

  function FilterBar() {
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex overflow-hidden rounded-xl border border-graphite-300/60 bg-white/70 text-xs font-medium dark:border-border-dark dark:bg-surface-card">
          <button onClick={() => setFilterMode('mes-ano')}
            className={`px-3 py-2 transition-colors ${filterMode === 'mes-ano' ? 'bg-aviation-600 text-white' : 'text-graphite-600 hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover'}`}>
            Mês/Ano
          </button>
          <button onClick={() => setFilterMode('periodo')}
            className={`px-3 py-2 transition-colors ${filterMode === 'periodo' ? 'bg-aviation-600 text-white' : 'text-graphite-600 hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover'}`}>
            Período
          </button>
        </div>

        {filterMode === 'mes-ano' ? (
          <>
            <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className={inputClass}>
              <option value="">Todos</option>
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

        <div className="flex overflow-hidden rounded-xl border border-graphite-300/60 bg-white/70 text-xs font-medium dark:border-border-dark dark:bg-surface-card">
          <button onClick={() => { setViewMode('equipe'); setView('summary'); setFiltroPessoa(''); }}
            className={`px-3 py-2 transition-colors ${viewMode === 'equipe' ? 'bg-aviation-600 text-white' : 'text-graphite-600 hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover'}`}>
            Equipe
          </button>
          <button onClick={() => { setViewMode('membros'); setView('summary'); }}
            className={`px-3 py-2 transition-colors ${viewMode === 'membros' ? 'bg-aviation-600 text-white' : 'text-graphite-600 hover:bg-graphite-100 dark:text-graphite-300 dark:hover:bg-surface-hover'}`}>
            Membros
          </button>
        </div>

        <select value={filtroEquipe} onChange={e => setFiltroEquipe(e.target.value)} className={inputClass}>
          <option value="">Todas as equipes</option>
          {equipesPresentes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
        </select>
        <select value={filtroAssunto} onChange={e => setFiltroAssunto(e.target.value)} className={inputClass}>
          <option value="">Todos os assuntos</option>
          {assuntosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {viewMode === 'membros' && (
          <select value={filtroPessoa} onChange={e => setFiltroPessoa(e.target.value)} className={inputClass}>
            <option value="">Todas as pessoas</option>
            {pessoasFiltro.map(n => <option key={n} value={n}>{getNomeGuerra(n)}</option>)}
          </select>
        )}
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
    const isEquipe = viewMode === 'equipe';
    return (
      <PageContainer>
        <PageTitle icon={FileText} title={`PTR-BA${filtrosAtivos}${filtroEquipeLabel}`}
          subtitle={isEquipe ? 'Horas por equipe e assunto' : 'Horas por pessoa e assunto'} />
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
            <p className="text-xl font-black text-aviation-700 dark:text-aviation-300">
              {isEquipe ? statsFiltered.pessoas : statsFiltered.pessoas}
              <span className="text-xl font-black text-aviation-500">/{statsFiltered.totalBombeiros}</span>
            </p>
            <p className="text-[10px] font-medium text-aviation-500">{isEquipe ? 'Equipes' : 'Pessoas com/total'}</p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center dark:border-amber-800 dark:bg-amber-900/20">
            <p className="text-xl font-black text-amber-700 dark:text-amber-300">{equipesPresentes.length}</p>
            <p className="text-[10px] font-medium text-amber-500">Equipes</p>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-graphite-700 dark:text-graphite-300">
            {isEquipe ? 'Clique em uma equipe para ver detalhamento por pessoa' : 'Clique em uma pessoa para ver os registros'}
          </p>
          <div className="flex gap-2">
            {(isEquipe ? sortedEqRows.length > 0 : sortedPessoaRows.length > 0) && (
              <button onClick={isEquipe ? handlePrintSummary : handlePrintPerson}
                className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-aviation-600 to-aviation-700 px-3 py-2 text-sm font-medium text-white shadow-lg shadow-aviation-500/20 transition-all duration-200 hover:shadow-xl hover:shadow-aviation-500/30 active:scale-[0.98]">
                <Printer className="h-4 w-4" /> Imprimir
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-graphite-200/60 bg-white/80 shadow-sm dark:border-border-dark dark:bg-surface-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-graphite-200 dark:border-border-dark">
                {isEquipe ? (
                  <><SortHeader column="label">Equipe</SortHeader><SortHeader column="assunto">Assunto</SortHeader><SortHeader column="horas">Horas</SortHeader><SortHeader column="qtd">Registros</SortHeader></>
                ) : (
                  <><SortHeader column="label">Militar</SortHeader><SortHeader column="assunto">Assunto</SortHeader><SortHeader column="horas">Horas</SortHeader><SortHeader column="qtd">Registros</SortHeader><th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-graphite-500">Ações</th></>
                )}
              </tr>
            </thead>
            <tbody>
              {isEquipe ? (
                sortedEqRows.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-graphite-400">Nenhum PTR-BA encontrado com os filtros atuais.</td></tr>
                ) : (
                  sortedEqRows.map((r, i) => (
                    <tr key={`${r.equipe}-${r.assunto}-${i}`}
                      className="border-b border-graphite-100 transition-colors hover:bg-aviation-50/50 dark:border-border-dark dark:hover:bg-aviation-900/10 cursor-pointer"
                      onClick={() => goToPerson(r.equipe)}>
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
                )
              ) : (
                sortedPessoaRows.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-graphite-400">Nenhum PTR-BA encontrado com os filtros atuais.</td></tr>
                ) : (
                  sortedPessoaRows.map((r, i) => (
                    <tr key={`${r.pessoa}-${r.assunto}-${i}`}
                      className="border-b border-graphite-100 transition-colors hover:bg-aviation-50/50 dark:border-border-dark dark:hover:bg-aviation-900/10">
                      <td className="px-4 py-3 font-medium text-graphite-900 dark:text-graphite-100">
                        {r.funcao && <span className="rounded bg-aviation-100 px-1.5 py-0.5 text-xs font-semibold text-aviation-700 dark:bg-aviation-900/30 dark:text-aviation-300 mr-1.5">{r.funcao}</span>}
                        {getNomeGuerra(r.pessoa)}
                        <span className="ml-2 rounded bg-graphite-100 px-1.5 py-0.5 text-[10px] font-medium text-graphite-500 dark:bg-surface-hover dark:text-graphite-400">{r.equipe}</span>
                      </td>
                      <td className="px-4 py-3 text-graphite-700 dark:text-graphite-300">{r.assunto}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-700 dark:text-emerald-400">{horasStr(r.horas)}</td>
                      <td className="px-4 py-3 text-graphite-600 dark:text-graphite-400">{r.qtd}x</td>
                      <td className="px-4 py-3">
                        <button onClick={() => goToDetail(r.pessoa)}
                          className="inline-flex items-center gap-1 rounded-lg bg-aviation-100 px-2 py-1 text-xs font-medium text-aviation-700 transition-colors hover:bg-aviation-200 dark:bg-aviation-900/30 dark:text-aviation-300 dark:hover:bg-aviation-900/50">
                          <Eye className="h-3 w-3" /> Ver PTR-BAs
                        </button>
                      </td>
                    </tr>
                  ))
                )
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
                      <span className="ml-2 rounded bg-graphite-100 px-1.5 py-0.5 text-[10px] font-medium text-graphite-500 dark:bg-surface-hover dark:text-graphite-400">{r.equipe}</span>
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
